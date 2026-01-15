/**
 * WebRTC File Transfer Initiator
 *
 * Manages the initiation of file transfers to connected peers.
 * Sends file metadata before transfer and waits for peer acceptance.
 */

import { v4 as uuidv4 } from 'uuid';
import type { FileTransfer } from '@/types';

/**
 * File transfer initiation message types
 */
export type FileTransferInitMessageType =
  | 'file-transfer-request'
  | 'file-transfer-accept'
  | 'file-transfer-reject'
  | 'file-transfer-cancel'
  | 'file-transfer-start';

/**
 * File metadata for transfer initiation
 */
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  hash?: string;
  lastModified?: number;
  chunkCount?: number;
  chunkSize?: number;
}

/**
 * File transfer request payload
 */
export interface FileTransferRequest {
  transferId: string;
  metadata: FileMetadata;
  senderId: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * File transfer response payload
 */
export interface FileTransferResponse {
  transferId: string;
  accepted: boolean;
  receiverId: string;
  reason?: string;
  timestamp: number;
}

/**
 * File transfer start notification
 */
export interface FileTransferStart {
  transferId: string;
  senderId: string;
  timestamp: number;
}

/**
 * Transfer initiation status
 */
export type TransferInitiationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

/**
 * Active transfer initiation
 */
interface ActiveTransferInitiation {
  request: FileTransferRequest;
  status: TransferInitiationStatus;
  targetPeerId: string;
  createdAt: number;
  timeoutHandle?: NodeJS.Timeout;
  responseCallback?: (response: FileTransferResponse) => void;
}

/**
 * Configuration for file transfer initiator
 */
export interface FileTransferInitiatorConfig {
  requestTimeout?: number; // Time to wait for acceptance (ms)
  maxConcurrentTransfers?: number;
  enableChecksum?: boolean;
  defaultChunkSize?: number;
  debug?: boolean;
}

/**
 * File transfer initiator events
 */
export interface FileTransferInitiatorEvents {
  onRequestSent?: (request: FileTransferRequest, peerId: string) => void;
  onAccepted?: (transferId: string, peerId: string) => void;
  onRejected?: (transferId: string, peerId: string, reason?: string) => void;
  onExpired?: (transferId: string, peerId: string) => void;
  onCancelled?: (transferId: string, peerId: string) => void;
  onError?: (transferId: string, peerId: string, error: string) => void;
}

/**
 * File Transfer Initiator Class
 *
 * Handles initiating file transfers by sending metadata to peers
 * and waiting for their acceptance before starting the actual transfer.
 */
export class FileTransferInitiator {
  private config: Required<FileTransferInitiatorConfig>;
  private activeInitiations: Map<string, ActiveTransferInitiation>;
  private eventHandlers: FileTransferInitiatorEvents;
  private isDestroyed: boolean = false;

  constructor(
    eventHandlers: FileTransferInitiatorEvents = {},
    config: FileTransferInitiatorConfig = {}
  ) {
    this.activeInitiations = new Map();

    this.config = {
      requestTimeout: config.requestTimeout ?? 30000, // 30 seconds default
      maxConcurrentTransfers: config.maxConcurrentTransfers ?? 5,
      enableChecksum: config.enableChecksum ?? true,
      defaultChunkSize: config.defaultChunkSize ?? 16 * 1024, // 16KB
      debug: config.debug ?? false,
    };

    this.eventHandlers = eventHandlers;

    this.debug('FileTransferInitiator initialized', this.config);
  }

