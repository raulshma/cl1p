/**
 * WebRTC File Reassembler
 *
 * Reassembles chunked files on the receiving end with integrity verification.
 * Handles out-of-order chunks and validates data integrity.
 */

import type { FileChunk, FileChunkMetadata, ChunkingProgress } from './file-chunker';

/**
 * Configuration for file reassembly
 */
export interface FileReassemblerConfig {
  enableChecksumValidation?: boolean;
  maxFileSize?: number;
  maxMemoryUsage?: number; // Maximum memory to use for reassembly (bytes)
  debug?: boolean;
}

/**
 * Reassembly status
 */
export type ReassemblyStatus = 'receiving' | 'verifying' | 'completed' | 'failed';

/**
 * Reassembly progress information
 */
export interface ReassemblyProgress {
  fileId: string;
  fileName: string;
  status: ReassemblyStatus;
  receivedChunks: number;
  totalChunks: number;
  receivedBytes: number;
  totalBytes: number;
  percentage: number;
  verifiedChunks: number;
  failedChunks: number;
}

/**
 * Reassembly result
 */
export interface ReassemblyResult {
  fileId: string;
  fileName: string;
  file: File;
  success: boolean;
  error?: string;
  chunksVerified: number;
  chunksFailed: number;
  verificationPassed: boolean;
  transferDuration: number; // milliseconds
}

/**
 * Chunk buffer for tracking received chunks
 */
interface ChunkBuffer {
  metadata: FileChunkMetadata;
  chunks: Map<number, ArrayBuffer>;
  receivedIndexes: Set<number>;
  checksums: Map<number, string>;
  startTime: number;
  lastChunkTime: number;
}

/**
 * File reassembler class
 */
export class FileReassembler {
  private config: Required<FileReassemblerConfig>;
  private activeReassemblies: Map<string, ChunkBuffer>;
  private completedReassemblies: Map<string, ReassemblyResult>;

  constructor(config: FileReassemblerConfig = {}) {
    this.config = {
      enableChecksumValidation: config.enableChecksumValidation ?? true,
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024 * 1024, // 10GB default
      maxMemoryUsage: config.maxMemoryUsage ?? 1024 * 1024 * 1024, // 1GB default
      debug: config.debug ?? false,
    };

    this.activeReassemblies = new Map();
    this.completedReassemblies = new Map();

    this.debug('FileReassembler initialized', this.config);
  }

  /**
   * Initialize reassembly for a file
   *
   * @param metadata - File chunk metadata
   * @returns True if initialized successfully
   */
  public initializeReassembly(metadata: FileChunkMetadata): boolean {
    const { fileId, fileName, fileSize } = metadata;

    // Validate file size
    if (fileSize > this.config.maxFileSize) {
      this.debug(
        `File ${fileName} (${fileSize} bytes) exceeds maximum size ` +
        `(${this.config.maxFileSize} bytes)`
      );
      return false;
    }

    // Check if already exists
    if (this.activeReassemblies.has(fileId)) {
      this.debug(`Reassembly already exists for file: ${fileName}`);
      return false;
    }

    // Initialize chunk buffer
    const buffer: ChunkBuffer = {
      metadata,
      chunks: new Map(),
      receivedIndexes: new Set(),
      checksums: new Map(),
      startTime: Date.now(),
      lastChunkTime: Date.now(),
    };

    this.activeReassemblies.set(fileId, buffer);
    this.debug(`Initialized reassembly for file: ${fileName} (${metadata.totalChunks} chunks)`);

    return true;
  }

  /**
   * Add a received chunk to the reassembly buffer
   *
   * @param chunk - File chunk to add
   * @returns Progress update or null if chunk is invalid
   */
  public async addChunk(chunk: FileChunk): Promise<ReassemblyProgress | null> {
    const { metadata, chunkIndex, data, checksum } = chunk;
    const { fileId, fileName, totalChunks, chunkSize } = metadata;

    // Get or initialize buffer
    let buffer = this.activeReassemblies.get(fileId);

    if (!buffer) {
      // Try to initialize if this is the first chunk
      if (!this.initializeReassembly(metadata)) {
        return null;
      }
      buffer = this.activeReassemblies.get(fileId)!;
    }

    // Validate metadata consistency
    if (buffer.metadata.fileId !== metadata.fileId) {
      this.debug(`Metadata mismatch for file: ${fileName}`);
      return null;
    }

    // Check if chunk already received
    if (buffer.receivedIndexes.has(chunkIndex)) {
      this.debug(`Chunk ${chunkIndex} already received for ${fileName}`);
      return this.getProgress(fileId);
    }

    // Verify chunk index bounds
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      this.debug(`Invalid chunk index ${chunkIndex} for ${fileName}`);
      return null;
    }

