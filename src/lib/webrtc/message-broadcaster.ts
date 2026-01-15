/**
 * WebRTC Message Broadcaster
 *
 * Provides functionality to broadcast text messages to all connected peers
 * via WebRTC data channels with message serialization and delivery confirmation.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Broadcast message types
 */
export type BroadcastMessageType = 'text' | 'system';

/**
 * Broadcast message payload structure
 */
export interface BroadcastMessagePayload {
  id: string;
  type: BroadcastMessageType;
  content: string;
  senderId: string;
  timestamp: number;
  requiresConfirmation: boolean;
}

/**
 * Delivery confirmation structure
 */
export interface DeliveryConfirmation {
  messageId: string;
  recipientPeerId: string;
  deliveredAt: number;
  success: boolean;
  error?: string;
}

/**
 * Message broadcast result
 */
export interface BroadcastResult {
  messageId: string;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingConfirmations: number;
  timestamp: number;
}

/**
 * Configuration for message broadcaster
 */
export interface MessageBroadcasterConfig {
  enableDeliveryConfirmation?: boolean;
  confirmationTimeout?: number;
  maxRetries?: number;
  debug?: boolean;
}

/**
 * Message Broadcaster Class
 *
 * Handles broadcasting text messages to all connected WebRTC peers
 * with delivery confirmation and retry logic.
 */
export class MessageBroadcaster {
  private deliveryCallbacks: Map<string, Set<(confirmation: DeliveryConfirmation) => void>>;
  private pendingConfirmations: Map<string, Map<string, NodeJS.Timeout>>;
  private config: Required<MessageBroadcasterConfig>;
  private messageHistory: Map<string, BroadcastResult>;

  constructor(config: MessageBroadcasterConfig = {}) {
    this.deliveryCallbacks = new Map();
    this.pendingConfirmations = new Map();
    this.messageHistory = new Map();

    this.config = {
      enableDeliveryConfirmation: config.enableDeliveryConfirmation ?? true,
      confirmationTimeout: config.confirmationTimeout ?? 5000,
      maxRetries: config.maxRetries ?? 3,
      debug: config.debug ?? false,
    };

    this.debug('MessageBroadcaster initialized', this.config);
  }

  /**
   * Broadcast a text message to all connected peers
   *
   * @param data - The data to broadcast (from PeerConnectionManager.broadcast)
   * @param peerIds - Array of connected peer IDs
   * @param localPeerId - Local peer ID for message identification
   * @param sendCallback - Callback function to send data to individual peers
   * @returns Promise resolving to broadcast result
   */
  public async broadcastTextMessage(
    data: string | object,
    peerIds: string[],
    localPeerId: string,
    sendCallback: (peerId: string, data: BroadcastMessagePayload) => boolean
  ): Promise<BroadcastResult> {
    const messageId = uuidv4();
    const timestamp = Date.now();

    this.debug(`Broadcasting message ${messageId} to ${peerIds.length} peers`);

    // Create broadcast payload
    const payload: BroadcastMessagePayload = {
      id: messageId,
      type: 'text',
      content: typeof data === 'string' ? data : JSON.stringify(data),
      senderId: localPeerId,
      timestamp,
      requiresConfirmation: this.config.enableDeliveryConfirmation,
    };

    // Initialize result tracking
    const result: BroadcastResult = {
      messageId,
      totalRecipients: peerIds.length,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingConfirmations: 0,
      timestamp,
    };

    // Initialize confirmation tracking if enabled
    if (this.config.enableDeliveryConfirmation) {
      this.pendingConfirmations.set(messageId, new Map());
      this.deliveryCallbacks.set(messageId, new Set());
    }

    // Broadcast to all peers
    for (const peerId of peerIds) {
      try {
        const sent = sendCallback(peerId, payload);

        if (sent) {
          result.successfulDeliveries++;
          this.debug(`Message ${messageId} sent to peer ${peerId}`);

          // Set up confirmation timeout if enabled
          if (this.config.enableDeliveryConfirmation) {
            this.setupConfirmationTimeout(messageId, peerId);
            result.pendingConfirmations++;
          }
        } else {
          result.failedDeliveries++;
          this.debug(`Failed to send message ${messageId} to peer ${peerId}`);
        }
      } catch (error) {
        result.failedDeliveries++;
        this.debug(`Error sending message ${messageId} to peer ${peerId}:`, error);
      }
    }

    // Store result in history
    this.messageHistory.set(messageId, result);

    // If confirmation is disabled, return immediately
    if (!this.config.enableDeliveryConfirmation) {
      return result;
    }

    // Wait for all confirmations (with timeout)
    await this.waitForConfirmations(messageId, result);

    return result;
  }

