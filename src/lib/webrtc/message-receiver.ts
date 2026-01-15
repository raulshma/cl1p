/**
 * WebRTC Message Receiver
 *
 * Handles receiving, parsing, and validating messages from WebRTC data channels.
 * Integrates with the message store to trigger UI updates with new content.
 */

import type { Message, TextMessageContent, FileMessageContent, SystemMessageContent } from '@/types';
import { deserializeMessage, isValidBroadcastMessage, type BroadcastMessagePayload } from './message-broadcaster';

/**
 * Message validation result
 */
export interface MessageValidationResult {
  isValid: boolean;
  message?: Message;
  error?: string;
}

/**
 * Received message metadata
 */
export interface ReceivedMessageMetadata {
  peerId: string;
  receivedAt: Date;
  rawData?: string | ArrayBuffer | object;
}

/**
 * Message receiver configuration
 */
export interface MessageReceiverConfig {
  enableAutoValidation?: boolean;
  enableStoreIntegration?: boolean;
  maxMessageSize?: number;
  debug?: boolean;
}

/**
 * Message receiver event handlers
 */
export interface MessageReceiverEvents {
  onMessageReceived: (message: Message, metadata: ReceivedMessageMetadata) => void;
  onMessageValidated: (message: Message) => void;
  onMessageInvalid: (error: string, rawData: unknown) => void;
  onDeliveryConfirmation: (messageId: string, peerId: string) => void;
}

/**
 * Message Receiver Class
 *
 * Handles the complete flow of receiving messages from WebRTC data channels,
 * validating them, and triggering UI updates.
 */
export class MessageReceiver {
  private config: Required<MessageReceiverConfig>;
  private eventHandlers: MessageReceiverEvents;
  private messageHistory: Map<string, ReceivedMessageMetadata>;

  constructor(
    eventHandlers: MessageReceiverEvents,
    config: MessageReceiverConfig = {}
  ) {
    this.config = {
      enableAutoValidation: config.enableAutoValidation ?? true,
      enableStoreIntegration: config.enableStoreIntegration ?? true,
      maxMessageSize: config.maxMessageSize ?? 10 * 1024 * 1024, // 10MB default
      debug: config.debug ?? false,
    };

    this.eventHandlers = eventHandlers;
    this.messageHistory = new Map();

    this.debug('MessageReceiver initialized', this.config);
  }

