/**
 * WebRTC File Transfer Handler
 *
 * Handles incoming file transfer requests from connected peers.
 * Manages acceptance, rejection, and coordination of file transfers.
 */

import { v4 as uuidv4 } from 'uuid';
import type { FileTransfer } from '@/types';
import type {
  FileMetadata,
  FileTransferRequest,
  FileTransferResponse,
  FileTransferStart,
} from './file-transfer-initiator';

/**
 * Transfer request status
 */
export type TransferRequestStatus = 'pending' | 'accepted' | 'rejected' | 'receiving' | 'completed' | 'failed';

/**
 * Pending transfer request
 */
interface PendingTransferRequest {
  request: FileTransferRequest;
  senderPeerId: string;
  receivedAt: number;
  status: TransferRequestStatus;
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * Configuration for file transfer handler
 */
export interface FileTransferHandlerConfig {
  autoAccept?: boolean;
  maxFileSize?: number;
  requestTimeout?: number;
  allowedFileTypes?: string[];
  debug?: boolean;
}

/**
 * File transfer handler events
 */
export interface FileTransferHandlerEvents {
  onTransferRequested?: (request: FileTransferRequest, senderPeerId: string) => void;
  onTransferAccepted?: (transferId: string, senderPeerId: string) => void;
  onTransferRejected?: (transferId: string, senderPeerId: string, reason?: string) => void;
  onTransferStarted?: (transferId: string, senderPeerId: string) => void;
  onTransferCompleted?: (transferId: string, senderPeerId: string, file: File) => void;
  onTransferFailed?: (transferId: string, senderPeerId: string, error: string) => void;
}

/**
 * Incoming file transfer with metadata
 */
export interface IncomingFileTransfer {
  transferId: string;
  metadata: FileMetadata;
  senderPeerId: string;
  status: TransferRequestStatus;
  receivedAt: number;
  progress?: number;
}

/**
 * File Transfer Handler Class
 *
 * Handles incoming file transfer requests and coordinates the reception
 * of file chunks and reassembly.
 */
export class FileTransferHandler {
  private config: Required<FileTransferHandlerConfig>;
  private eventHandlers: FileTransferHandlerEvents;
  private pendingRequests: Map<string, PendingTransferRequest>;
  private incomingTransfers: Map<string, IncomingFileTransfer>;
  private isDestroyed: boolean = false;

  constructor(
    eventHandlers: FileTransferHandlerEvents = {},
    config: FileTransferHandlerConfig = {}
  ) {
    this.pendingRequests = new Map();
    this.incomingTransfers = new Map();

    this.config = {
      autoAccept: config.autoAccept ?? false,
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024 * 1024, // 10GB default
      requestTimeout: config.requestTimeout ?? 60000, // 60 seconds default
      allowedFileTypes: config.allowedFileTypes ?? [],
      debug: config.debug ?? false,
    };

    this.eventHandlers = eventHandlers;

    this.debug('FileTransferHandler initialized', this.config);
  }

  /**
   * Handle incoming file transfer request
   *
   * @param request - File transfer request
   * @param senderPeerId - Sender peer ID
   * @param sendCallback - Callback to send response to peer
   * @returns True if request was handled successfully
   */
  public async handleTransferRequest(
    request: FileTransferRequest,
    senderPeerId: string,
    sendCallback: (peerId: string, data: object) => boolean
  ): Promise<boolean> {
    if (this.isDestroyed) {
      return false;
    }

    const { transferId, metadata, senderId, timestamp, expiresAt } = request;

    this.debug(`Received transfer request ${transferId} from peer ${senderPeerId}`, metadata);

    // Check if request has expired
    if (Date.now() > expiresAt) {
      this.debug(`Transfer request ${transferId} has expired`);
      await this.sendResponse(transferId, senderPeerId, false, 'Request expired', sendCallback);
      return false;
    }

    // Check if transfer already exists
    if (this.pendingRequests.has(transferId) || this.incomingTransfers.has(transferId)) {
      this.debug(`Transfer ${transferId} already exists`);
      await this.sendResponse(transferId, senderPeerId, false, 'Transfer already exists', sendCallback);
      return false;
    }

    // Validate file metadata
    const validation = await this.validateFileMetadata(metadata);
    if (!validation.isValid) {
      this.debug(`File validation failed for transfer ${transferId}: ${validation.error}`);
      await this.sendResponse(transferId, senderPeerId, false, validation.error, sendCallback);
      return false;
    }

    // Create pending request
    const pendingRequest: PendingTransferRequest = {
      request,
      senderPeerId,
      receivedAt: Date.now(),
      status: 'pending',
    };

    this.pendingRequests.set(transferId, pendingRequest);

    // Trigger event
    this.eventHandlers.onTransferRequested?.(request, senderPeerId);

    // Auto-accept if configured
    if (this.config.autoAccept) {
      this.debug(`Auto-accepting transfer ${transferId}`);
      return await this.acceptTransfer(transferId, sendCallback);
    }

    return true;
  }

