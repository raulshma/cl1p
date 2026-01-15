// Domain type definitions for Live Clipboard application
// Enhanced with strict type checking and comprehensive interfaces

import type SimplePeer from 'simple-peer';

// ============================================================================
// CONNECTION TYPES
// ============================================================================

/**
 * Represents the current state of a peer connection
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * Type guard to check if connection is active
 */
export const isActiveConnection = (state: ConnectionState): boolean => {
  return state === 'connected' || state === 'connecting' || state === 'reconnecting';
};

/**
 * Type guard to check if connection is stable
 */
export const isStableConnection = (state: ConnectionState): boolean => {
  return state === 'connected';
};

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Represents the type of message being sent
 */
export type MessageType = 'text' | 'file' | 'system' | 'clipboard';

/**
 * Base message interface
 */
export interface BaseMessage {
  id: string;
  type: MessageType;
  peerId: string;
  timestamp: Date;
}

/**
 * Text message content
 */
export interface TextMessageContent {
  type: 'text';
  content: string;
}

/**
 * File message content
 */
export interface FileMessageContent {
  type: 'file';
  file: FileTransfer;
}

/**
 * System message content
 */
export interface SystemMessageContent {
  type: 'system';
  content: string;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Clipboard message content
 */
export interface ClipboardMessageContent {
  type: 'clipboard';
  content: string;
  senderId: string;
}

/**
 * Discriminated union for message content
 */
export type MessageContent = TextMessageContent | FileMessageContent | SystemMessageContent | ClipboardMessageContent;

/**
 * Complete message interface with discriminated union
 */
export interface Message extends BaseMessage {
  content: MessageContent;
}

/**
 * Type guard for text messages
 */
export const isTextMessage = (message: Message): message is Message & TextMessageContent => {
  return message.content.type === 'text';
};

/**
 * Type guard for file messages
 */
export const isFileMessage = (message: Message): message is Message & FileMessageContent => {
  return message.content.type === 'file';
};

/**
 * Type guard for system messages
 */
export const isSystemMessage = (message: Message): message is Message & SystemMessageContent => {
  return message.content.type === 'system';
};

/**
 * Type guard for clipboard messages
 */
export const isClipboardMessage = (message: Message): message is Message & ClipboardMessageContent => {
  return message.content.type === 'clipboard';
};

// ============================================================================
// FILE TRANSFER TYPES
// ============================================================================

/**
 * Represents the status of a file transfer
 */
export type FileTransferStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * File chunk information for large file transfers
 */
export interface FileChunk {
  index: number;
  data: ArrayBuffer;
  checksum?: string;
}

/**
 * Import FileTransfer interface (will be defined below)
 */
export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileTransferStatus;
  progress: number;
  peerId: string;
  data?: ArrayBuffer;
  chunks?: FileChunk[];
  metadata?: {
    mimeType?: string;
    checksum?: string;
    lastModified?: Date;
    isDirectory?: boolean;
  };
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Type guard to check if file transfer is in progress
 */
export const isTransferInProgress = (transfer: FileTransfer): boolean => {
  return transfer.status === 'in-progress';
};

/**
 * Type guard to check if file transfer is complete
 */
export const isTransferComplete = (transfer: FileTransfer): boolean => {
  return transfer.status === 'completed';
};

/**
 * Type guard to check if file transfer has failed
 */
export const isTransferFailed = (transfer: FileTransfer): boolean => {
  return transfer.status === 'failed' || transfer.status === 'cancelled';
};

// ============================================================================
// PEER TYPES
// ============================================================================

/**
 * Peer metadata information
 */
export interface PeerMetadata {
  nickname?: string;
  browser?: string;
  browserVersion?: string;
  platform?: string;
  platformVersion?: string;
  avatar?: string;
  capabilities?: string[];
}

/**
 * Comprehensive peer interface
 */
export interface Peer {
  id: string;
  connectionState: ConnectionState;
  lastSeen: Date;
  metadata?: PeerMetadata;
  statistics?: {
    messagesSent?: number;
    messagesReceived?: number;
    filesTransferred?: number;
    bytesTransferred?: number;
  };
}

/**
 * Type guard to check if peer is connected
 */
export const isPeerConnected = (peer: Peer): boolean => {
  return peer.connectionState === 'connected';
};

/**
 * Type guard to check if peer is stale (not seen in 5 minutes)
 */
export const isPeerStale = (peer: Peer): boolean => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  return Date.now() - peer.lastSeen.getTime() > FIVE_MINUTES;
};

