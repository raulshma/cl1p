/**
 * useClipboardSync Hook
 *
 * React hook to integrate clipboard sync functionality with the application.
 * Manages clipboard monitoring, broadcasting changes to peers, and handling incoming updates.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useClipboardStore } from '@/store';
import { usePeerStore } from '@/store';
import { ClipboardSyncManager, type ClipboardSyncConfig } from '@/lib/clipboard';

interface UseClipboardSyncOptions {
  enabled?: boolean;
  requirePermission?: boolean;
  syncInterval?: number;
  onPermissionRequest?: () => Promise<boolean>;
}

/**
 * Hook to enable clipboard synchronization across peers
 */
export function useClipboardSync(options: UseClipboardSyncOptions = {}) {
  const {
    syncEnabled,
    addClipboardItem,
    setCurrentClipboard,
    updateLastSync,
  } = useClipboardStore();

  const { localPeerId } = usePeerStore();

  const clipboardManagerRef = useRef<ClipboardSyncManager | null>(null);

  // Initialize clipboard sync manager
  useEffect(() => {
    if (!localPeerId) {
      return;
    }

    const config: ClipboardSyncConfig = {
      enabled: options.enabled ?? syncEnabled,
      requirePermission: options.requirePermission ?? true,
      syncInterval: options.syncInterval ?? 1000,
      debug: true,
    };

    const manager = new ClipboardSyncManager(
      localPeerId,
      {
        onLocalClipboardChange: (content) => {
          console.log('[useClipboardSync] Local clipboard changed:', content.substring(0, 50));
          // Add to clipboard store
          addClipboardItem({
            type: 'text',
            content,
          });
          setCurrentClipboard(content);

          // Broadcast to all connected peers would be handled here
          // This would integrate with the PeerConnectionManager
        },
        onRemoteClipboardUpdate: (content, senderId) => {
          console.log('[useClipboardSync] Remote clipboard update from', senderId);
          // Add to clipboard store as a synced item
          addClipboardItem({
            type: 'text',
            content,
            peerId: senderId,
          });
          setCurrentClipboard(content);
          updateLastSync();
        },
        onSyncError: (error) => {
          console.error('[useClipboardSync] Sync error:', error);
        },
        onPermissionRequested: async () => {
          if (options.onPermissionRequest) {
            return await options.onPermissionRequest();
          }
          // Check if we've already prompted this session to avoid repeated alerts
          const alreadyPrompted = sessionStorage.getItem('clipboard-permission-dismissed');
          if (alreadyPrompted === 'true') {
            // User already made a decision this session, don't prompt again
            return false;
          }
          
          // Try to get permission through the clipboard API directly
          // This triggers the browser's native permission UI without using confirm()
          try {
            await navigator.clipboard.readText();
            return true;
          } catch {
            // Permission denied or not available
            sessionStorage.setItem('clipboard-permission-dismissed', 'true');
            return false;
          }
        },
      },
      config
    );

    clipboardManagerRef.current = manager;

    // Start monitoring if enabled
    if (config.enabled && syncEnabled) {
      manager.startMonitoring();
    }

    return () => {
      manager.destroy();
    };
  }, [localPeerId]);

  // Start/stop monitoring based on syncEnabled state
  useEffect(() => {
    const manager = clipboardManagerRef.current;
    if (!manager) return;

    if (syncEnabled) {
      manager.startMonitoring();
    } else {
      manager.stopMonitoring();
    }
  }, [syncEnabled]);

  // Handle incoming clipboard sync from peers
  const handleRemoteClipboardSync = useCallback(async (content: string, senderId: string) => {
    const manager = clipboardManagerRef.current;
    if (!manager) return;

    await manager.handleRemoteClipboardSync({
      id: Date.now().toString(),
      type: 'clipboard-sync',
      content,
      senderId,
      timestamp: Date.now(),
      requiresConfirmation: true,
    });
  }, []);

  // Broadcast clipboard content to all connected peers
  const broadcastClipboard = useCallback(async (content: string) => {
    const manager = clipboardManagerRef.current;
    if (!manager) return;

    const payload = manager.createSyncPayload(content);

    // This would integrate with PeerConnectionManager to broadcast
    // For now, just log the payload
    console.log('[useClipboardSync] Broadcasting clipboard:', payload);

    // TODO: Integrate with PeerConnectionManager.broadcast()
    // peerConnectionManager.broadcast(payload);
  }, []);

  // Request clipboard permission manually
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const manager = clipboardManagerRef.current;
    if (!manager) return false;

    return await manager.requestPermission();
  }, []);

  // Write content to clipboard
  const writeToClipboard = useCallback(async (content: string): Promise<boolean> => {
    const manager = clipboardManagerRef.current;
    if (!manager) return false;

    return await manager.writeToClipboard(content);
  }, []);

  // Get monitoring state
  const isMonitoring = clipboardManagerRef.current?.isMonitoringActive() ?? false;

  return {
    isMonitoring,
    broadcastClipboard,
    handleRemoteClipboardSync,
    requestPermission,
    writeToClipboard,
    clipboardManager: clipboardManagerRef.current,
  };
}

export default useClipboardSync;
