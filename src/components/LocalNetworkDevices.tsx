'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateRoomId, validateRoomId } from '@/lib/utils/room-id-generator';
import { getOrCreateDeviceFingerprint, regenerateDeviceFingerprint } from '@/lib/utils/peer-fingerprint';
import { getDeviceInfoFromNavigator, regenerateDeviceName } from '@/lib/utils/device-info';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  FingerPrintIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface DiscoveredDevice {
  ip: string;
  port: string;
  device: {
    deviceId: string;
    deviceName: string;
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    platform: string;
    userAgent: string;
    lastSeen: number;
  };
}

interface RoomJoinRequest {
  id: string;
  roomId: string;
  roomUrl?: string;
  senderDeviceId: string;
  senderName: string;
  senderDeviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  senderPlatform: string;
  senderIp?: string;
  createdAt: number;
}

const getDeviceIcon = (deviceType: DiscoveredDevice['device']['deviceType']) => {
  switch (deviceType) {
    case 'mobile':
      return DevicePhoneMobileIcon;
    case 'tablet':
      return DeviceTabletIcon;
    case 'desktop':
      return ComputerDesktopIcon;
    default:
      return QuestionMarkCircleIcon;
  }
};

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

export function LocalNetworkDevices() {
  const router = useRouter();
  const [devices, setDevices] = React.useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [roomId, setRoomId] = React.useState('');
  const [incomingRequests, setIncomingRequests] = React.useState<RoomJoinRequest[]>([]);
  const [localDeviceId, setLocalDeviceId] = React.useState('');
  const [localDeviceName, setLocalDeviceName] = React.useState('');
  const [localDeviceType, setLocalDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop' | 'unknown'>('unknown');
  const [localPlatform, setLocalPlatform] = React.useState('unknown');
  const [localUserAgent, setLocalUserAgent] = React.useState('');
  const [localBaseUrl, setLocalBaseUrl] = React.useState('');

  const refreshIncomingRequests = React.useCallback(async () => {
    try {
      const response = await fetch('/api/network/room-request');
      if (!response.ok) return;
      const data = (await response.json()) as { requests?: RoomJoinRequest[] };
      setIncomingRequests(data.requests ?? []);
    } catch {
      // Ignore polling errors
    }
  }, []);

  const scanDevices = React.useCallback(async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/network/discover');
      if (!response.ok) {
        throw new Error('Discovery failed');
      }
      const data = (await response.json()) as { devices?: DiscoveredDevice[] };
      const filtered = (data.devices ?? []).filter((device) => device.device.deviceId !== localDeviceId);
      setDevices(filtered);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Discovery error');
    } finally {
      setIsScanning(false);
    }
  }, [localDeviceId]);

  // Initial setup only
  React.useEffect(() => {
    const info = getDeviceInfoFromNavigator();
    const deviceId = getOrCreateDeviceFingerprint();

    setLocalDeviceId(deviceId);
    setLocalDeviceName(info.deviceName);
    setLocalDeviceType(info.deviceType);
    setLocalPlatform(info.platform);
    setLocalUserAgent(info.userAgent);
  }, []);

  // Presence logic handling updates to identity
  React.useEffect(() => {
    if (!localDeviceId || !localDeviceName) return;

    const sendPresence = () => {
      fetch('/api/network/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: localDeviceId,
          deviceName: localDeviceName,
          deviceType: localDeviceType,
          platform: localPlatform,
          userAgent: localUserAgent,
        }),
      }).catch(() => {
        // Best-effort presence update
      });
    };

    sendPresence();
    const interval = setInterval(sendPresence, 30000);
    return () => clearInterval(interval);
  }, [localDeviceId, localDeviceName, localDeviceType, localPlatform, localUserAgent]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const { protocol, hostname, port } = window.location;
    const portPart = port ? `:${port}` : '';

    const setBaseUrl = (host: string) => {
      setLocalBaseUrl(`${protocol}//${host}${portPart}`);
    };

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      fetch('/api/network/local-ip')
        .then((response) => response.json() as Promise<{ ips?: string[] }>)
        .then((data) => {
          const ip = data?.ips?.[0];
          if (ip) setBaseUrl(ip);
        })
        .catch(() => {
          setBaseUrl(hostname);
        });
    } else {
      setBaseUrl(hostname);
    }
  }, []);

  React.useEffect(() => {
    if (!localDeviceId) return;
    scanDevices();
  }, [scanDevices, localDeviceId]);

  React.useEffect(() => {
    refreshIncomingRequests();
    const interval = setInterval(refreshIncomingRequests, 5000);
    return () => clearInterval(interval);
  }, [refreshIncomingRequests]);

  const handleGenerateRoomId = () => {
    const generated = generateRoomId({ type: 'slug' });
    setRoomId(generated);
  };

  const handleRegenerateName = () => {
    const newName = regenerateDeviceName();
    setLocalDeviceName(newName);
    toast.success('Device name updated');
  };

  const handleRegenerateId = () => {
    const newId = regenerateDeviceFingerprint();
    setLocalDeviceId(newId);
    toast.success('Device ID updated');
  };

  const handleSendRequest = async (device: DiscoveredDevice) => {
    if (!roomId) {
      toast.error('Enter a room ID first');
      return;
    }

    const validation = validateRoomId(roomId);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid room ID');
      return;
    }

    const requestId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseUrl = localBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const roomUrl = baseUrl ? `${baseUrl}/room/${encodeURIComponent(roomId)}?join=true` : undefined;
    const senderIp = baseUrl ? (() => {
      try {
        return new URL(baseUrl).hostname;
      } catch {
        return undefined;
      }
    })() : undefined;

    try {
      const response = await fetch('/api/network/send-room-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetIp: device.ip,
          targetPort: device.port,
          request: {
            id: requestId,
            roomId,
            roomUrl,
            senderDeviceId: localDeviceId,
            senderName: localDeviceName || 'Nearby device',
            senderDeviceType: localDeviceType,
            senderPlatform: localPlatform,
            senderIp,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      toast.success(`Request sent to ${device.device.deviceName}`);
    } catch {
      toast.error('Failed to send room request');
    }
  };

  const handleJoinRequest = (request: RoomJoinRequest) => {
    const url = request.roomUrl || `/room/${encodeURIComponent(request.roomId)}?join=true`;
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };

  const handleDismissRequest = async (id: string) => {
    try {
      await fetch(`/api/network/room-request?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      refreshIncomingRequests();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Identity Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pl-1">Your Identity</h4>
        <div className="bg-secondary/20 rounded-xl p-3 border border-border/50 space-y-2">
            <div className="flex items-center justify-between group">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4 text-primary" />
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="text-sm font-medium truncate leading-tight" title={localDeviceName}>
                     {localDeviceName || 'Loading...'}
                   </span>
                   <span className="text-[10px] text-muted-foreground/60">Visible to others</span>
                 </div>
               </div>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="h-7 w-7 opacity-50 group-hover:opacity-100 hover:bg-background/50" 
                 onClick={handleRegenerateName} 
                 title="Regenerate Name"
               >
                 <ArrowPathIcon className="h-3.5 w-3.5" />
               </Button>
             </div>
             
             <div className="h-px bg-border/30 w-full" />

             <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FingerPrintIcon className="h-4 w-4 text-primary" />
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="text-[10px] font-mono text-muted-foreground truncate leading-tight" title={localDeviceId}>
                     {localDeviceId ? `${localDeviceId.slice(0, 16)}...` : 'Loading...'}
                   </span>
                   <span className="text-[10px] text-muted-foreground/60">Device Fingerprint</span>
                 </div>
               </div>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="h-7 w-7 opacity-50 group-hover:opacity-100 hover:bg-background/50" 
                 onClick={handleRegenerateId} 
                 title="Regenerate ID"
               >
                 <ArrowPathIcon className="h-3.5 w-3.5" />
               </Button>
             </div>
        </div>
      </div>

      {/* Invite Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pl-1">Direct Invite</h4>
        <div className="flex gap-2">
           <Input
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                placeholder="Room Name to Share..."
                className="bg-secondary/20 border-border/50 h-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              />
              <Button size="sm" variant="outline" onClick={handleGenerateRoomId} className="h-10 px-3 border-border/50 bg-secondary/10 hover:bg-secondary/30">
                Auto
              </Button>
        </div>
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary animate-pulse pl-1">Incoming Requests</h4>
          <div className="space-y-2">
              {incomingRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <PaperAirplaneIcon className="h-12 w-12 -rotate-45" />
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <span className="font-bold text-sm tracking-tight">{request.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimeAgo(request.createdAt)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground relative z-10">
                      Inviting you to <span className="text-foreground font-mono bg-background/50 px-1 rounded">{request.roomId}</span>
                    </div>

                    <div className="flex gap-2 mt-1 relative z-10">
                      <Button 
                        size="sm" 
                        className="h-8 text-xs grow font-semibold"
                        onClick={() => handleJoinRequest(request)}
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-xs grow hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDismissRequest(request.id)}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
              ))}
          </div>
        </div>
      )}

      {/* Nearby Devices */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Nearby Devices</h4>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={scanDevices} 
                disabled={isScanning}
                className="h-6 px-2 text-[10px] hover:bg-transparent hover:text-primary transition-colors"
            >
                {isScanning ? <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" /> : <ArrowPathIcon className="h-3 w-3 mr-1" />}
                {isScanning ? 'Scanning...' : 'Refresh'}
            </Button>
        </div>

        <div className="min-h-[100px]">
            {scanError && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-xl mb-2 text-center">
                {scanError}
              </div>
            )}
            
            {!isScanning && !scanError && devices.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border/50 rounded-xl bg-secondary/5">
                 <div className="h-8 w-8 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                    <QuestionMarkCircleIcon className="h-4 w-4 text-muted-foreground/50" />
                 </div>
                 <p className="text-xs text-muted-foreground/70">No devices found on local network.</p>
                 <button onClick={scanDevices} className="mt-2 text-[10px] text-primary hover:underline">Try scanning again</button>
              </div>
            )}
            
            <div className="grid gap-2">
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device.deviceType);
              return (
                <button
                    key={`${device.ip}-${device.device.deviceId}`}
                    onClick={() => handleSendRequest(device)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 hover:border-primary/30 transition-all text-left group"
                >
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0 border border-border/50 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate leading-tight group-hover:text-primary transition-colors">
                        {device.device.deviceName}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                         <span>{device.ip}</span>
                         <span>•</span>
                         <span className={device.device.platform === 'unknown' ? 'italic' : ''}>
                           {device.device.platform === 'unknown' ? 'Unknown OS' : device.device.platform}
                         </span>
                      </div>
                    </div>
                    <PaperAirplaneIcon className="h-4 w-4 text-muted-foreground/30 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
              );
            })}
            </div>
        </div>
      </div>
    </div>
  );
}
