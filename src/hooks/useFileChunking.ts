/**
 * React hook for file chunking functionality
 *
 * Provides a simple interface for chunking files and tracking progress.
 */

import { useState, useCallback, useRef } from 'react';
import {
  FileChunker,
  type FileChunk,
  type FileChunkerConfig,
  type ChunkingProgress,
} from '@/lib/webrtc';

export interface UseFileChunkingResult {
  chunkFile: (file: File) => Promise<FileChunk[]>;
  isChunking: boolean;
  progress: ChunkingProgress | null;
  error: Error | null;
  cancel: () => void;
  reset: () => void;
}

export interface UseFileChunkingOptions extends FileChunkerConfig {
  onProgress?: (progress: ChunkingProgress) => void;
  onComplete?: (chunks: FileChunk[]) => void;
  onError?: (error: Error) => void;
}

export function useFileChunking(options: UseFileChunkingOptions = {}): UseFileChunkingResult {
  const [isChunking, setIsChunking] = useState(false);
  const [progress, setProgress] = useState<ChunkingProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const chunkerRef = useRef<FileChunker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onProgress,
    onComplete,
    onError,
    ...chunkerConfig
  } = options;

  const chunkFile = useCallback(async (file: File): Promise<FileChunk[]> => {
    // Reset state
    setIsChunking(true);
    setProgress(null);
    setError(null);

    // Create new chunker instance
    const chunker = new FileChunker({
      ...chunkerConfig,
      debug: chunkerConfig.debug ?? false,
    });
    chunkerRef.current = chunker;

    const chunks: FileChunk[] = [];

    try {
      // Chunk the file
      for await (const chunk of chunker.chunkFile(file, (prog) => {
        setProgress(prog);
        onProgress?.(prog);
      })) {
        chunks.push(chunk);
      }

      // Call completion callback
      onComplete?.(chunks);

      return chunks;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to chunk file');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsChunking(false);
      chunker.destroy();
      chunkerRef.current = null;
    }
  }, [chunkerConfig, onProgress, onComplete, onError]);

  const cancel = useCallback(() => {
    if (chunkerRef.current) {
      chunkerRef.current.cancelAll();
      setIsChunking(false);
      setProgress(null);
      setError(new Error('File chunking was cancelled'));
    }
  }, []);

  const reset = useCallback(() => {
    setIsChunking(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    chunkFile,
    isChunking,
    progress,
    error,
    cancel,
    reset,
  };
}

export default useFileChunking;