  /**
   * Accept a file transfer request
   *
   * @param transferId - Transfer ID to accept
   * @param sendCallback - Callback to send response to peer
   * @returns True if acceptance was sent successfully
   */
  public async acceptTransfer(
    transferId: string,
    sendCallback: (peerId: string, data: object) => boolean
  ): Promise<boolean> {
    if (this.isDestroyed) {
      return false;
    }

    const pendingRequest = this.pendingRequests.get(transferId);

    if (!pendingRequest) {
      this.debug(`No pending request found for transfer ${transferId}`);
      return false;
    }

    const { request, senderPeerId } = pendingRequest;

    // Send acceptance response
    const sent = await this.sendResponse(transferId, senderPeerId, true, undefined, sendCallback);

    if (sent) {
      // Update status
      pendingRequest.status = 'accepted';

      // Move to incoming transfers
      const incomingTransfer: IncomingFileTransfer = {
        transferId,
        metadata: request.metadata,
        senderPeerId,
        status: 'accepted',
        receivedAt: pendingRequest.receivedAt,
        progress: 0,
      };

      this.incomingTransfers.set(transferId, incomingTransfer);
      this.pendingRequests.delete(transferId);

      // Clear timeout
      if (pendingRequest.timeoutHandle) {
        clearTimeout(pendingRequest.timeoutHandle);
      }

      this.debug(`Transfer ${transferId} accepted`);
      this.eventHandlers.onTransferAccepted?.(transferId, senderPeerId);

      return true;
    }

    return false;
  }

  /**
   * Reject a file transfer request
   *
   * @param transferId - Transfer ID to reject
   * @param reason - Optional rejection reason
   * @param sendCallback - Callback to send response to peer
   * @returns True if rejection was sent successfully
   */
  public async rejectTransfer(
    transferId: string,
    reason: string = 'Transfer rejected by user',
    sendCallback: (peerId: string, data: object) => boolean
  ): Promise<boolean> {
    if (this.isDestroyed) {
      return false;
    }

    const pendingRequest = this.pendingRequests.get(transferId);

    if (!pendingRequest) {
      this.debug(`No pending request found for transfer ${transferId}`);
      return false;
    }

    const { senderPeerId } = pendingRequest;

    // Send rejection response
    const sent = await this.sendResponse(transferId, senderPeerId, false, reason, sendCallback);

    if (sent) {
      // Update status
      pendingRequest.status = 'rejected';

      // Clear timeout
      if (pendingRequest.timeoutHandle) {
        clearTimeout(pendingRequest.timeoutHandle);
      }

      this.debug(`Transfer ${transferId} rejected: ${reason}`);
      this.eventHandlers.onTransferRejected?.(transferId, senderPeerId, reason);

      // Remove from pending requests
      this.pendingRequests.delete(transferId);

      return true;
    }

    return false;
  }

  /**
   * Handle file transfer start notification
   *
   * @param start - Transfer start notification
   * @param senderPeerId - Sender peer ID
   * @returns True if start notification was handled successfully
   */
  public handleTransferStart(start: FileTransferStart, senderPeerId: string): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const { transferId } = start;

    this.debug(`Transfer start notification received for ${transferId} from peer ${senderPeerId}`);

    const incomingTransfer = this.incomingTransfers.get(transferId);

    if (!incomingTransfer) {
      this.debug(`No incoming transfer found for ${transferId}`);
      return false;
    }

    // Update status
    incomingTransfer.status = 'receiving';

    this.debug(`Transfer ${transferId} started`);
    this.eventHandlers.onTransferStarted?.(transferId, senderPeerId);

    return true;
  }

  /**
   * Update transfer progress
   *
   * @param transferId - Transfer ID
   * @param progress - Progress percentage (0-100)
   * @returns True if progress was updated
   */
  public updateTransferProgress(transferId: string, progress: number): boolean {
    const incomingTransfer = this.incomingTransfers.get(transferId);

    if (!incomingTransfer) {
      return false;
    }

    incomingTransfer.progress = Math.max(0, Math.min(100, progress));

    return true;
  }

  /**
   * Mark transfer as completed
   *
   * @param transferId - Transfer ID
   * @param file - Received file
   * @returns True if marked as completed successfully
   */
  public markTransferCompleted(transferId: string, file: File): boolean {
    const incomingTransfer = this.incomingTransfers.get(transferId);

    if (!incomingTransfer) {
      return false;
    }

    incomingTransfer.status = 'completed';
    incomingTransfer.progress = 100;

    this.debug(`Transfer ${transferId} completed`);
    this.eventHandlers.onTransferCompleted?.(transferId, incomingTransfer.senderPeerId, file);

    // Remove from incoming transfers after a delay
    setTimeout(() => {
      this.incomingTransfers.delete(transferId);
    }, 5000);

    return true;
  }

  /**
   * Mark transfer as failed
   *
   * @param transferId - Transfer ID
   * @param error - Error message
   * @returns True if marked as failed successfully
   */
  public markTransferFailed(transferId: string, error: string): boolean {
    const incomingTransfer = this.incomingTransfers.get(transferId);

    if (!incomingTransfer) {
      return false;
    }

    incomingTransfer.status = 'failed';

    this.debug(`Transfer ${transferId} failed: ${error}`);
    this.eventHandlers.onTransferFailed?.(transferId, incomingTransfer.senderPeerId, error);

    // Remove from incoming transfers after a delay
    setTimeout(() => {
      this.incomingTransfers.delete(transferId);
    }, 5000);

    return true;
  }

