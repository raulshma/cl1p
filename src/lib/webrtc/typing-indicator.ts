/**
 * WebRTC Typing Indicator
 *
 * Handles sending and receiving typing indicators via WebRTC data channels.
 * Provides visual feedback when a peer is typing in real-time.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Typing event types
 */
export type TypingEventType = 'typing-start' | 'typing-stop';

/**
 * Typing event payload structure
 */
export interface TypingEventPayload {
  id: string;
  type: TypingEventType;
  peerId: string;
  timestamp: number;
}

/**
 * Configuration for typing indicator
 */
export interface TypingIndicatorConfig {
  timeout?: number;
  debounceMs?: number;
  debug?: boolean;
}

/**
 * Typing Indicator Class
 *
 * Manages typing state and broadcasts typing events to connected peers
 */
export class TypingIndicator {
  private config: Required<TypingIndicatorConfig>;
  private localPeerId: string;
  private isTyping: boolean = false;
  private typingTimeout: NodeJS.Timeout | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private sendCallback: ((peerId: string, data: string | object) => boolean) | null = null;
  private peerIds: string[] = [];

  constructor(localPeerId: string, config: TypingIndicatorConfig = {}) {
    this.localPeerId = localPeerId;
    this.config = {
      timeout: config.timeout ?? 3000, // 3 seconds default timeout
      debounceMs: config.debounceMs ?? 300, // 300ms default debounce
      debug: config.debug ?? false,
    };

    this.debug('TypingIndicator initialized', { localPeerId, config: this.config });
  }

  /**
   * Set the send callback for broadcasting typing events
   * @param callback - Function to send data to peers
   */
  public setSendCallback(callback: (peerId: string, data: string | object) => boolean): void {
    this.sendCallback = callback;
    this.debug('Send callback set');
  }

  /**
   * Update the list of connected peer IDs
   * @param peerIds - Array of connected peer IDs
   */
  public updatePeerIds(peerIds: string[]): void {
    this.peerIds = peerIds;
    this.debug(`Peer IDs updated: ${peerIds.length} peers`);
  }

  /**
   * Update the local peer ID
   * @param peerId - New local peer ID
   */
  public setLocalPeerId(peerId: string): void {
    this.localPeerId = peerId;
    this.debug(`Local peer ID updated: ${peerId}`);
  }

  /**
   * Handle local user typing start
   * Debounced to avoid excessive event broadcasting
   */
  public onTypingStart(): void {
    if (this.isTyping) {
      return;
    }

    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce typing start event
    this.debounceTimeout = setTimeout(() => {
      this.isTyping = true;
      this.broadcastTypingEvent('typing-start');
      this.startTypingTimeout();
      this.debug('Typing started');
    }, this.config.debounceMs);
  }

  /**
   * Handle local user typing stop
   */
  public onTypingStop(): void {
    // Clear debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (!this.isTyping) {
      return;
    }