// ============================================================================
// ROOM TYPES
// ============================================================================

/**
 * Room configuration options
 */
export interface RoomConfig {
  maxPeers?: number;
  requirePassword?: boolean;
  allowFileSharing?: boolean;
  allowClipboardSync?: boolean;
  enableE2E?: boolean;
}

/**
 * Room statistics
 */
export interface RoomStatistics {
  totalMessages: number;
  totalFiles: number;
  totalBytes: number;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Comprehensive room interface
 */
export interface Room {
  id: string;
  isHost: boolean;
  peers: Map<string, Peer>;
  createdAt: Date;
  connectionState: ConnectionState;
  config?: RoomConfig;
  statistics?: RoomStatistics;
  password?: string;
}

/**
 * Type guard to check if room is hosted by local peer
 */
export const isHostRoom = (room: Room): boolean => {
  return room.isHost;
};

/**
 * Get peer count in room
 */
export const getPeerCount = (room: Room): number => {
  return room.peers.size;
};

// ============================================================================
// CLIPBOARD TYPES
// ============================================================================

/**
 * Clipboard item types
 */
export type ClipboardItemType = 'text' | 'image' | 'file';

/**
 * Clipboard item metadata
 */
export interface ClipboardMetadata {
  size?: number;
  mimeType?: string;
  fileName?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Comprehensive clipboard item interface
 */
export interface ClipboardItem {
  id: string;
  type: ClipboardItemType;
  content: string;
  timestamp: Date;
  peerId?: string;
  metadata?: ClipboardMetadata;
  isSynced?: boolean;
}

/**
 * Type guard for text clipboard items
 */
export const isTextClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'text';
};

/**
 * Type guard for image clipboard items
 */
export const isImageClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'image';
};

/**
 * Type guard for file clipboard items
 */
export const isFileClipboardItem = (item: ClipboardItem): boolean => {
  return item.type === 'file';
};

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * Toast notification types
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

// ============================================================================
// WEBRTC PEER CONNECTION MANAGER TYPES
// ============================================================================

/**
 * Role of a peer in WebRTC connection
 */
export type PeerRole = 'initiator' | 'receiver';

/**
 * Configuration for WebRTC peer connection
 */
export interface WebRTCPeerConfig {
  initiator?: boolean; // Set automatically by createPeer based on role
  trickle?: boolean; // If false, wait for complete ICE gathering before signaling
  config?: RTCConfiguration;
  channelConfig?: RTCDataChannelInit;
  stream?: MediaStream;
  offerOptions?: RTCOfferOptions;
  answerOptions?: RTCAnswerOptions;
  sdpTransform?: (sdp: string) => string;
}

/**
 * WebRTC Signal Data type (from simple-peer)
 */
export type SignalData = SimplePeer.SignalData;

/**
 * SimplePeer Instance type - represents the peer connection object
 */
export type SimplePeerInstance = SimplePeer.Instance;

/**
 * WebRTC event callback type
 */
export type WebRTCEventCallback = (...args: unknown[]) => void;

/**
 * Events emitted by WebRTC peer connections
 */
export interface WebRTCConnectionEvents {
  signal: (data: SignalData) => void;
  connect: () => void;
  data: (data: ArrayBuffer | string) => void;
  stream: (stream: MediaStream) => void;
  track: (track: MediaStreamTrack, stream: MediaStream) => void;
  close: () => void;
  error: (error: Error) => void;
  iceStateChange: (iceState: RTCIceConnectionState) => void;
  stateChange: (state: ConnectionState) => void;
  reconnecting: (data: { peerId: string; error: string }) => void;
  reconnectFailed: (data: { peerId: string; attempts: number; reason: string }) => void;
  reconnectSuccess: (data: { peerId: string; attempts: number }) => void;
}

/**
 * Configuration for WebRTC Peer Connection Manager
 */