  /**
   * Initiate a file transfer to a peer
   *
   * @param file - File to transfer
   * @param peerId - Target peer ID
   * @param senderId - Local peer ID
   * @param sendCallback - Callback to send data to peer
   * @param chunkCount - Optional number of chunks (if pre-calculated)
   * @returns Promise resolving to transfer ID if accepted, null otherwise
   */
  public async initiateTransfer(
    file: File,
    peerId: string,
    senderId: string,
    sendCallback: (peerId: string, data: object) => boolean,
    chunkCount?: number
  ): Promise<string | null> {
    if (this.isDestroyed) {
      throw new Error('FileTransferInitiator has been destroyed');
    }

    // Check concurrent transfer limit
    const activeCount = Array.from(this.activeInitiations.values()).filter(
      initiation => initiation.status === 'pending'
    ).length;

    if (activeCount >= this.config.maxConcurrentTransfers) {
      const error = `Maximum concurrent transfers (${this.config.maxConcurrentTransfers}) reached`;
      this.debug(error);
      this.eventHandlers.onError?.(uuidv4(), peerId, error);
      return null;
    }

    const transferId = uuidv4();
    const timestamp = Date.now();
    const expiresAt = timestamp + this.config.requestTimeout;

    // Calculate file hash if enabled
    let fileHash: string | undefined;
    if (this.config.enableChecksum) {
      try {
        fileHash = await this.calculateFileHash(file);
        this.debug(`Calculated hash for file ${file.name}: ${fileHash?.substring(0, 16)}...`);
      } catch (error) {
        this.debug(`Failed to calculate file hash:`, error);
      }
    }

    // Calculate chunk count if not provided
    const calculatedChunkCount = chunkCount ?? Math.ceil(file.size / this.config.defaultChunkSize);

    // Create file metadata
    const metadata: FileMetadata = {
      id: transferId,
      name: file.name,
      size: file.size,
      type: file.type,
      hash: fileHash,
      lastModified: file.lastModified,
      chunkCount: calculatedChunkCount,
      chunkSize: this.config.defaultChunkSize,
    };

    // Create transfer request
    const request: FileTransferRequest = {
      transferId,
      metadata,
      senderId,
      timestamp,
      expiresAt,
    };

    this.debug(`Initiating file transfer ${transferId} to peer ${peerId}`, metadata);

    // Create active initiation
    const initiation: ActiveTransferInitiation = {
      request,
      status: 'pending',
      targetPeerId: peerId,
      createdAt: timestamp,
    };

    this.activeInitiations.set(transferId, initiation);

    // Set up timeout for acceptance
    initiation.timeoutHandle = setTimeout(() => {
      this.handleTimeout(transferId);
    }, this.config.requestTimeout);

    // Send request to peer
    try {
      const sent = sendCallback(peerId, {
        type: 'file-transfer-request',
        data: request,
      });

      if (!sent) {
        throw new Error('Failed to send transfer request');
      }

      this.debug(`Transfer request ${transferId} sent to peer ${peerId}`);
      this.eventHandlers.onRequestSent?.(request, peerId);

      // Wait for response
      const response = await this.waitForResponse(transferId);

      if (response && response.accepted) {
        this.debug(`Transfer ${transferId} accepted by peer ${peerId}`);
        this.eventHandlers.onAccepted?.(transferId, peerId);
        return transferId;
      } else {
        const reason = response?.reason ?? 'No response';
        this.debug(`Transfer ${transferId} rejected by peer ${peerId}: ${reason}`);
        this.eventHandlers.onRejected?.(transferId, peerId, reason);
        this.activeInitiations.delete(transferId);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.debug(`Error initiating transfer ${transferId}:`, error);
      this.eventHandlers.onError?.(transferId, peerId, errorMessage);
      this.activeInitiations.delete(transferId);
      return null;
    }
  }

  /**
   * Handle incoming response from peer
   *
   * @param response - File transfer response
   * @returns True if response was processed successfully
   */
  public handleResponse(response: FileTransferResponse): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const { transferId, accepted, receiverId, reason, timestamp } = response;

    this.debug(`Received response for transfer ${transferId} from peer ${receiverId}`, {
      accepted,
      reason,
    });

    const initiation = this.activeInitiations.get(transferId);

    if (!initiation) {
      this.debug(`No active initiation found for transfer ${transferId}`);
      return false;
    }

    // Verify peer ID matches
    if (initiation.targetPeerId !== receiverId) {
      this.debug(`Peer ID mismatch for transfer ${transferId}`);
      return false;
    }

    // Clear timeout
    if (initiation.timeoutHandle) {
      clearTimeout(initiation.timeoutHandle);
    }

    // Update status
    initiation.status = accepted ? 'accepted' : 'rejected';

    // Trigger response callback if exists
    if (initiation.responseCallback) {
      initiation.responseCallback(response);
    }

    return true;
  }