    this.isTyping = false;
    this.broadcastTypingEvent('typing-stop');
    this.clearTypingTimeout();
    this.debug('Typing stopped');
  }

  /**
   * Handle incoming typing event from a peer
   * @param data - Raw data from WebRTC
   * @returns Typing event payload or null if invalid
   */
  public handleIncomingTypingEvent(data: string | ArrayBuffer | object): TypingEventPayload | null {
    try {
      const event = this.deserializeTypingEvent(data);

      if (!event) {
        return null;
      }

      // Ignore events from self
      if (event.peerId === this.localPeerId) {
        return null;
      }

      this.debug(`Received typing event from peer ${event.peerId}: ${event.type}`);
      return event;
    } catch (error) {
      this.debug('Error handling incoming typing event:', error);
      return null;
    }
  }

  /**
   * Broadcast typing event to all connected peers
   * @param type - Typing event type
   */
  private broadcastTypingEvent(type: TypingEventType): void {
    if (!this.sendCallback || this.peerIds.length === 0) {
      this.debug('Cannot broadcast: no send callback or no peers');
      return;
    }

    const payload: TypingEventPayload = {
      id: uuidv4(),
      type,
      peerId: this.localPeerId,
      timestamp: Date.now(),
    };

    for (const peerId of this.peerIds) {
      try {
        this.sendCallback!(peerId, payload);
        this.debug(`Typing event sent to peer ${peerId}`);
      } catch (error) {
        this.debug(`Error sending typing event to peer ${peerId}:`, error);
      }
    }
  }

  /**
   * Start typing timeout to automatically stop typing after inactivity
   */
  private startTypingTimeout(): void {
    this.clearTypingTimeout();

    this.typingTimeout = setTimeout(() => {
      if (this.isTyping) {
        this.isTyping = false;
        this.broadcastTypingEvent('typing-stop');
        this.debug('Typing stopped due to timeout');
      }
    }, this.config.timeout);
  }

  /**
   * Clear typing timeout
   */
  private clearTypingTimeout(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  /**
   * Deserialize incoming typing event
   * @param data - Raw data from WebRTC
   * @returns Typing event payload or null if invalid
   */
  private deserializeTypingEvent(data: string | ArrayBuffer | Buffer | object): TypingEventPayload | null {
    // Handle Buffer from simple-peer
    let processedData: unknown = data;
    if (Buffer.isBuffer(data)) {
      processedData = data.toString('utf-8');
    }

    if (typeof processedData === 'string') {
      try {
        processedData = JSON.parse(processedData);
      } catch (error) {
        this.debug('Error parsing typing event JSON:', error);
        return null;
      }
    }

    if (!this.isValidTypingEvent(processedData)) {
      return null;
    }

    return processedData as TypingEventPayload;
  }

  /**
   * Validate typing event structure
   * @param data - Data to validate
   * @returns True if valid typing event
   */
  private isValidTypingEvent(data: unknown): data is TypingEventPayload {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      (obj.type === 'typing-start' || obj.type === 'typing-stop') &&
      typeof obj.peerId === 'string' &&
      typeof obj.timestamp === 'number'
    );
  }

  /**
   * Destroy the typing indicator and cleanup resources
   */
  public destroy(): void {
    this.debug('Destroying TypingIndicator');

    // Stop typing if active
    if (this.isTyping) {
      this.onTypingStop();
    }

    // Clear all timeouts
    this.clearTypingTimeout();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Clear references
    this.sendCallback = null;
    this.peerIds = [];

    this.debug('TypingIndicator destroyed');
  }

  /**
   * Debug logging
   * @param message - Message to log
   * @param data - Optional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[TypingIndicator] ${message}`, data);
      } else {
        console.log(`[TypingIndicator] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create a typing event payload
 * @param type - Typing event type
 * @param peerId - Peer ID
 * @returns Typing event payload
 */
export function createTypingEvent(
  type: TypingEventType,
  peerId: string
): TypingEventPayload {
  return {
    id: uuidv4(),
    type,
    peerId,
    timestamp: Date.now(),
  };
}

/**
 * Helper function to serialize a typing event for transmission
 * @param event - Typing event to serialize
 * @returns JSON string
 */
export function serializeTypingEvent(event: TypingEventPayload): string {
  return JSON.stringify(event);
}

/**
 * Helper function to check if data is a typing event
 * @param data - Data to check
 * @returns True if data is a typing event
 */
export function isTypingEvent(data: unknown): boolean {
  let processedData = data;
  if (typeof processedData === 'string') {
    try {
      processedData = JSON.parse(processedData);
    } catch {
      return false;
    }
  }

  if (typeof processedData !== 'object' || processedData === null) {
    return false;
  }

  const obj = processedData as Record<string, unknown>;
  return (
    (obj.type === 'typing-start' || obj.type === 'typing-stop') &&
    typeof obj.peerId === 'string'
  );
}

export default TypingIndicator;
