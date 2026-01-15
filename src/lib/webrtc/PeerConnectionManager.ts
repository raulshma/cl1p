/**
 * WebRTC Peer Connection Manager
 *
 * A reusable manager for handling WebRTC peer connections using simple-peer library.
 * Provides connection creation, state management, and cleanup for peer-to-peer communication.
 */

import SimplePeer from 'simple-peer';
import type {
  PeerRole,
  WebRTCPeerConfig,
  WebRTCConnectionEvents,
  WebRTCPeerManagerConfig,
  ConnectionState,
} from '@/types';

// Type-safe event handler - using eslint-disable for this specific line since
// we need flexibility for various callback signatures while avoiding the generic Function type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export class PeerConnectionManager {
  private peers: Map<string, SimplePeer.Instance>;
  private peerStates: Map<string, ConnectionState>;
  private eventHandlers: Map<keyof WebRTCConnectionEvents, Set<EventHandler>>;
  private peerEventHandlers: Map<string, Map<keyof WebRTCConnectionEvents, Set<EventHandler>>>;
  private config: Required<WebRTCPeerManagerConfig>;
  private heartbeatIntervals: Map<string, NodeJS.Timeout>;
  private connectionTimeouts: Map<string, NodeJS.Timeout>;
  private retryAttempts: Map<string, number>;
  private peerConfigs: Map<string, { role: PeerRole; config?: WebRTCPeerConfig }>;
  private isDestroyed: boolean = false;

  constructor(config: WebRTCPeerManagerConfig = {}) {
    this.peers = new Map();
    this.peerStates = new Map();
    this.eventHandlers = new Map();
    this.peerEventHandlers = new Map();
    this.heartbeatIntervals = new Map();
    this.connectionTimeouts = new Map();
    this.retryAttempts = new Map();
    this.peerConfigs = new Map();

    // Default configuration
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      connectionTimeout: config.connectionTimeout ?? 15000,
      enableExponentialBackoff: config.enableExponentialBackoff ?? true,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      maxRetryDelay: config.maxRetryDelay ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      debug: config.debug ?? false,
    };

    this.debug('PeerConnectionManager initialized', this.config);
  }

  /**
   * Create a new WebRTC peer connection
   * @param peerId - Unique identifier for the peer
   * @param role - Role of the peer ('initiator' or 'receiver')
   * @param config - Optional configuration for the peer connection
   */
  public createPeer(peerId: string, role: PeerRole, config?: WebRTCPeerConfig): void {
    if (this.isDestroyed) {
      throw new Error('PeerConnectionManager has been destroyed');
    }

    if (this.peers.has(peerId)) {
      this.debug(`Peer ${peerId} already exists, removing old peer`);
      this.removePeer(peerId);
    }

    try {
      const peerConfig: WebRTCPeerConfig = {
        initiator: role === 'initiator',
        ...config,
      };

      const peer = new SimplePeer(peerConfig);

      // Set initial state
      this.peerStates.set(peerId, 'connecting');
      this.peers.set(peerId, peer);

      // Store peer configuration for potential retries
      this.peerConfigs.set(peerId, { role, config });

      // Initialize retry counter
      this.retryAttempts.set(peerId, 0);

      // Set up peer event handlers
      this.setupPeerEventHandlers(peerId, peer);

      // Start connection timeout if configured
      if (this.config.connectionTimeout > 0) {
        this.startConnectionTimeout(peerId);
      }

      // Start heartbeat if enabled
      if (this.config.heartbeatInterval > 0) {
        this.startHeartbeat(peerId);
      }

      this.debug(`Peer ${peerId} created as ${role}`, peerConfig);
    } catch (error) {
      this.debug(`Error creating peer ${peerId}:`, error);
      this.peerStates.set(peerId, 'failed');
      throw error;
    }
  }

  /**
   * Get a peer instance by ID
   * @param peerId - Unique identifier for the peer
   * @returns The SimplePeer instance or null if not found
   */
  public getPeer(peerId: string): SimplePeer.Instance | null {
    return this.peers.get(peerId) || null;
  }

  /**
   * Remove a peer connection
   * @param peerId - Unique identifier for the peer
   */
  public removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);

    if (peer) {
      // Clean up peer
      peer.removeAllListeners();
      peer.destroy();

      this.peers.delete(peerId);
      this.peerStates.delete(peerId);
      this.peerEventHandlers.delete(peerId);
      this.peerConfigs.delete(peerId);
      this.retryAttempts.delete(peerId);

      // Clear heartbeat
      const heartbeat = this.heartbeatIntervals.get(peerId);
      if (heartbeat) {
        clearInterval(heartbeat);
        this.heartbeatIntervals.delete(peerId);
      }

      // Clear connection timeout
      const timeout = this.connectionTimeouts.get(peerId);
      if (timeout) {
        clearTimeout(timeout);
        this.connectionTimeouts.delete(peerId);
      }

      this.debug(`Peer ${peerId} removed`);
    }
  }

  /**
   * Remove all peer connections
   */
  public removeAllPeers(): void {
    this.debug('Removing all peers');

    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }
  }

  /**
   * Get all peer instances
   * @returns Map of peer ID to SimplePeer instance
   */
  public getAllPeers(): Map<string, SimplePeer.Instance> {
    return new Map(this.peers);
  }

  /**
   * Check if a peer exists
   * @param peerId - Unique identifier for the peer
   * @returns True if peer exists
   */
  public hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  /**
   * Connect to a peer using signaling data
   * @param peerId - Unique identifier for the peer
   * @param signalData - Signaling data from the remote peer
   */
  public connect(peerId: string, signalData: SimplePeer.SignalData): void {
    const peer = this.peers.get(peerId);

    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    try {
      peer.signal(signalData);
      this.debug(`Signal sent to peer ${peerId}`);
    } catch (error) {
      this.debug(`Error signaling peer ${peerId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from a specific peer
   * @param peerId - Unique identifier for the peer
   */
  public disconnect(peerId: string): void {
    const peer = this.peers.get(peerId);

    if (peer) {
      peer.destroy();
      this.debug(`Peer ${peerId} disconnected`);
    }
  }

  /**
   * Disconnect from all peers
   */
  public disconnectAll(): void {
    this.debug('Disconnecting all peers');

    for (const [peerId, peer] of this.peers) {
      try {
        peer.destroy();
        this.debug(`Peer ${peerId} disconnected`);
      } catch (error) {
        this.debug(`Error disconnecting peer ${peerId}:`, error);
      }
    }
  }

  /**
   * Get the connection state of a peer
   * @param peerId - Unique identifier for the peer
   * @returns The connection state or null if peer not found
   */
  public getConnectionState(peerId: string): ConnectionState | null {
    return this.peerStates.get(peerId) || null;
  }

  /**
   * Send data to a specific peer
   * @param peerId - Unique identifier for the peer
   * @param data - Data to send (will be JSON serialized if object)
   * @returns True if data was sent successfully
   */
  public send(peerId: string, data: string | ArrayBuffer | object): boolean {
    const peer = this.peers.get(peerId);

    if (!peer) {
      this.debug(`Cannot send: Peer ${peerId} not found`);
      return false;
    }

    const state = this.peerStates.get(peerId);
    if (state !== 'connected') {
      this.debug(`Cannot send: Peer ${peerId} is not connected (state: ${state})`);
      return false;
    }

    try {
      // Serialize objects to JSON
      const payload = typeof data === 'object' ? JSON.stringify(data) : data;
      peer.send(payload);
      this.debug(`Data sent to peer ${peerId}`);
      return true;
    } catch (error) {
      this.debug(`Error sending data to peer ${peerId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast data to all connected peers
   * @param data - Data to broadcast
   * @param excludePeerId - Optional peer ID to exclude from broadcast
   */
  public broadcast(data: string | ArrayBuffer | object, excludePeerId?: string): void {
    this.debug('Broadcasting data to all peers', { excludePeerId });

    for (const [peerId] of this.peers) {
      if (peerId === excludePeerId) continue;

      const state = this.peerStates.get(peerId);
      if (state === 'connected') {
        this.send(peerId, data);
      }
    }
  }

  /**
   * Register a global event handler
   * @param event - Event name
   * @param callback - Event handler function
   */
  public on(event: keyof WebRTCConnectionEvents, callback: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(callback);
    this.debug(`Global handler registered for event: ${String(event)}`);
  }

  /**
   * Unregister a global event handler
   * @param event - Event name
   * @param callback - Event handler function
   */
  public off(event: keyof WebRTCConnectionEvents, callback: EventHandler): void {
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.delete(callback);
      this.debug(`Global handler removed for event: ${String(event)}`);
    }
  }

  /**
   * Register a peer-specific event handler
   * @param peerId - Unique identifier for the peer
   * @param event - Event name
   * @param callback - Event handler function
   */
  public onPeerEvent(peerId: string, event: keyof WebRTCConnectionEvents, callback: EventHandler): void {
    if (!this.peerEventHandlers.has(peerId)) {
      this.peerEventHandlers.set(peerId, new Map());
    }

    const peerHandlers = this.peerEventHandlers.get(peerId)!;

    if (!peerHandlers.has(event)) {
      peerHandlers.set(event, new Set());
    }

    peerHandlers.get(event)!.add(callback);
    this.debug(`Peer ${peerId} handler registered for event: ${String(event)}`);
  }

  /**
   * Destroy the peer connection manager and cleanup all resources
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.debug('Destroying PeerConnectionManager');

    // Remove all peers
    this.removeAllPeers();

    // Clear all event handlers
    this.eventHandlers.clear();
    this.peerEventHandlers.clear();

    // Clear all heartbeats
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();

    // Clear all connection timeouts
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.connectionTimeouts.clear();

    // Clear configuration maps
    this.peerConfigs.clear();
    this.retryAttempts.clear();

    this.isDestroyed = true;

    this.debug('PeerConnectionManager destroyed');
  }

  /**
   * Set up event handlers for a specific peer
   * @param peerId - Unique identifier for the peer
   * @param peer - SimplePeer instance
   */
  private setupPeerEventHandlers(peerId: string, peer: SimplePeer.Instance): void {
    peer.on('signal', (data) => {
      this.emit('signal', data, peerId);
      this.emitPeerEvent(peerId, 'signal', data);
    });

    peer.on('connect', () => {
      const previousState = this.peerStates.get(peerId);
      const wasReconnecting = previousState === 'reconnecting';
      const attempts = this.retryAttempts.get(peerId) || 0;

      this.peerStates.set(peerId, 'connected');
      this.emit('connect', undefined, peerId);
      this.emitPeerEvent(peerId, 'connect', undefined);
      this.debug(`Peer ${peerId} connected`);

      // Emit reconnection success event if this was a reconnection
      if (wasReconnecting) {
        this.emit('reconnectSuccess', { peerId, attempts }, peerId);
        this.emitPeerEvent(peerId, 'reconnectSuccess', { attempts });
        this.debug(`Peer ${peerId} reconnected successfully after ${attempts} attempts`);
      }

      // Clear connection timeout on successful connection
      this.clearConnectionTimeout(peerId);

      // Reset retry attempts on successful connection
      this.retryAttempts.set(peerId, 0);
    });

    peer.on('data', (data) => {
      this.emit('data', data, peerId);
      this.emitPeerEvent(peerId, 'data', data);
    });

    peer.on('stream', (stream) => {
      this.emit('stream', stream, peerId);
      this.emitPeerEvent(peerId, 'stream', stream);
    });

    peer.on('track', (track, stream) => {
      this.emit('track', { track, stream }, peerId);
      this.emitPeerEvent(peerId, 'track', { track, stream });
    });

    peer.on('close', () => {
      this.peerStates.set(peerId, 'disconnected');
      this.emit('close', undefined, peerId);
      this.emitPeerEvent(peerId, 'close', undefined);
      this.debug(`Peer ${peerId} closed`);

      // Clear connection timeout on close
      this.clearConnectionTimeout(peerId);
    });

    peer.on('error', (error) => {
      this.peerStates.set(peerId, 'failed');
      this.emit('error', error, peerId);
      this.emitPeerEvent(peerId, 'error', error);
      this.debug(`Peer ${peerId} error:`, error);

      // Clear connection timeout on error
      this.clearConnectionTimeout(peerId);

      // Attempt to retry connection
      this.handleConnectionError(peerId, error);
    });

    // ICE state changes
    peer.on('iceStateChange', (iceState) => {
      this.emit('iceStateChange', iceState, peerId);
      this.emitPeerEvent(peerId, 'iceStateChange', iceState);
      this.debug(`Peer ${peerId} ICE state: ${iceState}`);
    });

    // Peer state changes
    peer.on('stateChange', (state) => {
      this.emit('stateChange', state, peerId);
      this.emitPeerEvent(peerId, 'stateChange', state);
      this.debug(`Peer ${peerId} state: ${state}`);
    });
  }

  /**
   * Emit a global event
   * @param event - Event name
   * @param data - Event data
   * @param peerId - Peer ID that triggered the event
   */
  private emit(event: keyof WebRTCConnectionEvents, data: unknown, peerId: string): void {
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data, peerId);
        } catch (error) {
          this.debug(`Error in global handler for ${String(event)}:`, error);
        }
      }
    }
  }

  /**
   * Emit a peer-specific event
   * @param peerId - Unique identifier for the peer
   * @param event - Event name
   * @param data - Event data
   */
  private emitPeerEvent(peerId: string, event: keyof WebRTCConnectionEvents, data: unknown): void {
    const peerHandlers = this.peerEventHandlers.get(peerId);

    if (peerHandlers) {
      const handlers = peerHandlers.get(event);

      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            this.debug(`Error in peer ${peerId} handler for ${String(event)}:`, error);
          }
        }
      }
    }
  }

  /**
   * Start heartbeat for a peer
   * @param peerId - Unique identifier for the peer
   */
  private startHeartbeat(peerId: string): void {
    const heartbeat = setInterval(() => {
      const peer = this.peers.get(peerId);
      if (peer && this.peerStates.get(peerId) === 'connected') {
        // Send a ping message
        try {
          peer.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          this.debug(`Heartbeat sent to peer ${peerId}`);
        } catch (error) {
          this.debug(`Heartbeat failed for peer ${peerId}:`, error);
          clearInterval(heartbeat);
          this.heartbeatIntervals.delete(peerId);
        }
      }
    }, this.config.heartbeatInterval);

    this.heartbeatIntervals.set(peerId, heartbeat);
  }

  /**
   * Start connection timeout for a peer
   * @param peerId - Unique identifier for the peer
   */
  private startConnectionTimeout(peerId: string): void {
    const timeout = setTimeout(() => {
      const state = this.peerStates.get(peerId);
      if (state === 'connecting' || state === 'reconnecting') {
        this.debug(`Connection timeout for peer ${peerId}`);
        this.handleConnectionTimeout(peerId);
      }
    }, this.config.connectionTimeout);

    this.connectionTimeouts.set(peerId, timeout);
    this.debug(`Connection timeout started for peer ${peerId} (${this.config.connectionTimeout}ms)`);
  }

  /**
   * Clear connection timeout for a peer
   * @param peerId - Unique identifier for the peer
   */
  private clearConnectionTimeout(peerId: string): void {
    const timeout = this.connectionTimeouts.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(peerId);
      this.debug(`Connection timeout cleared for peer ${peerId}`);
    }
  }

  /**
   * Handle connection timeout
   * @param peerId - Unique identifier for the peer
   */
  private handleConnectionTimeout(peerId: string): void {
    this.debug(`Handling connection timeout for peer ${peerId}`);

    // Attempt to retry connection
    this.retryConnection(peerId);
  }

  /**
   * Manually trigger reconnection for a specific peer
   * @param peerId - Unique identifier for the peer to reconnect
   * @returns True if reconnection was triggered successfully
   */
  public reconnect(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    const state = this.peerStates.get(peerId);

    if (!peer) {
      this.debug(`Cannot reconnect: Peer ${peerId} not found`);
      return false;
    }

    // Only allow reconnection for disconnected or failed peers
    if (state !== 'disconnected' && state !== 'failed') {
      this.debug(`Cannot reconnect: Peer ${peerId} is not in a reconnectable state (current: ${state})`);
      return false;
    }

    this.debug(`Manual reconnection triggered for peer ${peerId}`);

    // Reset retry attempts to allow a fresh reconnection attempt
    this.retryAttempts.set(peerId, 0);

    // Emit reconnection started event
    this.emit('reconnecting', { peerId, error: 'Manual reconnection' }, peerId);
    this.emitPeerEvent(peerId, 'reconnecting', { error: 'Manual reconnection' });

    // Trigger reconnection
    this.retryConnection(peerId);

    return true;
  }

  /**
   * Handle connection error with retry logic
   * @param peerId - Unique identifier for the peer
   * @param error - Error that occurred
   */
  private handleConnectionError(peerId: string, error: Error): void {
    this.debug(`Handling connection error for peer ${peerId}:`, error);

    // Emit reconnection started event
    this.emit('reconnecting', { peerId, error: error.message }, peerId);
    this.emitPeerEvent(peerId, 'reconnecting', { error: error.message });

    // Attempt to retry connection
    this.retryConnection(peerId);
  }

  /**
   * Retry connection with exponential backoff
   * @param peerId - Unique identifier for the peer
   */
  private retryConnection(peerId: string): void {
    const currentAttempts = this.retryAttempts.get(peerId) || 0;

    if (currentAttempts >= this.config.maxRetries) {
      this.debug(`Max retries (${this.config.maxRetries}) reached for peer ${peerId}`);
      this.peerStates.set(peerId, 'failed');

      // Emit reconnection failed event
      this.emit('reconnectFailed', {
        peerId,
        attempts: currentAttempts,
        reason: 'Max retries exceeded'
      }, peerId);
      this.emitPeerEvent(peerId, 'reconnectFailed', {
        attempts: currentAttempts,
        reason: 'Max retries exceeded'
      });

      this.emit('error', new Error(`Max retries exceeded for peer ${peerId}`), peerId);
      return;
    }

    // Increment retry counter
    this.retryAttempts.set(peerId, currentAttempts + 1);

    // Calculate delay with exponential backoff
    const delay = this.calculateRetryDelay(currentAttempts);

    this.debug(
      `Retrying connection for peer ${peerId} (attempt ${currentAttempts + 1}/${this.config.maxRetries}) after ${delay}ms`
    );

    // Set state to reconnecting
    this.peerStates.set(peerId, 'reconnecting');

    // Schedule retry
    setTimeout(() => {
      // Check if manager is destroyed or peer was removed
      if (this.isDestroyed || !this.peers.has(peerId)) {
        this.debug(`Skipping retry for peer ${peerId} (manager destroyed or peer removed)`);
        return;
      }

      // Get stored configuration
      const peerConfig = this.peerConfigs.get(peerId);
      if (!peerConfig) {
        this.debug(`Cannot retry peer ${peerId}: configuration not found`);
        return;
      }

      // Remove old peer and create new one
      this.removePeer(peerId);

      try {
        // Create new peer with same configuration
        this.createPeer(peerId, peerConfig.role, peerConfig.config);
        this.debug(`Retry connection initiated for peer ${peerId}`);
      } catch (error) {
        this.debug(`Error during retry for peer ${peerId}:`, error);
        this.peerStates.set(peerId, 'failed');

        // Emit reconnection failed event
        this.emit('reconnectFailed', {
          peerId,
          attempts: currentAttempts + 1,
          reason: 'Connection error'
        }, peerId);
        this.emitPeerEvent(peerId, 'reconnectFailed', {
          attempts: currentAttempts + 1,
          reason: 'Connection error'
        });
      }
    }, delay);
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param attempt - Current retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attempt: number): number {
    let delay: number;

    if (this.config.enableExponentialBackoff) {
      // Exponential backoff: delay = baseDelay * (multiplier ^ attempt)
      delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt);
    } else {
      // Linear delay
      delay = this.config.retryDelay;
    }

    // Cap at max retry delay
    delay = Math.min(delay, this.config.maxRetryDelay);

    return delay;
  }

  /**
   * Debug logging
   * @param message - Message to log
   * @param data - Optional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[PeerConnectionManager] ${message}`, data);
      } else {
        console.log(`[PeerConnectionManager] ${message}`);
      }
    }
  }
}

export default PeerConnectionManager;
