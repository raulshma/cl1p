/**
 * React Hook for File Transfer Progress Tracking
 *
 * Manages real-time progress tracking for active file transfers,
 * including speed calculation and ETA estimation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FileTransferProgress,
  TransferDirection,
  TransferStatus,
} from '@/components/FileTransferProgress';

/**
 * Progress tracking configuration
 */
export interface UseFileTransferProgressConfig {
  updateInterval?: number; // Update interval in ms (default: 500ms)
  speedSampleSize?: number; // Number of samples for speed calculation (default: 5)
  debug?: boolean;
}

/**
 * Internal transfer state with tracking data
 */
interface TrackedTransfer extends FileTransferProgress {
  startTime?: number;
  lastUpdate?: number;
  lastBytes?: number;
  speedSamples: number[];
}

/**
 * Hook return value
 */
export interface UseFileTransferProgressReturn {
  // Active transfers
  transfers: FileTransferProgress[];
  activeTransfers: FileTransferProgress[];

  // Transfer management
  addTransfer: (transfer: Omit<FileTransferProgress, 'transferSpeed' | 'timeRemaining'>) => void;
  updateTransferProgress: (transferId: string, progress: number, bytesTransferred?: number) => void;
  setTransferStatus: (transferId: string, status: TransferStatus, error?: string) => void;
  removeTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;

  // Transfer queries
  getTransfer: (transferId: string) => FileTransferProgress | null;
  getTransfersByPeer: (peerId: string) => FileTransferProgress[];
  getUploads: () => FileTransferProgress[];
  getDownloads: () => FileTransferProgress[];

  // Utilities
  clearCompleted: (olderThan?: number) => void;
  clearAll: () => void;
  hasActiveTransfers: boolean;
}

/**
 * Calculate transfer speed from samples
 */
function calculateSpeed(samples: number[]): number {
  if (samples.length === 0) return 0;
  // Use average of recent samples
  const sum = samples.reduce((acc, val) => acc + val, 0);
  return sum / samples.length;
}

/**
 * Calculate estimated time remaining
 */
function calculateETA(
  bytesRemaining: number,
  speed: number
): number {
  if (speed <= 0) return 0;
  return bytesRemaining / speed;
}

