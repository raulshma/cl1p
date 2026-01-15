'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import type { Peer } from '@/types';
import { UserCircleIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';

interface PeerListProps {
  peers: Map<string, Peer>;
  localPeerId?: string | null;
  className?: string;
  showHeader?: boolean;
  gridClassName?: string;
}

const PeerListItem: React.FC<{ peer: Peer; isLocal?: boolean }> = ({ peer, isLocal = false }) => {
  const nickname = peer.metadata?.nickname || `Peer ${peer.id.slice(-4)}`;
  const browser = peer.metadata?.browser || 'Unknown';
  const platform = peer.metadata?.platform || '';

  return (
    <div 
      className={cn(
        "glass-panel rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group",
        isLocal ? "ring-2 ring-primary/20" : ""
      )}
    >
        {/* Status Tab */}
        <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5",
            peer.connectionState === 'connected' ? "bg-green-500" :
            peer.connectionState === 'connecting' ? "bg-yellow-500" :
            "bg-red-500"
        )} />

        <div className="flex items-center gap-4 pl-3">
             <div className={cn(
                 "h-12 w-12 rounded-full flex items-center justify-center text-white shadow-md shrink-0",
                 isLocal ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-purple-500 to-pink-600"
             )}>
                 <span className="font-bold text-lg">{nickname.charAt(0).toUpperCase()}</span>
             </div>
             <div className="min-w-0">
                 <h4 className="font-semibold text-foreground flex items-center gap-2 truncate">
                     {nickname}
                     {isLocal && <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">You</span>}
                 </h4>
                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                     <ComputerDesktopIcon className="h-3 w-3 shrink-0" />
                     <span className="truncate">{browser}</span>
                     {platform && (
                         <>
                           <span>•</span>
                           <span className="truncate">{platform}</span>
                         </>
                     )}
                 </div>
             </div>
        </div>
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ConnectionStatusIndicator state={peer.connectionState} size="sm" showLabel={false} />
        </div>
    </div>
  );
};

export const PeerList: React.FC<PeerListProps> = ({
  peers,
  localPeerId,
  className,
  showHeader = true,
  gridClassName,
}) => {
  const peerArray = Array.from(peers.values());
  // Filter out local peer from the count and display
  const remotePeers = peerArray.filter(p => p.id !== localPeerId);
  const connectedCount = remotePeers.filter(p => p.connectionState === 'connected').length;

  return (
    <div className={cn('space-y-6', className)}>
      {showHeader && (
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Active Peers</h2>
            <p className="text-sm text-muted-foreground">{connectedCount} connected in this room</p>
          </div>
          <div className="flex gap-1">
              {/* Visual Indicators only */}
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-blue-500 opacity-50" />
              <div className="h-2 w-2 rounded-full bg-purple-500 opacity-50" />
          </div>
        </div>
      )}

      <div className={cn("grid gap-4", gridClassName || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {remotePeers.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-border bg-muted/20">
            <UserCircleIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No peers connected</h3>
            <p className="text-muted-foreground">Waiting for others to join...</p>
          </div>
        ) : (
          remotePeers.map((peer) => (
            <PeerListItem
              key={peer.id}
              peer={peer}
              isLocal={false}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PeerList;
