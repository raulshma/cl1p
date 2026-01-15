/**
 * usePeerReconnection Hook
 *
 * Integrates PeerConnectionManager reconnection events with UI notifications.
 * Provides automatic user feedback when peers disconnect and reconnect.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/store';
import type { PeerConnectionManager } from '@/lib/webrtc/PeerConnectionManager';

interface ReconnectionState {
  [peerId: string]: {
    isReconnecting: boolean;
    attempts: number;
    lastError?: string;
  };
}

export function usePeerReconnection(peerManager: PeerConnectionManager | null) {
  const { addToast } = useUIStore();
  const reconnectionState = useRef<ReconnectionState>({});

  useEffect(() => {
    if (!peerManager) return;

    // Handle reconnection started
    const handleReconnecting = (data: { peerId: string; error: string }, peerId: string) => {
      reconnectionState.current[peerId] = {
        isReconnecting: true,
        attempts: (reconnectionState.current[peerId]?.attempts || 0) + 1,
        lastError: data.error,
      };

      addToast({
        type: 'warning',
        title: 'Peer Disconnected',
        message: `Peer ${peerId} disconnected. Attempting to reconnect...`,
        duration: 3000,
      });
    };

    // Handle reconnection success
    const handleReconnectSuccess = (data: { peerId: string; attempts: number }, peerId: string) => {
      const state = reconnectionState.current[peerId];
      reconnectionState.current[peerId] = {
        isReconnecting: false,
        attempts: 0,
      };

      addToast({
        type: 'success',
        title: 'Peer Reconnected',
        message: `Peer ${peerId} reconnected successfully${(state?.attempts ?? 0) > 1 ? ` after ${state?.attempts ?? 1} attempts` : ""}.`,
        duration: 4000,
      });
    };

    // Handle reconnection failed
    const handleReconnectFailed = (data: { peerId: string; attempts: number; reason: string }, peerId: string) => {
      reconnectionState.current[peerId] = {
        isReconnecting: false,
        attempts: 0,
      };

      addToast({
        type: 'error',
        title: 'Reconnection Failed',
        message: `Failed to reconnect to peer ${peerId} after ${data.attempts} attempts: ${data.reason}`,
        duration: 6000,
        actions: [
          {
            label: 'Retry',
            onClick: () => {
              // Trigger manual retry by creating a new peer connection
              addToast({
                type: 'info',
                title: 'Manual Retry',
                message: 'Please manually reconnect to the peer.',
                duration: 3000,
              });
            },
            primary: true,
          },
        ],
      });
    };

    // Register event listeners
    peerManager.on('reconnecting', handleReconnecting as any);
    peerManager.on('reconnectSuccess', handleReconnectSuccess as any);
    peerManager.on('reconnectFailed', handleReconnectFailed as any);

    // Cleanup
    return () => {
      peerManager.off('reconnecting', handleReconnecting as any);
      peerManager.off('reconnectSuccess', handleReconnectSuccess as any);
      peerManager.off('reconnectFailed', handleReconnectFailed as any);
    };
  }, [peerManager, addToast]);

  // Get current reconnection state for a peer
  const getPeerReconnectionState = useCallback(
    (peerId: string) => {
      return reconnectionState.current[peerId] || {
        isReconnecting: false,
        attempts: 0,
      };
    },
    []
  );

  return {
    getPeerReconnectionState,
  };
}
