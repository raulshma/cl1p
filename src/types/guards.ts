// Type guards for runtime type checking
// These functions help validate data at runtime and provide type narrowing

import type {
  Peer,
  Message,
  FileTransfer,
  ClipboardItem,
  ConnectionState,
  MessageType,
  FileTransferStatus,
  ClipboardItemType,
  ToastType,
  Theme,
  ModalType,
} from './index';

// ============================================================================
// CONNECTION STATE GUARDS
// ============================================================================

export const isValidConnectionState = (state: string): state is ConnectionState => {
  return ['disconnected', 'connecting', 'connected', 'reconnecting', 'failed'].includes(state);
};

export const isActiveConnectionState = (state: ConnectionState): boolean => {
  return state === 'connected' || state === 'connecting' || state === 'reconnecting';
};

export const isStableConnectionState = (state: ConnectionState): boolean => {
  return state === 'connected';
};

// ============================================================================
// MESSAGE TYPE GUARDS
// ============================================================================

export const isValidMessageType = (type: string): type is MessageType => {
  return ['text', 'file', 'system'].includes(type);
};

export const isTextMessage = (message: Message): boolean => {
  return message.content.type === 'text';
};

export const isFileMessage = (message: Message): boolean => {
  return message.content.type === 'file';
};

export const isSystemMessage = (message: Message): boolean => {
  return message.content.type === 'system';
};

// ============================================================================
// FILE TRANSFER GUARDS
// ============================================================================

export const isValidFileTransferStatus = (status: string): status is FileTransferStatus => {
  return ['pending', 'in-progress', 'completed', 'failed', 'cancelled'].includes(status);
};

export const isTransferInProgress = (transfer: FileTransfer): boolean => {
  return transfer.status === 'in-progress';
};

export const isTransferComplete = (transfer: FileTransfer): boolean => {
  return transfer.status === 'completed';
};

export const isTransferFailed = (transfer: FileTransfer): boolean => {
  return transfer.status === 'failed' || transfer.status === 'cancelled';
};

// ============================================================================
// PEER GUARDS
// ============================================================================

export const isValidPeer = (peer: unknown): peer is Peer => {
  if (typeof peer !== 'object' || peer === null) {
    return false;
  }

  const p = peer as Partial<Peer>;
  return (
    typeof p.id === 'string' &&
    isValidConnectionState(p.connectionState || '') &&
    p.lastSeen instanceof Date
  );
};

export const isPeerConnected = (peer: Peer): boolean => {
  return peer.connectionState === 'connected';
};

export const isPeerStale = (peer: Peer, maxAgeMs: number = 5 * 60 * 1000): boolean => {
  return Date.now() - peer.lastSeen.getTime() > maxAgeMs;
};

// ============================================================================
// CLIPBOARD ITEM GUARDS
// ============================================================================

export const isValidClipboardItemType = (type: string): type is ClipboardItemType => {
  return ['text', 'image', 'file'].includes(type);
};

export const isTextClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'text';
};

export const isImageClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'image';
};

export const isFileClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'file';
};

export const isValidClipboardItem = (item: unknown): item is ClipboardItem => {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const c = item as Partial<ClipboardItem>;
  return (
    typeof c.id === 'string' &&
    isValidClipboardItemType(c.type || '') &&
    typeof c.content === 'string' &&
    c.timestamp instanceof Date
  );
};

// ============================================================================
// UI TYPE GUARDS
// ============================================================================

export const isValidToastType = (type: string): type is ToastType => {
  return ['info', 'success', 'warning', 'error'].includes(type);
};

export const isValidTheme = (theme: string): theme is Theme => {
  return ['light', 'dark', 'system'].includes(theme);
};

export const isValidModalType = (type: string): type is ModalType => {
  return ['settings', 'room-info', 'peer-info', 'confirm-dialog'].includes(type);
};

// ============================================================================
// GENERAL VALIDATION GUARDS
// ============================================================================

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isValidNumber = (value: unknown, min?: number, max?: number): value is number => {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
};

export const isArrayOf = <T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(guard);
};

// ============================================================================
// ASSERTION FUNCTIONS
// ============================================================================

export const assertConnectionState = (state: string): asserts state is ConnectionState => {
  if (!isValidConnectionState(state)) {
    throw new Error(`Invalid connection state: ${state}`);
  }
};

export const assertMessageType = (type: string): asserts type is MessageType => {
  if (!isValidMessageType(type)) {
    throw new Error(`Invalid message type: ${type}`);
  }
};

export const assertPeer = (peer: unknown): asserts peer is Peer => {
  if (!isValidPeer(peer)) {
    throw new Error('Invalid peer object');
  }
};

export const assertClipboardItem = (item: unknown): asserts item is ClipboardItem => {
  if (!isValidClipboardItem(item)) {
    throw new Error('Invalid clipboard item object');
  }
};
