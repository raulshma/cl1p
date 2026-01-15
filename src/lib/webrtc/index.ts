/**
 * WebRTC Library Exports
 */

export { PeerConnectionManager as default } from './PeerConnectionManager';
export { PeerConnectionManager } from './PeerConnectionManager';

// Connection string generator exports
export {
  generateWebRTCConnectionString,
  parseWebRTCConnectionString,
  isValidWebRTCConnectionString,
  isConnectionStringExpired,
  extractRoomId,
  extractPeerId,
  extractSignalData,
  hasConnectionStringPassword,
  getConnectionStringVersion,
} from './connection-string-generator';

export type {
  ConnectionStringMetadata,
  WebRTCConnectionStringData,
  ParsedWebRTCConnectionString,
} from './connection-string-generator';

// Message broadcaster exports
export {
  MessageBroadcaster,
  createBroadcastMessage,
  serializeMessage,
  deserializeMessage,
  isValidBroadcastMessage,
  createDeliveryConfirmation,
} from './message-broadcaster';

export type {
  BroadcastMessageType,
  BroadcastMessagePayload,
  DeliveryConfirmation,
  BroadcastResult,
  MessageBroadcasterConfig,
} from './message-broadcaster';

// Message receiver exports
export {
  MessageReceiver,
  createMessageReceiver,
  isValidMessageData,
  extractMessageType,
} from './message-receiver';

export type {
  MessageValidationResult,
  ReceivedMessageMetadata,
  MessageReceiverConfig,
  MessageReceiverEvents,
} from './message-receiver';

// Typing indicator exports
export {
  TypingIndicator,
  createTypingEvent,
  serializeTypingEvent,
  isTypingEvent,
} from './typing-indicator';

export type {
  TypingEventType,
  TypingEventPayload,
  TypingIndicatorConfig,
} from './typing-indicator';

// File chunking exports
export {
  FileChunker,
  createFileChunks,
  estimateTransferSize,
} from './file-chunker';

export type {
  FileChunkerConfig,
  FileChunkMetadata,
  FileChunk,
  ChunkingProgress,
} from './file-chunker';

// File reassembly exports
export {
  FileReassembler,
  createFileReassembler,
} from './file-reassembler';

export type {
  FileReassemblerConfig,
  ReassemblyStatus,
  ReassemblyProgress,
  ReassemblyResult,
} from './file-reassembler';

// File transfer initiator exports
export {
  FileTransferInitiator,
  createFileTransferInitiator,
  isValidFileTransferRequest,
  isValidFileTransferResponse,
  createFileTransferResponse,
  createFileTransferStart,
} from './file-transfer-initiator';

export type {
  FileTransferInitMessageType,
  FileMetadata,
  FileTransferRequest,
  FileTransferResponse,
  FileTransferStart,
  TransferInitiationStatus,
  FileTransferInitiatorConfig,
  FileTransferInitiatorEvents,
} from './file-transfer-initiator';

// File transfer handler exports
export {
  FileTransferHandler,
  createFileTransferHandler,
} from './file-transfer-handler';

export type {
  TransferRequestStatus,
  IncomingFileTransfer,
  FileTransferHandlerConfig,
  FileTransferHandlerEvents,
} from './file-transfer-handler';