export interface WebRTCPeerManagerConfig {
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
  enableExponentialBackoff?: boolean;
  backoffMultiplier?: number;
  maxRetryDelay?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

/**
 * Interface for WebRTC Peer Connection Manager
 */
export interface WebRTCPeerManager {
  // Peer management
  createPeer(peerId: string, role: PeerRole, config?: WebRTCPeerConfig): void;
  getPeer(peerId: string): SimplePeerInstance | null;
  removePeer(peerId: string): void;
  removeAllPeers(): void;
  getAllPeers(): Map<string, SimplePeerInstance>;
  hasPeer(peerId: string): boolean;

  // Connection management
  connect(peerId: string, signalData: SignalData): void;
  disconnect(peerId: string): void;
  disconnectAll(): void;
  getConnectionState(peerId: string): ConnectionState | null;

  // Data transmission
  send(peerId: string, data: string | ArrayBuffer | object): boolean;
  broadcast(data: string | ArrayBuffer | object, excludePeerId?: string): void;

  // Event handling
  on(event: keyof WebRTCConnectionEvents, callback: WebRTCEventCallback): void;
  off(event: keyof WebRTCConnectionEvents, callback: WebRTCEventCallback): void;
  onPeerEvent(peerId: string, event: keyof WebRTCConnectionEvents, callback: WebRTCEventCallback): void;

  // Cleanup
  destroy(): void;
}


/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
}

/**
 * Typing indicator interface
 */
export interface TypingIndicator {
  peerId: string;
  isTyping: boolean;
  lastUpdate: Date;
  timeout?: NodeJS.Timeout;
}

/**
 * Modal types
 */
export type ModalType = 'settings' | 'room-info' | 'peer-info' | 'confirm-dialog';

/**
 * Theme types
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Comprehensive UI state interface
 */
export interface UIState {
  isLoading: boolean;
  loadingMessage?: string;
  sidebarOpen: boolean;
  theme: Theme;
  toasts: Toast[];
  typingIndicators: Map<string, TypingIndicator>;
  modalOpen: boolean;
  modalType?: ModalType | null;
  modalData?: Record<string, unknown>;
}

/**
 * Peer store state
 */
export interface PeerState {
  peers: Map<string, Peer>;
  localPeerId: string | null;
  selectedPeerId: string | null;
}

/**
 * Room store state
 */
export interface RoomState {
  currentRoom: Room | null;
  connectionString: string;
  shareUrl: string;
  error: string | null;
  connectionState: ConnectionState;
}

/**
 * Clipboard store state
 */
export interface ClipboardState {
  items: ClipboardItem[];
  currentClipboard: string | null;
  syncEnabled: boolean;
  lastSync: Date | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Async function result type
 */
export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

/**
 * Event handler type
 */
export type EventHandler<T = void> = (event: T) => void;

// ============================================================================
// API TYPES
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validation rule
 */
export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

/**
 * Schema validator
 */
export interface SchemaValidator<T> {
  validate: (data: unknown) => ValidationResult;
  parse: (data: unknown) => T;
}

// ============================================================================
// FILE VALIDATION TYPES
// ============================================================================

/**
 * File validation error types
 */
export type FileValidationErrorType =
  | 'SIZE_EXCEEDED'
  | 'INVALID_TYPE'
  | 'INVALID_EXTENSION'
  | 'INVALID_FILENAME'
  | 'EMPTY_FILE'
  | 'SANITIZATION_FAILED';

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  sanitizedFilename?: string;
  error?: {
    type: FileValidationErrorType;
    message: string;
  };
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  sanitizeFilename?: boolean;
  checkEmpty?: boolean;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Sync status
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Sync configuration
 */
export interface SyncConfig {
  enabled: boolean;
  interval?: number; // milliseconds
  conflictResolution?: 'local' | 'remote' | 'manual';
}

/**
 * Sync state
 */
export interface SyncState {
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
  config: SyncConfig;
}

// ============================================================================
// TEXT HISTORY TYPES
// ============================================================================

/**
 * Text history entry interface
 */
export interface TextHistoryEntry {
  id: string;
  content: string;
  timestamp: Date;
}

/**
 * Text history state interface
 */
export interface TextHistoryState {
  entries: TextHistoryEntry[];
  currentIndex: number;
  maxSize: number;
}
