/**
 * React Hook for File Transfer Initiation
 *
 * Integrates FileTransferInitiator with React components and stores
 * to initiate file transfers to connected peers.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomStore, usePeerStore } from '@/store';
import {
  FileTransferInitiator,
  createFileTransferInitiator,
  type FileTransferInitiatorConfig,
  type FileTransferInitiatorEvents,
} from '@/lib/webrtc';
import type { FileMetadata, FileTransferRequest } from '@/lib/webrtc';

/**
 * Pending transfer request information
 */
export interface PendingTransferRequest {
  transferId: string;
  metadata: FileMetadata;
  senderPeerId: string;
  receivedAt: number;
}

/**
 * Hook configuration options
 */
export interface UseFileTransferInitiationConfig {
  enableAutoAccept?: boolean;
  maxConcurrentTransfers?: number;
  requestTimeout?: number;
  debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseFileTransferInitiationReturn {
  // initiate transfer to a specific peer
  initiateTransfer: (
    file: File,
    peerId: string,
    chunkCount?: number
  ) => Promise<string | null>;

  // initiate transfer to all connected peers
  initiateTransferToAll: (file: File, chunkCount?: number) => Promise<Map<string, string | null>>;

  // cancel a transfer
  cancelTransfer: (transferId: string) => boolean;

  // get all active transfers
  getActiveTransfers: () => Map<string, { status: string; targetPeerId: string }>;

  // pending incoming requests
  pendingRequests: PendingTransferRequest[];

  // accept a pending request
  acceptRequest: (transferId: string) => Promise<boolean>;

  // reject a pending request
  rejectRequest: (transferId: string, reason?: string) => Promise<boolean>;

  // is processing
  isProcessing: boolean;

  // error state
  error: string | null;

  // clear error
  clearError: () => void;
}

/**
 * Custom hook for file transfer initiation
 *
 * @param config - Hook configuration
 * @returns Hook API
 */
export function useFileTransferInitiation(
  config: UseFileTransferInitiationConfig = {}
): UseFileTransferInitiationReturn {
  const { currentRoom } = useRoomStore();
  const { peers } = usePeerStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingTransferRequest[]>([]);

  // Refs to avoid stale closures
  const initiatorRef = useRef<FileTransferInitiator | null>(null);
  const activeTransfersRef = useRef<Map<string, { status: string; targetPeerId: string }>>(new Map());

  // Initialize initiator
  useEffect(() => {
    const initiatorConfig: FileTransferInitiatorConfig = {
      requestTimeout: config.requestTimeout ?? 30000,
      maxConcurrentTransfers: config.maxConcurrentTransfers ?? 5,
      enableChecksum: true,
      defaultChunkSize: 16 * 1024,
      debug: config.debug ?? false,
    };

    const eventHandlers: FileTransferInitiatorEvents = {
      onRequestSent: (request: FileTransferRequest, peerId: string) => {
        console.log(`[FileTransferInitiation] Request sent for ${request.metadata.name} to peer ${peerId}`);
        activeTransfersRef.current.set(request.transferId, {
          status: 'pending',
          targetPeerId: peerId,
        });
      },
      onAccepted: (transferId: string, peerId: string) => {
        console.log(`[FileTransferInitiation] Transfer ${transferId} accepted by peer ${peerId}`);
        const transfer = activeTransfersRef.current.get(transferId);
        if (transfer) {
          activeTransfersRef.current.set(transferId, {
            ...transfer,
            status: 'accepted',
          });
        }
      },
      onRejected: (transferId: string, peerId: string, reason?: string) => {
        console.log(`[FileTransferInitiation] Transfer ${transferId} rejected by peer ${peerId}: ${reason}`);
        activeTransfersRef.current.delete(transferId);
      },
      onExpired: (transferId: string, peerId: string) => {
        console.log(`[FileTransferInitiation] Transfer ${transferId} to peer ${peerId} expired`);
        activeTransfersRef.current.delete(transferId);
        setError(`Transfer request to peer ${peerId} timed out`);
        setTimeout(() => setError(null), 5000);
      },
      onCancelled: (transferId: string, peerId: string) => {
        console.log(`[FileTransferInitiation] Transfer ${transferId} to peer ${peerId} cancelled`);
        activeTransfersRef.current.delete(transferId);
      },
      onError: (transferId: string, peerId: string, errorMsg: string) => {
        console.error(`[FileTransferInitiation] Error in transfer ${transferId} to peer ${peerId}: ${errorMsg}`);
        activeTransfersRef.current.delete(transferId);
        setError(`Transfer error: ${errorMsg}`);
        setTimeout(() => setError(null), 5000);
      },
    };

    initiatorRef.current = createFileTransferInitiator(eventHandlers, initiatorConfig);

    return () => {
      if (initiatorRef.current) {
        initiatorRef.current.destroy();
        initiatorRef.current = null;
      }
    };
  }, [config.requestTimeout, config.maxConcurrentTransfers, config.debug]);

  /**
   * Initiate file transfer to a specific peer
   */
  const initiateTransfer = useCallback(async (
    file: File,
    peerId: string,
    chunkCount?: number
  ): Promise<string | null> => {
    if (!initiatorRef.current) {
      setError('File transfer initiator not initialized');
      return null;
    }

    if (!currentRoom) {
      setError('Not connected to a room');
      return null;
    }

    const localPeerId = currentRoom.id; // Using room ID as local peer ID for now

    setIsProcessing(true);
    setError(null);

    try {
      const transferId = await initiatorRef.current.initiateTransfer(
        file,
        peerId,
        localPeerId,
        (targetPeerId: string, data: object) => {
          // Send through PeerConnectionManager
          // This would be integrated with the actual WebRTC send mechanism
          console.log(`[FileTransferInitiation] Sending to peer ${targetPeerId}:`, data);
          // TODO: Integrate with actual PeerConnectionManager.send()
          return true;
        },
        chunkCount
      );

      if (transferId) {
        console.log(`[FileTransferInitiation] Transfer ${transferId} initiated successfully`);
      } else {
        setError('Transfer request was rejected or timed out');
        setTimeout(() => setError(null), 5000);
      }

      return transferId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initiate transfer: ${errorMsg}`);
      setTimeout(() => setError(null), 5000);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [currentRoom]);

  /**
   * Initiate file transfer to all connected peers
   */
  const initiateTransferToAll = useCallback(async (
    file: File,
    chunkCount?: number
  ): Promise<Map<string, string | null>> => {
    const results = new Map<string, string | null>();

    if (!currentRoom) {
      setError('Not connected to a room');
      return results;
    }

    // Get all connected peers
    const connectedPeers = Array.from(peers.entries()).filter(
      ([_, peer]) => peer.connectionState === 'connected'
    );

    if (connectedPeers.length === 0) {
      setError('No connected peers');
      setTimeout(() => setError(null), 5000);
      return results;
    }

    setIsProcessing(true);
    setError(null);

    // Initiate transfer to each peer
    for (const [peerId, _] of connectedPeers) {
      const transferId = await initiateTransfer(file, peerId, chunkCount);
      results.set(peerId, transferId);
    }

    setIsProcessing(false);

    return results;
  }, [currentRoom, peers, initiateTransfer]);

  /**
   * Cancel an active transfer
   */
  const cancelTransfer = useCallback((transferId: string): boolean => {
    if (!initiatorRef.current) {
      return false;
    }

    const cancelled = initiatorRef.current.cancelTransfer(transferId);

    if (cancelled) {
      activeTransfersRef.current.delete(transferId);
    }

    return cancelled;
  }, []);

  /**
   * Get all active transfers
   */
  const getActiveTransfers = useCallback((): Map<string, { status: string; targetPeerId: string }> => {
    return new Map(activeTransfersRef.current);
  }, []);

  /**
   * Accept a pending transfer request
   */
  const acceptRequest = useCallback(async (transferId: string): Promise<boolean> => {
    // This would be handled by the FileTransferHandler
    // TODO: Implement when integrating with FileTransferHandler
    console.log(`[FileTransferInitiation] Accepting request ${transferId}`);
    return true;
  }, []);

  /**
   * Reject a pending transfer request
   */
  const rejectRequest = useCallback(async (transferId: string, reason?: string): Promise<boolean> => {
    // This would be handled by the FileTransferHandler
    // TODO: Implement when integrating with FileTransferHandler
    console.log(`[FileTransferInitiation] Rejecting request ${transferId}: ${reason}`);
    return true;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    initiateTransfer,
    initiateTransferToAll,
    cancelTransfer,
    getActiveTransfers,
    pendingRequests,
    acceptRequest,
    rejectRequest,
    isProcessing,
    error,
    clearError,
  };
}

export default useFileTransferInitiation;
