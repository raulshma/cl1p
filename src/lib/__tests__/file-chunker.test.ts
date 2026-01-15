/**
 * Unit Tests for File Chunker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FileChunker,
  createFileChunks,
  estimateTransferSize,
  type FileChunk,
  type ChunkingProgress,
} from '../webrtc/file-chunker';

describe('File Chunker', () => {
  let chunker: FileChunker;

  beforeEach(() => {
    chunker = new FileChunker({ chunkSize: 1024, enableChecksums: true });
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const defaultChunker = new FileChunker();
      expect(defaultChunker).toBeInstanceOf(FileChunker);
    });

    it('should initialize with custom config', () => {
      const customChunker = new FileChunker({
        chunkSize: 2048,
        enableChecksums: false,
        maxChunkSize: 4096,
      });
      expect(customChunker).toBeInstanceOf(FileChunker);
    });

    it('should throw error for invalid chunk size', () => {
      expect(() => new FileChunker({
        chunkSize: 128 * 1024, // 128KB
        maxChunkSize: 64 * 1024, // 64KB
      })).toThrow('cannot exceed max chunk size');
    });
  });

  describe('chunkFile', () => {
    it('should chunk a small file into single chunk', async () => {
      const content = 'Small file content';
      const file = new File([content], 'small.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.metadata.totalChunks).toBe(1);
      expect(chunks[0]?.chunkIndex).toBe(0);
    });

    it('should chunk a large file into multiple chunks', async () => {
      const content = new Array(2048).fill('a').join(''); // 2KB
      const file = new File([content], 'large.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]?.metadata.totalChunks).toBe(chunks.length);
    });

    it('should include correct metadata in chunks', async () => {
      const content = 'Test content';
      const file = new File([content], 'test.txt', { type: 'text/plain', lastModified: Date.now() });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks[0]?.metadata.fileName).toBe('test.txt');
      expect(chunks[0]?.metadata.fileType).toBe('text/plain');
      expect(chunks[0]?.metadata.fileSize).toBe(content.length);
      expect(chunks[0]?.metadata.chunkSize).toBe(1024);
      expect(chunks[0]?.metadata.fileId).toBeTruthy();
    });

    it('should generate unique file IDs', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      let fileId1: string | undefined;
      let fileId2: string | undefined;

      for await (const chunk of chunker.chunkFile(file1)) {
        fileId1 = chunk.metadata.fileId;
        break;
      }

      for await (const chunk of chunker.chunkFile(file2)) {
        fileId2 = chunk.metadata.fileId;
        break;
      }

      expect(fileId1).toBeTruthy();
      expect(fileId2).toBeTruthy();
      expect(fileId1).not.toBe(fileId2);
    });

    it('should generate checksums when enabled', async () => {
      const content = 'Test content for checksum';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks[0]?.checksum).toBeTruthy();
      expect(chunks[0]?.checksum?.length).toBe(64); // SHA-256 hex length
    });

    it('should not generate checksums when disabled', async () => {
      const noChecksumChunker = new FileChunker({ enableChecksums: false });
      const content = 'Test content';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of noChecksumChunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks[0]?.checksum).toBeUndefined();
    });

    it('should call progress callback', async () => {
      const content = new Array(2048).fill('a').join('');
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const progressUpdates: ChunkingProgress[] = [];
      for await (const _chunk of chunker.chunkFile(file, (progress) => {
        progressUpdates.push(progress);
      })) {
        // Consume chunks
      }

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]?.currentChunk).toBe(0);
      expect(progressUpdates[0]?.percentage).toBeGreaterThan(0);
      expect(progressUpdates[0]?.percentage).toBeLessThanOrEqual(100);
    });

    it('should maintain data integrity across chunks', async () => {
      const content = 'Repeated content '.repeat(100);
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      // Reassemble chunks
      let reassembled = '';
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      for (const chunk of chunks) {
        const decoder = new TextDecoder();
        reassembled += decoder.decode(chunk.data);
      }

      expect(reassembled).toBe(content);
    });

    it('should index chunks correctly', async () => {
      const content = new Array(2048).fill('a').join('');
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i]?.chunkIndex).toBe(i);
      }
    });
  });

  describe('calculateFileChecksum', () => {
    it('should calculate file checksum', async () => {
      const content = 'Test content for checksum';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const checksum = await chunker.calculateFileChecksum(file);

      expect(checksum).toBeTruthy();
      expect(checksum.length).toBe(64); // SHA-256 hex length
    });

    it('should generate different checksums for different files', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      const checksum1 = await chunker.calculateFileChecksum(file1);
      const checksum2 = await chunker.calculateFileChecksum(file2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should generate same checksum for same content', async () => {
      const content = 'Same content';
      const file1 = new File([content], 'file1.txt', { type: 'text/plain' });
      const file2 = new File([content], 'file2.txt', { type: 'text/plain' });

      const checksum1 = await chunker.calculateFileChecksum(file1);
      const checksum2 = await chunker.calculateFileChecksum(file2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('estimateChunkCount', () => {
    it('should estimate chunk count correctly', () => {
      expect(chunker.estimateChunkCount(1024)).toBe(1);
      expect(chunker.estimateChunkCount(2048)).toBe(2);
      expect(chunker.estimateChunkCount(1536)).toBe(2);
      expect(chunker.estimateChunkCount(0)).toBe(0);
    });

    it('should use configured chunk size', () => {
      const customChunker = new FileChunker({ chunkSize: 2048 });
      expect(customChunker.estimateChunkCount(4096)).toBe(2);
      expect(customChunker.estimateChunkCount(2048)).toBe(1);
    });
  });

  describe('isValidChunkSize', () => {
    it('should validate chunk sizes', () => {
      expect(chunker.isValidChunkSize(1024)).toBe(true);
      expect(chunker.isValidChunkSize(64 * 1024)).toBe(true);
      expect(chunker.isValidChunkSize(0)).toBe(false);
      expect(chunker.isValidChunkSize(-1)).toBe(false);
      expect(chunker.isValidChunkSize(128 * 1024)).toBe(false); // Exceeds max
    });

    it('should respect max chunk size', () => {
      const customChunker = new FileChunker({ maxChunkSize: 32 * 1024 });
      expect(customChunker.isValidChunkSize(32 * 1024)).toBe(true);
      expect(customChunker.isValidChunkSize(33 * 1024)).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      const chunker = new FileChunker();
      chunker.destroy();
      // If we get here without error, destroy worked
      expect(true).toBe(true);
    });
  });

  describe('createFileChunks helper', () => {
    it('should chunk file with default config', async () => {
      const content = 'Test content';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of createFileChunks(file)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.metadata.fileName).toBe('test.txt');
    });

    it('should accept custom config', async () => {
      const content = new Array(2048).fill('a').join('');
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of createFileChunks(file, { chunkSize: 512 })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should call progress callback', async () => {
      const content = 'Test content';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      let progressCalled = false;
      for await (const _chunk of createFileChunks(file, undefined, (progress) => {
        progressCalled = true;
        expect(progress).toBeDefined();
      })) {
        // Consume chunks
      }

      expect(progressCalled).toBe(true);
    });
  });

  describe('estimateTransferSize', () => {
    it('should estimate transfer size', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const estimate = estimateTransferSize(file, 1024);

      expect(estimate).toBeGreaterThan(file.size);
      expect(estimate).toBeLessThan(file.size + 1000);
    });

    it('should use custom chunk size', () => {
      const file = new File([new Array(2048).fill('a').join('')], 'test.txt', { type: 'text/plain' });
      const estimate1 = estimateTransferSize(file, 1024);
      const estimate2 = estimateTransferSize(file, 2048);

      // Smaller chunks mean more metadata overhead
      expect(estimate1).toBeGreaterThan(estimate2);
    });

    it('should calculate metadata overhead correctly', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const baseMetadataSize = 200;
      const chunkSize = 1024;

      const estimate = estimateTransferSize(file, chunkSize);
      const expectedChunks = Math.ceil(file.size / chunkSize);
      const expectedSize = file.size + (baseMetadataSize * expectedChunks);

      expect(estimate).toBe(expectedSize);
    });
  });

  describe('Edge Cases', () => {
    it('should handle file size exactly matching chunk size', async () => {
      const content = new Array(1024).fill('a').join('');
      const file = new File([content], 'exact.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
    });

    it('should handle file size one byte less than chunk size', async () => {
      const content = new Array(1023).fill('a').join('');
      const file = new File([content], 'one-less.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.data.byteLength).toBe(1023);
    });

    it('should handle file size one byte more than chunk size', async () => {
      const content = new Array(1025).fill('a').join('');
      const file = new File([content], 'one-more.txt', { type: 'text/plain' });

      const chunks: FileChunk[] = [];
      for await (const chunk of chunker.chunkFile(file)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.data.byteLength).toBe(1024);
      expect(chunks[1]?.data.byteLength).toBe(1);
    });
  });
});