  /**
   * Get all pending transfer requests
   *
   * @returns Array of pending transfer requests
   */
  public getPendingRequests(): IncomingFileTransfer[] {
    return Array.from(this.pendingRequests.values()).map(pending => ({
      transferId: pending.request.transferId,
      metadata: pending.request.metadata,
      senderPeerId: pending.senderPeerId,
      status: pending.status,
      receivedAt: pending.receivedAt,
      progress: 0,
    }));
  }

  /**
   * Get all incoming transfers
   *
   * @returns Array of incoming transfers
   */
  public getIncomingTransfers(): IncomingFileTransfer[] {
    return Array.from(this.incomingTransfers.values());
  }

  /**
   * Get incoming transfer by ID
   *
   * @param transferId - Transfer ID
   * @returns Incoming transfer or null
   */
  public getIncomingTransfer(transferId: string): IncomingFileTransfer | null {
    return this.incomingTransfers.get(transferId) ?? null;
  }

  /**
   * Cancel and remove a transfer
   *
   * @param transferId - Transfer ID
   * @returns True if cancelled successfully
   */
  public cancelTransfer(transferId: string): boolean {
    // Check pending requests
    const pendingRequest = this.pendingRequests.get(transferId);
    if (pendingRequest) {
      if (pendingRequest.timeoutHandle) {
        clearTimeout(pendingRequest.timeoutHandle);
      }
      this.pendingRequests.delete(transferId);
      return true;
    }

    // Check incoming transfers
    const incomingTransfer = this.incomingTransfers.get(transferId);
    if (incomingTransfer) {
      this.incomingTransfers.delete(transferId);
      return true;
    }

    return false;
  }

  /**
   * Validate file metadata
   *
   * @param metadata - File metadata to validate
   * @returns Validation result
   */
  private async validateFileMetadata(metadata: FileMetadata): Promise<{ isValid: boolean; error?: string }> {
    // Check file size
    if (metadata.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size (${metadata.size} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`,
      };
    }

    // Check file type if restrictions exist
    if (this.config.allowedFileTypes.length > 0) {
      const isAllowed = this.config.allowedFileTypes.some(type => {
        // Support wildcards (e.g., 'image/*')
        if (type.endsWith('/*')) {
          const baseType = type.slice(0, -2);
          return metadata.type.startsWith(baseType);
        }
        return metadata.type === type;
      });

      if (!isAllowed) {
        return {
          isValid: false,
          error: `File type '${metadata.type}' is not allowed`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Send response to peer
   *
   * @param transferId - Transfer ID
   * @param senderPeerId - Sender peer ID
   * @param accepted - Whether transfer is accepted
   * @param reason - Optional rejection reason
   * @param sendCallback - Callback to send response
   * @returns True if response was sent successfully
   */
  private async sendResponse(
    transferId: string,
    senderPeerId: string,
    accepted: boolean,
    reason: string | undefined,
    sendCallback: (peerId: string, data: object) => boolean
  ): Promise<boolean> {
    const response: FileTransferResponse = {
      transferId,
      receiverId: senderPeerId, // We're the receiver, sending to the original sender
      accepted,
      reason,
      timestamp: Date.now(),
    };

    const messageType = accepted ? 'file-transfer-accept' : 'file-transfer-reject';

    try {
      const sent = sendCallback(senderPeerId, {
        type: messageType,
        data: response,
      });

      if (sent) {
        this.debug(`Sent ${messageType} for transfer ${transferId} to peer ${senderPeerId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.debug(`Error sending response for transfer ${transferId}:`, error);
      return false;
    }
  }

  /**
   * Update event handlers
   *
   * @param handlers - New event handlers
   */
  public updateEventHandlers(handlers: Partial<FileTransferHandlerEvents>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    this.debug('Event handlers updated');
  }

  /**
   * Destroy the handler and cleanup resources
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.debug('Destroying FileTransferHandler');

    // Clear all timeouts
    for (const pendingRequest of this.pendingRequests.values()) {
      if (pendingRequest.timeoutHandle) {
        clearTimeout(pendingRequest.timeoutHandle);
      }
    }

    // Clear all maps
    this.pendingRequests.clear();
    this.incomingTransfers.clear();

    this.isDestroyed = true;

    this.debug('FileTransferHandler destroyed');
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[FileTransferHandler] ${message}`, data);
      } else {
        console.log(`[FileTransferHandler] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create file transfer handler
 *
 * @param eventHandlers - Event handlers
 * @param config - Configuration
 * @returns Configured handler instance
 */
export function createFileTransferHandler(
  eventHandlers?: FileTransferHandlerEvents,
  config?: FileTransferHandlerConfig
): FileTransferHandler {
  return new FileTransferHandler(eventHandlers, config);
}

export default FileTransferHandler;
