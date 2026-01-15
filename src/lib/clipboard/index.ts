/**
 * Clipboard Module
 *
 * Exports clipboard synchronization functionality for peer-to-peer clipboard sharing.
 */

export {
  ClipboardSyncManager,
  createClipboardSyncManager,
  isValidClipboardSyncPayload,
  type ClipboardSyncConfig,
  type ClipboardSyncEvents,
  type ClipboardSyncPayload,
  type ClipboardSyncMessageType,
} from './clipboard-sync-manager';

// Export as default using a getter to avoid circular dependency
export { ClipboardSyncManager as default } from './clipboard-sync-manager';
