/**
 * Orchestrated cleanup for all stores when leaving a room or disconnecting
 * This ensures all sensitive data is securely cleared from memory
 */

import { useRoomStore } from '@/store/roomStore';
import { useMessageStore } from '@/store/messageStore';
import { usePeerStore } from '@/store/peerStore';
import { useClipboardStore } from '@/store/clipboardStore';

/**
 * Securely clears all sensitive data from all stores
 * This should be called when:
 * - Leaving a room
 * - Disconnecting from all peers
 * - Closing the application
 *
 * @example
 * ```ts
 * import { performSecureDataCleanup } from '@/lib/utils/store-cleanup';
 *
 * // When leaving a room
 * const handleLeaveRoom = () => {
 *   performSecureDataCleanup();
 *   // Additional cleanup...
 * };
 * ```
 */
export function performSecureDataCleanup(): void {
  try {
    // Clear room data (passwords, connection strings, etc.)
    const roomStore = useRoomStore.getState();
    if (roomStore.clearRoom) {
      roomStore.clearRoom();
    }

    // Clear all messages (text content, file data, etc.)
    const messageStore = useMessageStore.getState();
    if (messageStore.clearMessages) {
      messageStore.clearMessages();
    }
    if (messageStore.clearBroadcastResults) {
      messageStore.clearBroadcastResults();
    }
    if (messageStore.clearDeliveryConfirmations) {
      messageStore.clearDeliveryConfirmations();
    }

    // Clear all peer data
    const peerStore = usePeerStore.getState();
    if (peerStore.clearPeers) {
      peerStore.clearPeers();
    }

    // Clear clipboard data
    const clipboardStore = useClipboardStore.getState();
    if (clipboardStore.clearClipboardItems) {
      clipboardStore.clearClipboardItems();
    }
  } catch (error) {
    // Log error but don't throw - cleanup should always succeed
    console.error('Error during secure data cleanup:', error);
  }
}

/**
 * Cleanup function for when a single peer disconnects
 * This clears only data related to that specific peer
 *
 * @param peerId - The ID of the peer that disconnected
 */
export function performPeerSpecificCleanup(peerId: string): void {
  try {
    // Remove peer from peer store
    const peerStore = usePeerStore.getState();
    if (peerStore.removePeer) {
      peerStore.removePeer(peerId);
    }

    // Clear messages from this peer
    const messageStore = useMessageStore.getState();
    const peerMessages = messageStore.getMessagesByPeer(peerId);
    peerMessages.forEach((message) => {
      if (messageStore.removeMessage) {
        messageStore.removeMessage(message.id);
      }
    });

    // Remove peer from room if present
    const roomStore = useRoomStore.getState();
    if (roomStore.currentRoom?.peers.has(peerId)) {
      roomStore.removePeer(peerId);
    }
  } catch (error) {
    console.error(`Error during peer-specific cleanup for ${peerId}:`, error);
  }
}
