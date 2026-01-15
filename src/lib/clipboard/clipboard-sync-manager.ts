/**
 * Clipboard Sync Manager
 *
 * Handles synchronization of clipboard content across connected peers using the Clipboard API.
 * Monitors local clipboard changes and broadcasts them to connected peers.
 * Receives clipboard updates from remote peers and applies them with user consent.
 */

import { v4 as uuidv4 } from 'uuid';
import { createClipboardRateLimiter, type RateLimitResult } from '@/lib/utils/rate-limiter';

/**
 * Clipboard sync message types
 */
export type ClipboardSyncMessageType = 'clipboard-sync' | 'clipboard-request';

/**
 * Clipboard sync payload structure
 */
export interface ClipboardSyncPayload {
  id: string;
  type: ClipboardSyncMessageType;
  content: string;
  senderId: string;
  timestamp: number;
  mimeType?: string;
  requiresConfirmation: boolean;
}

/**
 * Clipboard sync configuration
 */
export interface ClipboardSyncConfig {
  enabled?: boolean;
  requirePermission?: boolean;
  autoSync?: boolean;
  syncInterval?: number;
  maxDataSize?: number;
  debug?: boolean;
}

/**
 * Clipboard sync events
 */
export interface ClipboardSyncEvents {
  onLocalClipboardChange: (content: string) => void;
  onRemoteClipboardUpdate: (content: string, senderId: string) => void;
  onSyncError: (error: Error) => void;
  onPermissionRequested: () => Promise<boolean>;
}

/**
 * Clipboard permission state
 */
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * Clipboard Sync Manager Class
 *
 * Manages clipboard synchronization across peers with proper permission handling.
 */
export class ClipboardSyncManager {
  private config: Required<ClipboardSyncConfig>;
  private eventHandlers: ClipboardSyncEvents;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastClipboardContent: string = '';
  private permissionState: PermissionState = 'unknown';
  private localPeerId: string;
  private clipboardRateLimiter: ReturnType<typeof createClipboardRateLimiter>;
  private lastBroadcastContent: string = '';
  private lastBroadcastTime: number = 0;

  constructor(
    localPeerId: string,
    eventHandlers: ClipboardSyncEvents,
    config: ClipboardSyncConfig = {}
  ) {
    this.localPeerId = localPeerId;
    this.eventHandlers = eventHandlers;

    this.config = {
      enabled: config.enabled ?? true,
      requirePermission: config.requirePermission ?? true,
      autoSync: config.autoSync ?? true,
      syncInterval: config.syncInterval ?? 1000, // Check every second by default
      maxDataSize: config.maxDataSize ?? 1024 * 1024, // 1MB default
      debug: config.debug ?? false,
    };

    // Initialize rate limiter for clipboard operations (1 per second)
    this.clipboardRateLimiter = createClipboardRateLimiter(this.config.debug);

    this.debug('ClipboardSyncManager initialized', this.config);
  }

