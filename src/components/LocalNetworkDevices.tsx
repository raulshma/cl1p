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
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupAction,
  SidebarSeparator,
} from '@/components/ui/sidebar';

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
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Identity</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-1 p-1">
             <div className="flex items-center justify-between group/item rounded-md p-2 hover:bg-sidebar-accent/50 transition-colors">
               <div className="flex items-center gap-2 min-w-0">
                 <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                 <span className="text-sm font-medium truncate" title={localDeviceName}>
                   {localDeviceName || 'Loading...'}
                 </span>
               </div>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity" 
                 onClick={handleRegenerateName} 
                 title="Regenerate Name"
               >
                 <ArrowPathIcon className="h-3 w-3" />
               </Button>
             </div>
             <div className="flex items-center justify-between group/item rounded-md p-2 hover:bg-sidebar-accent/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                 <FingerPrintIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                 <span className="text-xs text-muted-foreground truncate font-mono" title={localDeviceId}>
                   {localDeviceId ? `${localDeviceId.slice(0, 12)}...` : 'Loading...'}
                 </span>
               </div>
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity" 
                 onClick={handleRegenerateId} 
                 title="Regenerate ID"
               >
                 <ArrowPathIcon className="h-3 w-3" />
               </Button>
             </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarSeparator className="mx-2" />

      <SidebarGroup>
        <SidebarGroupLabel>Invite to room</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-2 pt-1 px-1 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted-foreground">
              Send a join request to a nearby device
            </p>
            <div className="flex gap-2">
              <Input
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                placeholder="Room ID"
                className="h-8 text-sm"
              />
              <Button size="sm" variant="ghost" onClick={handleGenerateRoomId} className="h-8 px-2">
                Auto
              </Button>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-2" />

      {incomingRequests.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary animate-pulse">
            Incoming Requests
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {incomingRequests.map((request) => (
                <SidebarMenuItem key={request.id}>
                  <div className="flex flex-col gap-2 rounded-md border p-2 text-sm bg-sidebar-accent/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{request.senderName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(request.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Room: {request.roomId}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Button 
                        size="sm" 
                        className="h-7 text-xs grow bg-primary/90 hover:bg-primary"
                        onClick={() => handleJoinRequest(request)}
                      >
                        Join
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs grow"
                        onClick={() => handleDismissRequest(request.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupLabel>Nearby Devices</SidebarGroupLabel>
        <SidebarGroupAction onClick={scanDevices} title="Refresh Devices">
          <ArrowPathIcon className={isScanning ? 'animate-spin' : ''} />
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {scanError && (
              <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md m-1">
                {scanError}
              </div>
            )}
            {!isScanning && !scanError && devices.length === 0 && (
              <div className="p-4 text-center">
                 <p className="text-xs text-muted-foreground">No devices found.</p>
                 <Button variant="link" size="sm" onClick={scanDevices} className="h-auto p-0 text-xs">
                   Scan again
                 </Button>
              </div>
            )}
            
            {devices.map((device) => {
              const Icon = getDeviceIcon(device.device.deviceType);
              return (
                <SidebarMenuItem key={`${device.ip}-${device.device.deviceId}`}>
                  <SidebarMenuButton
                    onClick={() => handleSendRequest(device)}
                    className="h-auto py-3 px-2"
                    tooltip={`IP: ${device.ip}`}
                  >
                    <Icon className="h-8 w-8 text-sidebar-foreground/60 shrink-0" />
                    <div className="flex flex-col gap-0.5 text-left flex-1 min-w-0 ml-2 group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium truncate leading-none">
                        {device.device.deviceName}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate font-mono">
                         <span className={device.device.platform === 'unknown' ? 'italic' : ''}>
                           {device.device.platform === 'unknown' ? 'Device' : device.device.platform}
                         </span>
                         <span>•</span>
                         <span>{device.ip}</span>
                      </div>
                    </div>
                    <PaperAirplaneIcon className="ml-auto h-4 w-4 text-sidebar-foreground/30 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