    // Verify checksum if enabled
    let verifiedChunks = 0;
    let failedChunks = 0;

    if (this.config.enableChecksumValidation && checksum) {
      const calculatedChecksum = await this.calculateChecksum(data);
      if (calculatedChecksum !== checksum) {
        this.debug(`Checksum mismatch for chunk ${chunkIndex} of ${fileName}`);
        failedChunks++;
        return this.getProgress(fileId);
      }
      verifiedChunks++;
      buffer.checksums.set(chunkIndex, checksum);
    }

    // Store chunk
    buffer.chunks.set(chunkIndex, data);
    buffer.receivedIndexes.add(chunkIndex);
    buffer.lastChunkTime = Date.now();

    this.debug(
      `Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} ` +
      `(${data.byteLength} bytes)`
    );

    // Check for memory limit
    const currentMemoryUsage = this.calculateMemoryUsage();
    if (currentMemoryUsage > this.config.maxMemoryUsage) {
      this.debug(`Memory usage (${currentMemoryUsage}) exceeds limit ` +
                 `(${this.config.maxMemoryUsage}), cleaning up`);
      this.cleanupStaleReassemblies();
    }

    return this.getProgress(fileId);
  }

  /**
   * Get reassembly progress for a file
   *
   * @param fileId - File ID to get progress for
   * @returns Progress information or null if not found
   */
  public getProgress(fileId: string): ReassemblyProgress | null {
    const buffer = this.activeReassemblies.get(fileId);

    if (!buffer) {
      return null;
    }

    const { metadata, chunks, receivedIndexes, checksums } = buffer;
    const receivedChunks = chunks.size;
    const totalChunks = metadata.totalChunks;
    const receivedBytes = Array.from(chunks.values())
      .reduce((sum, data) => sum + data.byteLength, 0);
    const totalBytes = metadata.fileSize;
    const percentage = (receivedBytes / totalBytes) * 100;

    return {
      fileId: metadata.fileId,
      fileName: metadata.fileName,
      status: receivedChunks === totalChunks ? 'verifying' : 'receiving',
      receivedChunks,
      totalChunks,
      receivedBytes,
      totalBytes,
      percentage,
      verifiedChunks: checksums.size,
      failedChunks: 0, // Track failed chunks if needed
    };
  }

  /**
   * Check if all chunks have been received for a file
   *
   * @param fileId - File ID to check
   * @returns True if all chunks received
   */
  public isComplete(fileId: string): boolean {
    const buffer = this.activeReassemblies.get(fileId);
    if (!buffer) {
      return false;
    }

    return buffer.receivedIndexes.size === buffer.metadata.totalChunks;
  }

  /**
   * Reassemble the file from received chunks
   *
   * @param fileId - File ID to reassemble
   * @returns Reassembly result
   */
  public async reassemble(fileId: string): Promise<ReassemblyResult> {
    const buffer = this.activeReassemblies.get(fileId);

    if (!buffer) {
      return {
        fileId,
        fileName: 'Unknown',
        file: new File([], 'unknown'),
        success: false,
        error: 'File not found in reassembly buffer',
        chunksVerified: 0,
        chunksFailed: 0,
        verificationPassed: false,
        transferDuration: 0,
      };
    }

    const { metadata, chunks, checksums, startTime } = buffer;
    const { fileName, fileType, totalChunks } = metadata;

    this.debug(`Reassembling file: ${fileName}`);

    // Verify all chunks are present
    if (chunks.size !== totalChunks) {
      const missing: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!chunks.has(i)) {
          missing.push(i);
        }
      }

      this.debug(`Missing chunks for ${fileName}: ${missing.join(', ')}`);

      return {
        fileId: metadata.fileId,
        fileName,
        file: new File([], fileName),
        success: false,
        error: `Missing ${missing.length} chunk(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
        chunksVerified: checksums.size,
        chunksFailed: 0,
        verificationPassed: false,
        transferDuration: Date.now() - startTime,
      };
    }

    try {
      // Reassemble file in order
      const sortedChunks = Array.from(chunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([, data]) => data);

      const totalSize = sortedChunks.reduce((sum, data) => sum + data.byteLength, 0);
      const combinedBuffer = new Uint8Array(totalSize);

      let offset = 0;
      for (const chunk of sortedChunks) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Create file from reassembled data
      const file = new File([combinedBuffer], fileName, {
        type: fileType,
        lastModified: metadata.lastModified || Date.now(),
      });

      // Verify file checksum if available
      let verificationPassed = true;
      if (this.config.enableChecksumValidation && metadata.checksum) {
        const fileChecksum = await this.calculateChecksum(await file.arrayBuffer());
        verificationPassed = fileChecksum === metadata.checksum;

        if (!verificationPassed) {
          this.debug(`File checksum mismatch for ${fileName}`);
        }
      }

      const transferDuration = Date.now() - startTime;

      const result: ReassemblyResult = {
        fileId: metadata.fileId,
        fileName,
        file,
        success: true,
        chunksVerified: checksums.size,
        chunksFailed: 0,
        verificationPassed,
        transferDuration,
      };

      // Store result and cleanup buffer
      this.completedReassemblies.set(fileId, result);
      this.activeReassemblies.delete(fileId);

      this.debug(`Successfully reassembled file: ${fileName} in ${transferDuration}ms`);

      return result;
    } catch (error) {
      this.debug(`Error reassembling file ${fileName}:`, error);

      return {
        fileId: metadata.fileId,
        fileName,
        file: new File([], fileName),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chunksVerified: checksums.size,
        chunksFailed: 0,
        verificationPassed: false,
        transferDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel an active reassembly
   *
   * @param fileId - File ID to cancel
   * @returns True if cancelled successfully
   */
  public cancelReassembly(fileId: string): boolean {
    const buffer = this.activeReassemblies.get(fileId);
    if (buffer) {
      this.activeReassemblies.delete(fileId);
      this.debug(`Cancelled reassembly for file: ${buffer.metadata.fileName}`);
      return true;
    }
    return false;
  }

  /**
   * Get completed reassembly result
   *
   * @param fileId - File ID
   * @returns Reassembly result or null
   */
  public getCompletedResult(fileId: string): ReassemblyResult | null {
    return this.completedReassemblies.get(fileId) || null;
  }

  /**
   * Clean up stale reassemblies
   */
  private cleanupStaleReassemblies(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [fileId, buffer] of this.activeReassemblies.entries()) {
      const idleTime = now - buffer.lastChunkTime;
      if (idleTime > staleThreshold) {
        this.debug(`Cleaning up stale reassembly for: ${buffer.metadata.fileName}`);
        this.activeReassemblies.delete(fileId);
      }
    }
  }

  /**
   * Calculate current memory usage
   *
   * @returns Memory usage in bytes
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const buffer of this.activeReassemblies.values()) {
      for (const chunk of buffer.chunks.values()) {
        total += chunk.byteLength;
      }
    }
    return total;
  }

  /**
   * Calculate checksum for data integrity verification
   *
   * @param data - Data to calculate checksum for
   * @returns Hex string checksum
   */
  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Destroy the reassembler and cleanup resources
   */
  public destroy(): void {
    this.debug('Destroying FileReassembler');
    this.activeReassemblies.clear();
    this.completedReassemblies.clear();
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: unknown): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[FileReassembler] ${message}`, data);
      } else {
        console.log(`[FileReassembler] ${message}`);
      }
    }
  }
}

/**
 * Helper function to create a reassembler with default configuration
 *
 * @param config - Optional reassembler configuration
 * @returns Configured reassembler instance
 */
export function createFileReassembler(config?: FileReassemblerConfig): FileReassembler {
  return new FileReassembler(config);
}

export default FileReassembler;
