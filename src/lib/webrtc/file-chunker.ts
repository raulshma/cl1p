/**
 * WebRTC File Chunker
 *
 * Chunks large files into smaller pieces for reliable WebRTC transfer.
 * Handles file splitting with integrity verification through checksums.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for file chunking
 */
export interface FileChunkerConfig {
  chunkSize?: number; // Size of each chunk in bytes (default: 16KB)
  enableChecksums?: boolean; // Enable integrity verification (default: true)
  maxChunkSize?: number; // Maximum chunk size (default: 64KB)
  debug?: boolean;
}

/**
 * File chunk metadata for transfer
 */
export interface FileChunkMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  checksum?: string; // Overall file checksum
  lastModified?: number;
}

/**
 * Individual file chunk
 */
export interface FileChunk {
  metadata: FileChunkMetadata;
  chunkIndex: number;
  data: ArrayBuffer;
  checksum?: string; // Chunk-level checksum
}

/**
 * Chunking progress information
 */
export interface ChunkingProgress {
  fileId: string;
  fileName: string;
  currentChunk: number;
  totalChunks: number;
  bytesProcessed: number;
  totalBytes: number;
  percentage: number;
}

/**
 * File chunker class
 */
export class FileChunker {
  private config: Required<FileChunkerConfig>;
  private activeChunking: Map<string, AbortController>;

  constructor(config: FileChunkerConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize ?? 16 * 1024, // 16KB default
      enableChecksums: config.enableChecksums ?? true,
      maxChunkSize: config.maxChunkSize ?? 64 * 1024, // 64KB max
      debug: config.debug ?? false,
    };

    // Validate chunk size
    if (this.config.chunkSize > this.config.maxChunkSize) {
      throw new Error(`Chunk size (${this.config.chunkSize}) cannot exceed max chunk size (${this.config.maxChunkSize})`);
    }

    this.activeChunking = new Map();
    this.debug('FileChunker initialized', this.config);
  }

  /**
   * Chunk a file into smaller pieces
   *
   * @param file - File to chunk
   * @param onProgress - Optional progress callback
   * @returns Async generator that yields chunks
   */
  public async *chunkFile(
    file: File,
    onProgress?: (progress: ChunkingProgress) => void
  ): AsyncGenerator<FileChunk, void, unknown> {
    const fileId = uuidv4();
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;
    const lastModified = file.lastModified;

    this.debug(`Starting to chunk file: ${fileName} (${fileSize} bytes)`);

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / this.config.chunkSize);

    // Create abort controller for this chunking operation
    const abortController = new AbortController();
    this.activeChunking.set(fileId, abortController);

    // Prepare metadata
    const metadata: FileChunkMetadata = {
      fileId,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      chunkSize: this.config.chunkSize,
      lastModified,
    };

    // Read file as array buffer
    const fileBuffer = await file.arrayBuffer();

    let currentChunk = 0;
    let bytesProcessed = 0;

    // Chunk the file
    for (let offset = 0; offset < fileSize; offset += this.config.chunkSize) {
      // Check if aborted
      if (abortController.signal.aborted) {
        this.debug(`Chunking aborted for file: ${fileName}`);
        throw new Error('File chunking was aborted');
      }

      const chunkSize = Math.min(this.config.chunkSize, fileSize - offset);
      const chunkData = fileBuffer.slice(offset, offset + chunkSize);

      // Calculate checksum if enabled
      let checksum: string | undefined;
      if (this.config.enableChecksums) {
        checksum = await this.calculateChecksum(chunkData);
      }

      // Create chunk
      const chunk: FileChunk = {
        metadata,
        chunkIndex: currentChunk,
        data: chunkData,
        checksum,
      };

      // Update progress
      bytesProcessed += chunkSize;
      const percentage = (bytesProcessed / fileSize) * 100;

      if (onProgress) {
        onProgress({
          fileId,
          fileName,
          currentChunk,
          totalChunks,
          bytesProcessed,
          totalBytes: fileSize,
          percentage,
        });
      }

      this.debug(
        `Yielding chunk ${currentChunk + 1}/${totalChunks} for ${fileName} ` +
        `(${percentage.toFixed(1)}%)`
      );

      yield chunk;

      currentChunk++;
    }

    // Clean up abort controller
    this.activeChunking.delete(fileId);

    this.debug(`Finished chunking file: ${fileName}`);
  }

  /**
   * Cancel an active chunking operation
   *
   * @param fileId - File ID to cancel
   * @returns True if cancelled successfully
   */
  public cancelChunking(fileId: string): boolean {
    const controller = this.activeChunking.get(fileId);
    if (controller) {
      controller.abort();
      this.activeChunking.delete(fileId);
      this.debug(`Cancelled chunking for file: ${fileId}`);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active chunking operations
   */
  public cancelAll(): void {
    this.debug('Cancelling all active chunking operations');
    for (const controller of this.activeChunking.values()) {
      controller.abort();
    }
    this.activeChunking.clear();
  }

  /**
   * Calculate checksum for data integrity verification
   *
   * @param data - Data to calculate checksum for
   * @returns Hex string checksum
   */
  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    // Use SubtleCrypto for SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Calculate overall file checksum
   *
   * @param file - File to calculate checksum for
   * @returns Hex string checksum
   */
  public async calculateFileChecksum(file: File): Promise<string> {
    const fileBuffer = await file.arrayBuffer();
    return this.calculateChecksum(fileBuffer);
  }

  /**
   * Estimate number of chunks for a file
   *
   * @param fileSize - Size of file in bytes
   * @returns Estimated number of chunks
   */
  public estimateChunkCount(fileSize: number): number {
    return Math.ceil(fileSize / this.config.chunkSize);
  }

  /**
   * Validate chunk size
   *
   * @param size - Size to validate
   * @returns True if valid
   */
  public isValidChunkSize(size: number): boolean {
    return size > 0 && size <= this.config.maxChunkSize;
  }

  /**
   * Destroy the chunker and cleanup resources
   */
  public destroy(): void {
    this.debug('Destroying FileChunker');
    this.cancelAll();
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[FileChunker] ${message}`, data);
      } else {
        console.log(`[FileChunker] ${message}`);
      }
    }
  }
}

/**
 * Helper function to chunk a file with default configuration
 *
 * @param file - File to chunk
 * @param config - Optional chunker configuration
 * @param onProgress - Optional progress callback
 * @returns Async generator of file chunks
 */
export async function* createFileChunks(
  file: File,
  config?: FileChunkerConfig,
  onProgress?: (progress: ChunkingProgress) => void
): AsyncGenerator<FileChunk, void, unknown> {
  const chunker = new FileChunker(config);
  yield* chunker.chunkFile(file, onProgress);
  chunker.destroy();
}

/**
 * Helper function to estimate transfer size
 *
 * @param file - File to estimate for
 * @param chunkSize - Chunk size to use
 * @returns Total size including metadata overhead
 */
export function estimateTransferSize(file: File, chunkSize: number = 16 * 1024): number {
  const baseMetadataSize = 200; // Approximate metadata size per chunk in JSON
  const totalChunks = Math.ceil(file.size / chunkSize);
  return file.size + (baseMetadataSize * totalChunks);
}

export default FileChunker;