  /**
   * Handle incoming data from WebRTC data channel
   *
   * @param data - Raw data from WebRTC
   * @param peerId - ID of the peer who sent the data
   * @returns Validation result
   */
  public handleIncomingData(data: any, peerId: string): MessageValidationResult {
    const receivedAt = new Date();

    this.debug(`Received data from peer ${peerId}`, { type: typeof data, size: this.getDataSize(data) });

    // Store raw metadata
    const metadata: ReceivedMessageMetadata = {
      peerId,
      receivedAt,
      rawData: data,
    };

    try {
      // Validate message size
      if (!this.validateMessageSize(data)) {
        const error = `Message size exceeds maximum allowed size of ${this.config.maxMessageSize} bytes`;
        this.debug(error);
        this.eventHandlers.onMessageInvalid?.(error, data);
        return { isValid: false, error };
      }

      // Check if it's a delivery confirmation
      if (this.isDeliveryConfirmation(data)) {
        this.handleDeliveryConfirmation(data);
        return { isValid: true };
      }

      // Deserialize the message
      const broadcastMessage = this.deserializeMessage(data);

      if (!broadcastMessage) {
        const error = 'Failed to deserialize message: invalid format';
        this.debug(error);
        this.eventHandlers.onMessageInvalid?.(error, data);
        return { isValid: false, error };
      }

      // Validate the broadcast message structure
      if (!this.validateBroadcastMessage(broadcastMessage)) {
        const error = 'Invalid broadcast message structure';
        this.debug(error);
        this.eventHandlers.onMessageInvalid?.(error, data);
        return { isValid: false, error };
      }

      // Convert to domain Message type
      const message = this.convertToDomainMessage(broadcastMessage, peerId);

      if (!message) {
        const error = 'Failed to convert broadcast message to domain message';
        this.debug(error);
        this.eventHandlers.onMessageInvalid?.(error, data);
        return { isValid: false, error };
      }

      // Store in history
      this.messageHistory.set(message.id, metadata);

      // Trigger received event
      this.eventHandlers.onMessageReceived?.(message, metadata);

      // Send delivery confirmation if required
      if (broadcastMessage.requiresConfirmation) {
        this.sendDeliveryConfirmation(broadcastMessage.id, peerId);
      }

      this.debug(`Message ${message.id} processed successfully`);

      return { isValid: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.debug('Error processing incoming message:', error);
      this.eventHandlers.onMessageInvalid?.(errorMessage, data);
      return { isValid: false, error: errorMessage };
    }
  }

  /**
   * Validate message size
   *
   * @param data - Data to validate
   * @returns True if size is within limits
   */
  private validateMessageSize(data: string | ArrayBuffer | object): boolean {
    const size = this.getDataSize(data);
    return size <= this.config.maxMessageSize;
  }

  /**
   * Get the size of data in bytes
   *
   * @param data - Data to measure
   * @returns Size in bytes
   */
  private getDataSize(data: string | ArrayBuffer | object): number {
    if (typeof data === 'string') {
      return new Blob([data]).size;
    } else if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (typeof data === 'object') {
      return new Blob([JSON.stringify(data)]).size;
    }
    return 0;
  }

  /**
   * Check if data is a delivery confirmation
   *
   * @param data - Data to check
   * @returns True if data is a delivery confirmation
   */
  private isDeliveryConfirmation(data: unknown): data is { type: 'delivery-confirmation'; data: { messageId: string; recipientPeerId: string } } {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return (
      obj.type === 'delivery-confirmation' &&
      typeof obj.data === 'object' &&
      obj.data !== null &&
      typeof (obj.data as Record<string, unknown>).messageId === 'string' &&
      typeof (obj.data as Record<string, unknown>).recipientPeerId === 'string'
    );
  }

  /**
   * Handle delivery confirmation
   *
   * @param data - Delivery confirmation data
   */
  private handleDeliveryConfirmation(data: { type: 'delivery-confirmation'; data: { messageId: string; recipientPeerId: string } }): void {
    const { messageId, recipientPeerId } = data.data;
    this.debug(`Received delivery confirmation for message ${messageId} from ${recipientPeerId}`);
    this.eventHandlers.onDeliveryConfirmation?.(messageId, recipientPeerId);
  }

  /**
   * Deserialize incoming message
   *
   * @param data - Raw message data
   * @returns Deserialized broadcast message or null
   */
  private deserializeMessage(data: string | ArrayBuffer | Buffer | object): BroadcastMessagePayload | null {
    // Handle Buffer from simple-peer
    let processedData = data;
    if (Buffer.isBuffer(data)) {
      processedData = data.toString('utf-8');
    }

    return deserializeMessage(processedData as string | object);
  }

  /**
   * Validate broadcast message structure
   *
   * @param message - Message to validate
   * @returns True if valid
   */
  private validateBroadcastMessage(message: BroadcastMessagePayload): boolean {
    return isValidBroadcastMessage(message);
  }

  /**
   * Convert broadcast message to domain message type
   *
   * @param broadcastMessage - Broadcast message payload
   * @param peerId - Peer ID who sent the message
   * @returns Domain message or null
   */
  private convertToDomainMessage(
    broadcastMessage: BroadcastMessagePayload,
    peerId: string
  ): Message | null {
    try {
      const baseMessage = {
        id: broadcastMessage.id,
        peerId,
        timestamp: new Date(broadcastMessage.timestamp),
      };

      let content: TextMessageContent | FileMessageContent | SystemMessageContent;

      if (broadcastMessage.type === 'text' || broadcastMessage.type === 'system') {
        content = {
          type: broadcastMessage.type,
          content: broadcastMessage.content,
        } as TextMessageContent | SystemMessageContent;
      } else {
        // Unknown message type
        this.debug(`Unknown message type: ${broadcastMessage.type}`);
        return null;
      }

      const message: Message = {
        ...baseMessage,
        content,
        type: broadcastMessage.type,
      };

      return message;
    } catch (error) {
      this.debug('Error converting message:', error);
      return null;
    }
  }

  /**
   * Send delivery confirmation back to sender
   *
   * @param messageId - Message ID to confirm
   * @param peerId - Peer ID to send confirmation to
   */
  private sendDeliveryConfirmation(messageId: string, peerId: string): void {
    this.debug(`Sending delivery confirmation for message ${messageId} to peer ${peerId}`);
    // Note: The actual sending is handled by the caller through a callback
    // This method is a placeholder for the logic
  }

  /**
   * Get message history metadata
   *
   * @param messageId - Message ID
   * @returns Metadata or undefined
   */
  public getMessageMetadata(messageId: string): ReceivedMessageMetadata | undefined {
    return this.messageHistory.get(messageId);
  }

  /**
   * Get all message history
   *
   * @returns Map of message ID to metadata
   */
  public getAllMessageMetadata(): Map<string, ReceivedMessageMetadata> {
    return new Map(this.messageHistory);
  }

  /**
   * Clear message history
   */
  public clearHistory(): void {
    this.messageHistory.clear();
    this.debug('Message history cleared');
  }

  /**
   * Update event handlers
   *
   * @param handlers - New event handlers
   */
  public updateEventHandlers(handlers: Partial<MessageReceiverEvents>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    this.debug('Event handlers updated');
  }

  /**
   * Destroy the message receiver and cleanup resources
   */
  public destroy(): void {
    this.debug('Destroying MessageReceiver');
    this.messageHistory.clear();
    this.debug('MessageReceiver destroyed');
  }

  /**
   * Debug logging
   *
   * @param message - Message to log
   * @param data - Optional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[MessageReceiver] ${message}`, data);
      } else {
        console.log(`[MessageReceiver] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create a message receiver with default configuration
 *
 * @param eventHandlers - Event handlers for message processing
 * @param config - Optional configuration
 * @returns Configured message receiver instance
 */
export function createMessageReceiver(
  eventHandlers: MessageReceiverEvents,
  config?: MessageReceiverConfig
): MessageReceiver {
  return new MessageReceiver(eventHandlers, config);
}

/**
 * Helper function to validate incoming message data
 *
 * @param data - Raw data to validate
 * @returns True if data appears to be a valid message
 */
export function isValidMessageData(data: unknown): boolean {
  // Check if it's a delivery confirmation
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (obj.type === 'delivery-confirmation') {
      return true;
    }
  }

  // Check if it's a broadcast message
  const message = typeof data === 'string' || typeof data === 'object' 
    ? deserializeMessage(data as string | object) 
    : null;
  return message !== null;
}

/**
 * Helper function to extract message type from raw data
 *
 * @param data - Raw message data
 * @returns Message type or null if invalid
 */
export function extractMessageType(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Check for delivery confirmation
  if (obj.type === 'delivery-confirmation') {
    return 'delivery-confirmation';
  }

  // Check for broadcast message
  const message = deserializeMessage(data as string | object);
  if (message) {
    return message.type;
  }

  return null;
}

export default MessageReceiver;