  /**
   * Cancel an active transfer initiation
   *
   * @param transferId - Transfer ID to cancel
   * @returns True if cancelled successfully
   */
  public cancelTransfer(transferId: string): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const initiation = this.activeInitiations.get(transferId);

    if (!initiation) {
      this.debug(`No active initiation found for transfer ${transferId}`);
      return false;
    }

    // Clear timeout
    if (initiation.timeoutHandle) {
      clearTimeout(initiation.timeoutHandle);
    }

    // Update status
    initiation.status = 'cancelled';

    // Remove from active initiations
    this.activeInitiations.delete(transferId);

    this.debug(`Transfer ${transferId} cancelled`);
    this.eventHandlers.onCancelled?.(transferId, initiation.targetPeerId);

    return true;
  }

  /**
   * Get status of a transfer initiation
   *
   * @param transferId - Transfer ID
   * @returns Status or null if not found
   */
  public getTransferStatus(transferId: string): TransferInitiationStatus | null {
    const initiation = this.activeInitiations.get(transferId);
    return initiation?.status ?? null;
  }

  /**
   * Get all active transfer initiations
   *
   * @returns Map of transfer ID to initiation
   */
  public getActiveTransfers(): Map<string, ActiveTransferInitiation> {
    return new Map(this.activeInitiations);
  }

  /**
   * Notify peer that transfer is starting
   *
   * @param transferId - Transfer ID
   * @param peerId - Target peer ID
   * @param senderId - Local peer ID
   * @param sendCallback - Callback to send data to peer
   * @returns True if notification sent successfully
   */
  public notifyTransferStart(
    transferId: string,
    peerId: string,
    senderId: string,
    sendCallback: (peerId: string, data: object) => boolean
  ): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const startNotification: FileTransferStart = {
      transferId,
      senderId,
      timestamp: Date.now(),
    };