  /**
   * Handle incoming delivery confirmation
   *
   * @param confirmation - Delivery confirmation from a peer
   */
  public handleDeliveryConfirmation(confirmation: DeliveryConfirmation): void {
    const { messageId, recipientPeerId } = confirmation;

    this.debug(`Received confirmation for message ${messageId} from peer ${recipientPeerId}`);

    // Clear pending confirmation timeout
    const pendingMap = this.pendingConfirmations.get(messageId);
    if (pendingMap) {
      const timeout = pendingMap.get(recipientPeerId);
      if (timeout) {
        clearTimeout(timeout);
        pendingMap.delete(recipientPeerId);
      }
    }

    // Trigger callbacks
    const callbacks = this.deliveryCallbacks.get(messageId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(confirmation);
        } catch (error) {
          this.debug(`Error in delivery confirmation callback:`, error);
        }
      });
    }

    // Update result
    const result = this.messageHistory.get(messageId);
    if (result && confirmation.success) {
      result.pendingConfirmations = Math.max(0, result.pendingConfirmations - 1);
    }
  }

  /**
   * Register a callback for delivery confirmations
   *
   * @param messageId - Message ID to listen for
   * @param callback - Callback function
   */
  public onDeliveryConfirmation(
    messageId: string,
    callback: (confirmation: DeliveryConfirmation) => void
  ): void {
    if (!this.deliveryCallbacks.has(messageId)) {
      this.deliveryCallbacks.set(messageId, new Set());
    }

    this.deliveryCallbacks.get(messageId)!.add(callback);
    this.debug(`Registered confirmation callback for message ${messageId}`);
  }

  /**
   * Remove a delivery confirmation callback
   *
   * @param messageId - Message ID
   * @param callback - Callback function to remove
   */
  public offDeliveryConfirmation(
    messageId: string,
    callback: (confirmation: DeliveryConfirmation) => void
  ): void {
    const callbacks = this.deliveryCallbacks.get(messageId);
    if (callbacks) {
      callbacks.delete(callback);
      this.debug(`Removed confirmation callback for message ${messageId}`);
    }
  }

  /**
   * Get broadcast result by message ID
   *
   * @param messageId - Message ID
   * @returns Broadcast result or undefined
   */
  public getBroadcastResult(messageId: string): BroadcastResult | undefined {
    return this.messageHistory.get(messageId);
  }

  /**
   * Get all broadcast results
   *
   * @returns Map of message ID to broadcast result
   */
  public getAllBroadcastResults(): Map<string, BroadcastResult> {
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
   * Setup confirmation timeout for a specific peer
   *
   * @param messageId - Message ID
   * @param peerId - Peer ID
   */
  private setupConfirmationTimeout(messageId: string, peerId: string): void {
    const timeout = setTimeout(() => {
      this.debug(`Confirmation timeout for message ${messageId} from peer ${peerId}`);

      // Create failure confirmation
      const failedConfirmation: DeliveryConfirmation = {
        messageId,
        recipientPeerId: peerId,
        deliveredAt: Date.now(),
        success: false,
        error: 'Confirmation timeout',
      };

      // Handle the failed confirmation
      this.handleDeliveryConfirmation(failedConfirmation);

      // Update result
      const result = this.messageHistory.get(messageId);
      if (result) {
        result.pendingConfirmations = Math.max(0, result.pendingConfirmations - 1);
      }
    }, this.config.confirmationTimeout);

    const pendingMap = this.pendingConfirmations.get(messageId);
    if (pendingMap) {
      pendingMap.set(peerId, timeout);
    }
  }

  /**
   * Wait for all delivery confirmations
   *
   * @param messageId - Message ID
   * @param result - Broadcast result to update
   */
  private async waitForConfirmations(
    messageId: string,
    result: BroadcastResult
  ): Promise<void> {
    const checkInterval = 100;
    const maxWaitTime = this.config.confirmationTimeout * this.config.maxRetries;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkConfirmations = () => {
        const elapsed = Date.now() - startTime;

        if (result.pendingConfirmations === 0 || elapsed >= maxWaitTime) {
          this.debug(
            `Confirmation wait complete for message ${messageId}: ` +
              `${result.pendingConfirmations} pending, ${elapsed}ms elapsed`
          );
          resolve();
        } else {
          setTimeout(checkConfirmations, checkInterval);
        }
      };

      checkConfirmations();
    });
  }

  /**
   * Destroy the message broadcaster and cleanup resources
   */
  public destroy(): void {
    this.debug('Destroying MessageBroadcaster');

    // Clear all confirmation timeouts
    for (const [_messageId, peerMap] of this.pendingConfirmations) {
      for (const timeout of peerMap.values()) {
        clearTimeout(timeout);
      }
    }
    this.pendingConfirmations.clear();

    // Clear all callbacks
    this.deliveryCallbacks.clear();

    // Clear history
    this.messageHistory.clear();

    this.debug('MessageBroadcaster destroyed');
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
        console.log(`[MessageBroadcaster] ${message}`, data);
      } else {
        console.log(`[MessageBroadcaster] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create a broadcast message
 *
 * @param content - Message content
 * @param senderId - Sender peer ID
 * @returns Broadcast message payload
 */
export function createBroadcastMessage(
  content: string,
  senderId: string
): BroadcastMessagePayload {
  return {
    id: uuidv4(),
    type: 'text',
    content,
    senderId,
    timestamp: Date.now(),
    requiresConfirmation: true,
  };
}

/**
 * Helper function to serialize a message for transmission
 *
 * @param message - Message to serialize
 * @returns JSON string
 */
export function serializeMessage(message: BroadcastMessagePayload): string {
  return JSON.stringify(message);
}

/**
 * Helper function to deserialize a received message
 *
 * @param data - Raw message data
 * @returns Deserialized message or null if invalid
 */
export function deserializeMessage(data: string | object): BroadcastMessagePayload | null {
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      if (isValidBroadcastMessage(parsed)) {
        return parsed;
      }
    } else if (isValidBroadcastMessage(data)) {
      return data;
    }
  } catch (error) {
    console.error('Error deserializing message:', error);
  }
  return null;
}

/**
 * Type guard for broadcast message validation
 *
 * @param data - Data to validate
 * @returns True if valid broadcast message
 */
export function isValidBroadcastMessage(data: unknown): data is BroadcastMessagePayload {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.type === 'text' || obj.type === 'system') &&
    typeof obj.content === 'string' &&
    typeof obj.senderId === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.requiresConfirmation === 'boolean'
  );
}

/**
 * Helper function to create delivery confirmation
 *
 * @param messageId - Message ID
 * @param recipientPeerId - Recipient peer ID
 * @param success - Whether delivery was successful
 * @param error - Optional error message
 * @returns Delivery confirmation
 */
export function createDeliveryConfirmation(
  messageId: string,
  recipientPeerId: string,
  success: boolean,
  error?: string
): DeliveryConfirmation {
  return {
    messageId,
    recipientPeerId,
    deliveredAt: Date.now(),
    success,
    error,
  };
}

export default MessageBroadcaster;
