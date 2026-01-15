'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserGroupIcon, WifiIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import type { PeerInfo } from '@/lib/signaling/room-storage';

export interface PeerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peers: PeerInfo[];
  onSelectPeers: (selectedPeerIds: string[]) => void;
  isLoading?: boolean;
  roomId: string;
  currentPeerId: string;
}

/**
 * Dialog to allow users to select which peers to connect to in a mesh network.
 * Shows when multiple peers are available in a room.
 */
export function PeerSelectionDialog({
  open,
  onOpenChange,
  peers,
  onSelectPeers,
  isLoading = false,
  roomId,
  currentPeerId,
}: PeerSelectionDialogProps) {
  const [selectedPeers, setSelectedPeers] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      // By default, select all available peers for mesh
      setSelectedPeers(new Set(peers.map(p => p.peerId)));
    }
  }, [open, peers]);

  const handleTogglePeer = (peerId: string) => {
    setSelectedPeers(prev => {
      const next = new Set(prev);
      if (next.has(peerId)) {
        next.delete(peerId);
      } else {
        next.add(peerId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPeers(new Set(peers.map(p => p.peerId)));
  };

  const handleDeselectAll = () => {
    setSelectedPeers(new Set());
  };

  const handleConnect = () => {
    if (selectedPeers.size === 0) return;
    setConnecting(true);
    onSelectPeers(Array.from(selectedPeers));
  };

  const formatJoinedTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-primary" />
            Connect to Peers
          </DialogTitle>
          <DialogDescription>
            Select which peers you want to connect to in this room. In mesh mode, you can
            communicate directly with each selected peer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Room Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Room: <code className="text-foreground">{roomId}</code></span>
            <span className="flex items-center gap-1">
              <WifiIcon className="h-4 w-4" />
              {peers.length} peer{peers.length !== 1 ? 's' : ''} available
            </span>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedPeers.size} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedPeers.size === peers.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedPeers.size === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Peer List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {peers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <WifiIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No peers available yet.</p>
                <p className="text-sm mt-1">Waiting for others to join...</p>
              </div>
            ) : (
              peers.map((peer) => {
                const isSelected = selectedPeers.has(peer.peerId);
                const isHost = peer.isHost;
                
                return (
                  <button
                    key={peer.peerId}
                    onClick={() => handleTogglePeer(peer.peerId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {/* Selection Indicator */}
                    <div
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && <CheckCircleIcon className="h-4 w-4" />}
                    </div>

                    {/* Peer Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{peer.nickname}</span>
                        {isHost && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            👑 Host
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Joined {formatJoinedTime(peer.joinedAt)}
                        {peer.connectedTo.length > 0 && (
                          <span className="ml-2">
                            • Connected to {peer.connectedTo.length} peer{peer.connectedTo.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connection Status */}
                    <div className="shrink-0">
                      {peer.connectedTo.includes(currentPeerId) ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                          Connected
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          Available
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={connecting || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={selectedPeers.size === 0 || connecting || isLoading}
            className="gap-2"
          >
            {connecting || isLoading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Connecting...
              </>
            ) : (
              <>
                <WifiIcon className="h-4 w-4" />
                Connect to {selectedPeers.size} Peer{selectedPeers.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PeerSelectionDialog;