  /**
   * Start monitoring clipboard for changes
   */
  public async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) {
      this.debug('Already monitoring clipboard');
      return true;
    }

    if (!this.config.enabled) {
      this.debug('Clipboard sync is disabled');
      return false;
    }

    // Check permissions if required
    if (this.config.requirePermission) {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        this.debug('Clipboard permission denied');
        return false;
      }
    }

    try {
      // Get initial clipboard content
      this.lastClipboardContent = await this.readClipboard();

      // Start monitoring interval
      this.monitoringInterval = setInterval(
        () => this.checkClipboardChange(),
        this.config.syncInterval
      );

      this.isMonitoring = true;
      this.debug('Started monitoring clipboard');
      return true;
    } catch (error) {
      this.debug('Error starting clipboard monitoring:', error);
      this.eventHandlers.onSyncError?.(error as Error);
      return false;
    }
  }

  /**
   * Stop monitoring clipboard
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.debug('Stopped monitoring clipboard');
  }

  /**
   * Check if clipboard monitoring is active
   */
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Request clipboard permission from user
   */
  public async requestPermission(): Promise<boolean> {
    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard) {
        this.debug('Clipboard API not available');
        return false;
      }

      // Check if we already handled permission this session (for incognito support)
      if (typeof sessionStorage !== 'undefined') {
        const sessionState = sessionStorage.getItem('clipboard-permission-state');
        if (sessionState === 'granted') {
          this.permissionState = 'granted';
          return true;
        }
        if (sessionState === 'denied') {
          this.permissionState = 'denied';
          return false;
        }
      }

      // Check current permission state
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
      this.permissionState = permission.state;

      if (permission.state === 'granted') {
        this.debug('Clipboard permission already granted');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('clipboard-permission-state', 'granted');
        }
        return true;
      }

      if (permission.state === 'denied') {
        this.debug('Clipboard permission denied');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('clipboard-permission-state', 'denied');
        }
        return false;
      }

      // Permission is prompt, ask user via event handler
      if (this.eventHandlers.onPermissionRequested) {
        const granted = await this.eventHandlers.onPermissionRequested();
        if (granted) {
          this.permissionState = 'granted';
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('clipboard-permission-state', 'granted');
          }
          return true;
        }
      }

      this.permissionState = 'denied';
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('clipboard-permission-state', 'denied');
      }
      return false;
    } catch (error) {
      this.debug('Error requesting clipboard permission:', error);
      // Fallback: try to read clipboard to trigger permission prompt
      try {
        // Check session state first to avoid repeated prompts
        if (typeof sessionStorage !== 'undefined') {
          const alreadyPrompted = sessionStorage.getItem('clipboard-permission-dismissed');
          if (alreadyPrompted === 'true') {
            this.permissionState = 'denied';
            return false;
          }
        }
        
        await navigator.clipboard.readText();
        this.permissionState = 'granted';
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('clipboard-permission-state', 'granted');
        }
        return true;
      } catch {
        this.permissionState = 'denied';
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('clipboard-permission-state', 'denied');
          sessionStorage.setItem('clipboard-permission-dismissed', 'true');
        }
        return false;
      }
    }
  }

  /**
   * Handle incoming clipboard sync from remote peer
   */
  public async handleRemoteClipboardSync(payload: ClipboardSyncPayload): Promise<void> {
    this.debug(`Received clipboard sync from peer ${payload.senderId}`);

    try {
      // Validate payload
      if (!this.isValidClipboardPayload(payload)) {
        throw new Error('Invalid clipboard sync payload');
      }

      // Update local clipboard if content is different
      if (payload.content !== this.lastClipboardContent) {
        // Trigger event handler
        this.eventHandlers.onRemoteClipboardUpdate?.(
          payload.content,
          payload.senderId
        );

        // Update last known content
        this.lastClipboardContent = payload.content;

        this.debug(`Remote clipboard updated: ${payload.content.substring(0, 50)}...`);
      }
    } catch (error) {
      this.debug('Error handling remote clipboard sync:', error);
      this.eventHandlers.onSyncError?.(error as Error);
    }
  }

  /**

  /**
   * Read current clipboard content
   */
  private async readClipboard(): Promise<string> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      if (typeof document !== 'undefined' && !document.hasFocus()) {
        this.debug('Skipping clipboard read: document not focused');
        return this.lastClipboardContent;
      }

      const content = await navigator.clipboard.readText();
      return content;
    } catch (error) {
      if (this.isNotAllowedError(error)) {
        this.debug('Clipboard read blocked (not focused), returning last content');
        return this.lastClipboardContent;
      }
      this.debug('Error reading clipboard:', error);
      throw error;
    }
  }

  /**
   * Write content to clipboard
   */
  public async writeToClipboard(content: string): Promise<boolean> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      await navigator.clipboard.writeText(content);
      this.lastClipboardContent = content;
      this.debug('Wrote to clipboard:', content.substring(0, 50));
      return true;
    } catch (error) {
      this.debug('Error writing to clipboard:', error);
      this.eventHandlers.onSyncError?.(error as Error);
      return false;
    }
  }

  /**
   * Check for clipboard changes
   */
  private async checkClipboardChange(): Promise<void> {
    try {
      if (typeof document !== 'undefined' && !document.hasFocus()) {
        return;
      }

      const currentContent = await this.readClipboard();

      // Check if content has changed
      if (currentContent !== this.lastClipboardContent) {
        this.debug('Clipboard content changed');

        // Update last known content
        this.lastClipboardContent = currentContent;

        // Trigger event handler with rate limiting
        this.triggerLocalChange(currentContent);
      }
    } catch (error) {
      if (this.isNotAllowedError(error)) {
        return;
      }
      this.debug('Error checking clipboard change:', error);
      // Don't trigger error event for periodic checks, just log
    }
  }

  /**
   * Check if a clipboard error is due to focus/permission restrictions
   */
  private isNotAllowedError(error: unknown): boolean {
    if (!error) return false;
    const maybe = error as { name?: string; message?: string };
    return maybe.name === 'NotAllowedError' ||
      (typeof maybe.message === 'string' && maybe.message.includes('Document is not focused'));
  }

  /**
   * Trigger local clipboard change event with rate limiting
   */
  private triggerLocalChange(content: string): void {
    // Check rate limit
    const rateLimitResult = this.clipboardRateLimiter.checkLimit();

    if (!rateLimitResult.allowed) {
      this.debug('Clipboard update rate limited', {
        retryAfter: rateLimitResult.retryAfter,
      });

      // Emit rate limit exceeded as a warning (non-blocking)
      this.eventHandlers.onSyncError?.(
        new Error(`Clipboard update rate limited. Try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 1000)}s`)
      );
      return;
    }

    // Rate limit check passed - trigger the event handler
    this.eventHandlers.onLocalClipboardChange?.(content);

    // Update last broadcast info
    this.lastBroadcastContent = content;
    this.lastBroadcastTime = Date.now();

    this.debug('Clipboard change event triggered', {
      contentLength: content.length,
      remaining: rateLimitResult.remaining,
    });
  }

  /**
   * Create clipboard sync payload for broadcasting (with rate limiting)
   */
  public createSyncPayload(content: string): ClipboardSyncPayload {
    // Check rate limit before creating payload
    const rateLimitResult = this.clipboardRateLimiter.checkLimit();

    if (!rateLimitResult.allowed) {
      this.debug('Broadcast rate limited', {
        retryAfter: rateLimitResult.retryAfter,
      });
      throw new Error(
        `Clipboard broadcast rate limited. Try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 1000)}s`
      );
    }

    // Check if content is the same as last broadcast
    if (content === this.lastBroadcastContent) {
      const timeSinceLastBroadcast = Date.now() - this.lastBroadcastTime;
      if (timeSinceLastBroadcast < this.config.syncInterval) {
        this.debug('Duplicate content detected, skipping broadcast');
        throw new Error('Duplicate clipboard content - broadcast skipped');
      }
    }

    // Update last broadcast info
    this.lastBroadcastContent = content;
    this.lastBroadcastTime = Date.now();

    return {
      id: uuidv4(),
      type: 'clipboard-sync',
      content,
      senderId: this.localPeerId,
      timestamp: Date.now(),
      mimeType: 'text/plain',
      requiresConfirmation: true,
    };
  }

  /**
   * Check if a clipboard broadcast would be allowed under rate limit
   */
  public canBroadcast(): boolean {
    return this.clipboardRateLimiter.getRemaining() > 0;
  }

  /**
   * Get rate limit information for clipboard operations
   */
  public getRateLimitInfo(): RateLimitResult {
    const remaining = this.clipboardRateLimiter.getRemaining();
    const state = this.clipboardRateLimiter.getState();
    const windowElapsed = Date.now() - state.windowStart;

    return {
      allowed: remaining > 0,
      remaining,
      resetTime: Math.max(0, this.config.syncInterval - windowElapsed),
    };
  }

  /**
   * Validate clipboard sync payload
   */
  private isValidClipboardPayload(payload: unknown): payload is ClipboardSyncPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const obj = payload as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      obj.type === 'clipboard-sync' &&
      typeof obj.content === 'string' &&
      typeof obj.senderId === 'string' &&
      typeof obj.timestamp === 'number' &&
      typeof obj.requiresConfirmation === 'boolean'
    );
  }

  /**
   * Update local peer ID
   */
  public setLocalPeerId(peerId: string): void {
    this.localPeerId = peerId;
    this.debug(`Local peer ID updated to ${peerId}`);
  }

  /**
   * Get current permission state
   */
  public getPermissionState(): PermissionState {
    return this.permissionState;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ClipboardSyncConfig>): void {
    this.config = { ...this.config, ...config };
    this.debug('Configuration updated', this.config);

    // Restart monitoring if interval changed
    if (this.isMonitoring && config.syncInterval !== undefined) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Update event handlers
   */
  public updateEventHandlers(handlers: Partial<ClipboardSyncEvents>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    this.debug('Event handlers updated');
  }

  /**
   * Destroy the clipboard sync manager
   */
  public destroy(): void {
    this.debug('Destroying ClipboardSyncManager');
    this.stopMonitoring();
    this.debug('ClipboardSyncManager destroyed');
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[ClipboardSyncManager] ${message}`, data);
      } else {
        console.log(`[ClipboardSyncManager] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create a clipboard sync manager
 */
export function createClipboardSyncManager(
  localPeerId: string,
  eventHandlers: ClipboardSyncEvents,
  config?: ClipboardSyncConfig
): ClipboardSyncManager {
  return new ClipboardSyncManager(localPeerId, eventHandlers, config);
}

/**
 * Helper function to validate clipboard sync payload
 */
export function isValidClipboardSyncPayload(data: unknown): data is ClipboardSyncPayload {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.type === 'clipboard-sync' &&
    typeof obj.content === 'string' &&
    typeof obj.senderId === 'string' &&
    typeof obj.timestamp === 'number'
  );
}

export default ClipboardSyncManager;