export function useFileTransferProgress(
  config: UseFileTransferProgressConfig = {}
): UseFileTransferProgressReturn {
  const {
    updateInterval = 500,
    speedSampleSize = 5,
    debug = false,
  } = config;

  const [transfers, setTransfers] = useState<FileTransferProgress[]>([]);
  const trackedTransfersRef = useRef<Map<string, TrackedTransfer>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Log debug messages
   */
  const debugLog = useCallback((message: string, data?: unknown) => {
    if (debug) {
      console.log(`[FileTransferProgress] ${message}`, data ?? '');
    }
  }, [debug]);

  /**
   * Update transfer speeds and ETAs periodically
   */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const tracked = trackedTransfersRef.current;
      const now = Date.now();

      const updated: FileTransferProgress[] = [];

      for (const [transferId, trackedTransfer] of tracked.entries()) {
        // Only update in-progress transfers
        if (trackedTransfer.status !== 'in-progress') continue;

        const { lastUpdate, lastBytes, speedSamples, startTime, fileSize, progress } = trackedTransfer;

        if (!lastUpdate || !lastBytes || !startTime) continue;

        // Calculate time since last update
        const timeDelta = (now - lastUpdate) / 1000; // Convert to seconds

        if (timeDelta <= 0) continue;

        // Calculate current speed from progress
        const bytesTransferred = (fileSize * progress) / 100;
        const bytesSinceLastUpdate = bytesTransferred - lastBytes;
        const currentSpeed = bytesSinceLastUpdate / timeDelta;

        // Update speed samples
        const newSpeedSamples = [...speedSamples, currentSpeed].slice(-speedSampleSize);
        const avgSpeed = calculateSpeed(newSpeedSamples);

        // Calculate ETA
        const bytesRemaining = fileSize - bytesTransferred;
        const eta = calculateETA(bytesRemaining, avgSpeed);

        // Update tracked transfer
        const updatedTransfer: TrackedTransfer = {
          ...trackedTransfer,
          transferSpeed: avgSpeed,
          timeRemaining: eta,
          speedSamples: newSpeedSamples,
          lastUpdate: now,
          lastBytes: bytesTransferred,
        };

        tracked.set(transferId, updatedTransfer);

        updated.push({
          transferId: updatedTransfer.transferId,
          fileName: updatedTransfer.fileName,
          fileSize: updatedTransfer.fileSize,
          direction: updatedTransfer.direction,
          status: updatedTransfer.status,
          progress: updatedTransfer.progress,
          transferSpeed: avgSpeed,
          timeRemaining: eta,
          peerId: updatedTransfer.peerId,
          error: updatedTransfer.error,
        });
      }

      // Update state with transfers that have speed/ETA
      if (updated.length > 0) {
        setTransfers(prev =>
          prev.map(p => {
            const update = updated.find(u => u.transferId === p.transferId);
            return update ?? p;
          })
        );
      }
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, speedSampleSize]);

  /**
   * Add a new transfer to track
   */
  const addTransfer = useCallback((
    transfer: Omit<FileTransferProgress, 'transferSpeed' | 'timeRemaining'>
  ) => {
    const transferId = transfer.transferId;
    const now = Date.now();

    const trackedTransfer: TrackedTransfer = {
      ...transfer,
      transferSpeed: 0,
      timeRemaining: 0,
      startTime: transfer.status === 'in-progress' ? now : undefined,
      lastUpdate: transfer.status === 'in-progress' ? now : undefined,
      lastBytes: transfer.status === 'in-progress' ? 0 : undefined,
      speedSamples: [],
    };

    trackedTransfersRef.current.set(transferId, trackedTransfer);

    setTransfers(prev => {
      const exists = prev.find(t => t.transferId === transferId);
      if (exists) {
        return prev.map(t => t.transferId === transferId ? { ...transfer, transferSpeed: 0, timeRemaining: 0 } : t);
      }
      return [...prev, { ...transfer, transferSpeed: 0, timeRemaining: 0 }];
    });

    debugLog(`Transfer added: ${transfer.fileName} (${transfer.direction})`);
  }, [debugLog]);

  /**
   * Update transfer progress
   */
  const updateTransferProgress = useCallback((
    transferId: string,
    progress: number,
    bytesTransferred?: number
  ) => {
    const tracked = trackedTransfersRef.current.get(transferId);
    if (!tracked) {
      debugLog(`Transfer not found: ${transferId}`);
      return;
    }

    const now = Date.now();
    const updatedTracked: TrackedTransfer = {
      ...tracked,
      progress,
      lastUpdate: now,
      lastBytes: bytesTransferred ?? (tracked.fileSize * progress) / 100,
    };

    trackedTransfersRef.current.set(transferId, updatedTracked);

    setTransfers(prev =>
      prev.map(t =>
        t.transferId === transferId
          ? { ...t, progress }
          : t
      )
    );

    debugLog(`Transfer progress updated: ${transferId} - ${progress.toFixed(1)}%`);
  }, [debugLog]);

  /**
   * Update transfer status
   */
  const setTransferStatus = useCallback((
    transferId: string,
    status: TransferStatus,
    error?: string
  ) => {
    const tracked = trackedTransfersRef.current.get(transferId);
    if (!tracked) return;

    const now = Date.now();
    const updatedTracked: TrackedTransfer = {
      ...tracked,
      status,
      error,
      // Set start time for pending -> in-progress transitions
      startTime: status === 'in-progress' && !tracked.startTime ? now : tracked.startTime,
      // Clear speed samples for failed/cancelled transfers
      speedSamples: (status === 'failed' || status === 'cancelled') ? [] : tracked.speedSamples,
    };

    trackedTransfersRef.current.set(transferId, updatedTracked);

    setTransfers(prev =>
      prev.map(t =>
        t.transferId === transferId
          ? { ...t, status, error }
          : t
      )
    );

    debugLog(`Transfer status updated: ${transferId} - ${status}`, error);
  }, [debugLog]);

  /**
   * Remove a transfer
   */
  const removeTransfer = useCallback((transferId: string) => {
    trackedTransfersRef.current.delete(transferId);
    setTransfers(prev => prev.filter(t => t.transferId !== transferId));
    debugLog(`Transfer removed: ${transferId}`);
  }, [debugLog]);

  /**
   * Cancel a transfer
   */
  const cancelTransfer = useCallback((transferId: string) => {
    setTransferStatus(transferId, 'cancelled', 'Transfer cancelled by user');
  }, [setTransferStatus]);

  /**
   * Get a specific transfer
   */
  const getTransfer = useCallback((transferId: string): FileTransferProgress | null => {
    return transfers.find(t => t.transferId === transferId) ?? null;
  }, [transfers]);

  /**
   * Get transfers by peer
   */
  const getTransfersByPeer = useCallback((peerId: string): FileTransferProgress[] => {
    return transfers.filter(t => t.peerId === peerId);
  }, [transfers]);

  /**
   * Get all uploads
   */
  const getUploads = useCallback((): FileTransferProgress[] => {
    return transfers.filter(t => t.direction === 'upload');
  }, [transfers]);

  /**
   * Get all downloads
   */
  const getDownloads = useCallback((): FileTransferProgress[] => {
    return transfers.filter(t => t.direction === 'download');
  }, [transfers]);

  /**
   * Clear completed transfers older than specified time
   */
  const clearCompleted = useCallback((olderThan: number = 5000) => {
    const now = Date.now();
    const tracked = trackedTransfersRef.current;

    for (const [transferId, transfer] of tracked.entries()) {
      if (transfer.status === 'completed' || transfer.status === 'failed' || transfer.status === 'cancelled') {
        const timeSinceCompletion = now - (transfer.lastUpdate ?? transfer.startTime ?? now);
        if (timeSinceCompletion > olderThan) {
          tracked.delete(transferId);
        }
      }
    }

    setTransfers(prev => prev.filter(t => {
      if (t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled') return true;
      const trackedTransfer = tracked.get(t.transferId);
      return trackedTransfer !== undefined;
    }));

    debugLog(`Cleared completed transfers older than ${olderThan}ms`);
  }, [debugLog]);

  /**
   * Clear all transfers
   */
  const clearAll = useCallback(() => {
    trackedTransfersRef.current.clear();
    setTransfers([]);
    debugLog('Cleared all transfers');
  }, [debugLog]);

  // Computed values
  const activeTransfers = transfers.filter(
    t => t.status === 'pending' || t.status === 'in-progress'
  );
  const hasActiveTransfers = activeTransfers.length > 0;

  return {
    transfers,
    activeTransfers,
    addTransfer,
    updateTransferProgress,
    setTransferStatus,
    removeTransfer,
    cancelTransfer,
    getTransfer,
    getTransfersByPeer,
    getUploads,
    getDownloads,
    clearCompleted,
    clearAll,
    hasActiveTransfers,
  };
}

export default useFileTransferProgress;