    try {
      const sent = sendCallback(peerId, {
        type: 'file-transfer-start',
        data: startNotification,
      });

      if (sent) {
        this.debug(`Transfer start notification sent for ${transferId} to peer ${peerId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.debug(`Error sending transfer start notification:`, error);
      return false;
    }
  }

  /**
   * Wait for response from peer
   *
   * @param transferId - Transfer ID
   * @returns Promise resolving to response or null
   */
  private waitForResponse(transferId: string): Promise<FileTransferResponse | null> {
    return new Promise((resolve) => {
      const initiation = this.activeInitiations.get(transferId);

      if (!initiation) {
        resolve(null);
        return;
      }

      // Set up callback
      initiation.responseCallback = (response: FileTransferResponse) => {
        resolve(response);
      };

      // Set up timeout check (already handled by handleTimeout)
      const checkStatus = setInterval(() => {
        const currentInitiation = this.activeInitiations.get(transferId);
        if (!currentInitiation || currentInitiation.status !== 'pending') {
          clearInterval(checkStatus);
          if (currentInitiation?.responseCallback) {
            resolve(null);
          }
        }
      }, 1000);
    });
  }

  /**
   * Handle timeout for transfer acceptance
   *
   * @param transferId - Transfer ID
   */
  private handleTimeout(transferId: string): void {
    const initiation = this.activeInitiations.get(transferId);

    if (!initiation || initiation.status !== 'pending') {
      return;
    }

    this.debug(`Transfer ${transferId} timed out waiting for acceptance`);

    initiation.status = 'expired';
    this.activeInitiations.delete(transferId);

    this.eventHandlers.onExpired?.(transferId, initiation.targetPeerId);

    // Trigger response callback with null
    if (initiation.responseCallback) {
      initiation.responseCallback({
        transferId,
        accepted: false,
        receiverId: initiation.targetPeerId,
        reason: 'Request timed out',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Calculate file hash for integrity verification
   *
   * @param file - File to hash
   * @returns Hex string hash
   */
  private async calculateFileHash(file: File): Promise<string> {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Update event handlers
   *
   * @param handlers - New event handlers
   */
  public updateEventHandlers(handlers: Partial<FileTransferInitiatorEvents>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    this.debug('Event handlers updated');
  }

  /**
   * Destroy the initiator and cleanup resources
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.debug('Destroying FileTransferInitiator');

    // Clear all timeouts
    for (const initiation of this.activeInitiations.values()) {
      if (initiation.timeoutHandle) {
        clearTimeout(initiation.timeoutHandle);
      }
    }

    // Clear all active initiations
    this.activeInitiations.clear();

    this.isDestroyed = true;

    this.debug('FileTransferInitiator destroyed');
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[FileTransferInitiator] ${message}`, data);
      } else {
        console.log(`[FileTransferInitiator] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create file transfer initiator
 *
 * @param eventHandlers - Event handlers
 * @param config - Configuration
 * @returns Configured initiator instance
 */
export function createFileTransferInitiator(
  eventHandlers?: FileTransferInitiatorEvents,
  config?: FileTransferInitiatorConfig
): FileTransferInitiator {
  return new FileTransferInitiator(eventHandlers, config);
}

/**
 * Validate file transfer request
 *
 * @param data - Data to validate
 * @returns True if valid file transfer request
 */
export function isValidFileTransferRequest(data: unknown): data is { type: 'file-transfer-request'; data: FileTransferRequest } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'file-transfer-request' &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    typeof (obj.data as Record<string, unknown>).transferId === 'string' &&
    typeof (obj.data as Record<string, unknown>).senderId === 'string' &&
    typeof (obj.data as Record<string, unknown>).timestamp === 'number' &&
    typeof (obj.data as Record<string, unknown>).expiresAt === 'number' &&
    typeof (obj.data as Record<string, unknown>).metadata === 'object' &&
    (obj.data as Record<string, unknown>).metadata !== null
  );
}

/**
 * Validate file transfer response
 *
 * @param data - Data to validate
 * @returns True if valid file transfer response
 */
export function isValidFileTransferResponse(data: unknown): data is { type: 'file-transfer-accept' | 'file-transfer-reject'; data: FileTransferResponse } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    (obj.type === 'file-transfer-accept' || obj.type === 'file-transfer-reject') &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    typeof (obj.data as Record<string, unknown>).transferId === 'string' &&
    typeof (obj.data as Record<string, unknown>).receiverId === 'string' &&
    typeof (obj.data as Record<string, unknown>).accepted === 'boolean' &&
    typeof (obj.data as Record<string, unknown>).timestamp === 'number'
  );
}

/**
 * Create file transfer response
 *
 * @param transferId - Transfer ID
 * @param receiverId - Receiver peer ID
 * @param accepted - Whether transfer is accepted
 * @param reason - Optional rejection reason
 * @returns File transfer response
 */
export function createFileTransferResponse(
  transferId: string,
  receiverId: string,
  accepted: boolean,
  reason?: string
): FileTransferResponse {
  return {
    transferId,
    receiverId,
    accepted,
    reason,
    timestamp: Date.now(),
  };
}

/**
 * Create file transfer start notification
 *
 * @param transferId - Transfer ID
 * @param senderId - Sender peer ID
 * @returns File transfer start notification
 */
export function createFileTransferStart(
  transferId: string,
  senderId: string
): FileTransferStart {
  return {
    transferId,
    senderId,
    timestamp: Date.now(),
  };
}

export default FileTransferInitiator;
