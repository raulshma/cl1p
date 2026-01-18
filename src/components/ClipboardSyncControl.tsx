/**
 * ClipboardSyncControl Component
 *
 * Provides UI controls for clipboard synchronization functionality.
 * Displays sync status, allows enabling/disabling sync, and shows recent clipboard items.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useClipboardSync } from '@/hooks/useClipboardSync';
import { useClipboardStore, usePeerStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  SignalIcon, 
  BoltIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

interface ClipboardSyncControlProps {
  className?: string;
}

export function ClipboardSyncControl({ className = '' }: ClipboardSyncControlProps) {
  const {
    items,
    currentClipboard,
    syncEnabled,
    setSyncEnabled,
  } = useClipboardStore();

  const { peers } = usePeerStore();

  const {
    isMonitoring,
    broadcastClipboard,
    requestPermission,
    writeToClipboard,
  } = useClipboardSync({
    requirePermission: true,
    syncInterval: 1000,
  });

  const [testContent, setTestContent] = useState('');
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [hasRequestedThisSession, setHasRequestedThisSession] = useState(false);

  // Check permission state on mount
  useEffect(() => {
    const checkPermission = async () => {
      // Check if user already dismissed the prompt this session
      const sessionDismissed = sessionStorage.getItem('clipboard-permission-dismissed');
      if (sessionDismissed === 'true') {
        setHasRequestedThisSession(true);
      }

      // Check actual browser permission state
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
          setPermissionState(permission.state);
          
          // Listen for permission changes
          permission.addEventListener('change', () => {
            setPermissionState(permission.state);
          });
        }
      } catch {
        // Permissions API not available, assume we need to request
        setPermissionState('prompt');
      }
    };
    
    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setHasRequestedThisSession(true);
    sessionStorage.setItem('clipboard-permission-dismissed', 'true');
    
    if (granted) {
      setPermissionState('granted');
      console.log('Clipboard permission granted!');
    } else {
      setPermissionState('denied');
    }
  };

  // Only show permission banner if permission is not granted AND user hasn't dismissed it this session
  const shouldShowPermissionBanner = permissionState !== 'granted' && !hasRequestedThisSession;

  const handleWriteToClipboard = async () => {
    if (!testContent.trim()) return;
    const success = await writeToClipboard(testContent);
    if (success) setTestContent('');
  };

  const handleBroadcast = async () => {
    if (!currentClipboard) return;
    await broadcastClipboard(currentClipboard);
  };

  const connectedPeerCount = peers.size;

  return (
    <Card className={cn("overflow-hidden border-0 bg-transparent shadow-none", className)}>
      <CardContent className="space-y-6 px-0 pt-0">
        {/* Permission Status */}
        {shouldShowPermissionBanner && (
          <div className="glass-panel p-4 rounded-2xl border-l-4 border-l-yellow-500 bg-yellow-500/5">
            <div className="flex gap-4">
              <BoltIcon className="h-6 w-6 text-yellow-500 shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">Permission Required</h4>
                <p className="text-sm text-muted-foreground">Grant access to sync your clipboard automatically.</p>
                <Button 
                  onClick={handleRequestPermission}
                  size="sm"
                  className="bg-yellow-500 text-white hover:bg-yellow-600 border-0"
                >
                  Allow Access
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Toggle */}
        <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium text-lg">Auto-Sync</span>
            <span className="text-sm text-muted-foreground">Automatically share copied text</span>
          </div>
          <button
            onClick={() => setSyncEnabled(!syncEnabled)}
            className={cn(
              "relative h-8 w-14 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              syncEnabled ? "bg-primary" : "bg-muted"
            )}
            role="switch"
            aria-checked={syncEnabled}
          >
            <span className={cn("absolute top-1 left-1 bg-background h-6 w-6 rounded-full shadow-md transition-transform duration-300", syncEnabled ? "translate-x-6" : "translate-x-0")} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Peers</span>
            <span className="text-2xl font-bold flex items-center gap-2">
              <SignalIcon className="h-5 w-5 text-blue-500" />
              {connectedPeerCount}
            </span>
          </div>
          <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</span>
            <span className="text-2xl font-bold">{items.length}</span>
          </div>
        </div>

        {/* Manual Actions */}
        <div className="space-y-4">
          <div className="flex gap-3">
             <Input 
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder="Type to copy..."
                className="bg-muted/50 border-0"
             />
             <Button onClick={handleWriteToClipboard} variant="secondary">Copy</Button>
          </div>
          
          <Button 
            onClick={handleBroadcast} 
            disabled={!currentClipboard} 
            className="w-full" 
            variant="premium"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            Broadcast Now
          </Button>
        </div>

        {/* Recent History Preview */}
        {items.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold text-muted-foreground ml-1">Recent Activity</h4>
            <div className="space-y-2">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="glass-panel p-3 rounded-xl text-sm flex items-center justify-between group hover:bg-accent transition-colors">
                  <span className="truncate max-w-[70%] opacity-80 group-hover:opacity-100">{item.content}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ClipboardSyncControl;
