/**
 * React hook for file reassembly functionality
 *
 * Provides a simple interface for reassembling received file chunks.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FileReassembler,
  type FileReassemblerConfig,
  type FileChunk,
  type ReassemblyProgress,
  type ReassemblyResult,
} from '@/lib/webrtc';
import { downloadFile, createDownloadManager, type DownloadResult } from '@/lib/utils/file-download';

export interface UseFileReassemblyResult {
  initializeFile: (metadata: import('@/lib/webrtc').FileChunkMetadata) => boolean;
  addChunk: (chunk: FileChunk) => Promise<void>;
  reassemble: (fileId: string) => Promise<ReassemblyResult>;
  downloadFile: (fileId: string, autoDownload?: boolean) => Promise<DownloadResult>;
  getProgress: (fileId: string) => ReassemblyProgress | null;
  isComplete: (fileId: string) => boolean;
  cancel: (fileId: string) => boolean;
  reset: () => void;
  progress: Map<string, ReassemblyProgress>;
  results: Map<string, ReassemblyResult>;
  downloadUrls: Map<string, string>;
  isReassembling: boolean;
}

export interface UseFileReassemblyOptions extends FileReassemblerConfig {
  onProgress?: (fileId: string, progress: ReassemblyProgress) => void;
  onComplete?: (result: ReassemblyResult) => void;
  onError?: (fileId: string, error: string) => void;
  autoDownload?: boolean; // Auto-download files after reassembly
}

export function useFileReassembly(options: UseFileReassemblyOptions = {}): UseFileReassemblyResult {
  const [progress, setProgress] = useState<Map<string, ReassemblyProgress>>(new Map());
  const [results, setResults] = useState<Map<string, ReassemblyResult>>(new Map());
  const [downloadUrls, setDownloadUrls] = useState<Map<string, string>>(new Map());
  const [isReassembling, setIsReassembling] = useState(false);

  const reassemblerRef = useRef<FileReassembler | null>(null);
  const progressRef = useRef<Map<string, ReassemblyProgress>>(new Map());
  const downloadManagerRef = useRef(createDownloadManager());

  const {
    onProgress,
    onComplete,
    onError,
    autoDownload = true,
    ...reassemblerConfig
  } = options;

  // Initialize reassembler
  useEffect(() => {
    const reassembler = new FileReassembler({
      ...reassemblerConfig,
      debug: reassemblerConfig.debug ?? false,
    });
    reassemblerRef.current = reassembler;

    return () => {
      reassembler.destroy();
      downloadManagerRef.current.cleanupAll();
    };
  }, [reassemblerConfig.debug, reassemblerConfig.enableChecksumValidation]);

  const initializeFile = useCallback((metadata: import('@/lib/webrtc').FileChunkMetadata): boolean => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      return false;
    }

    return reassembler.initializeReassembly(metadata);
  }, []);

  const addChunk = useCallback(async (chunk: FileChunk): Promise<void> => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      throw new Error('Reassembler not initialized');
    }

    setIsReassembling(true);

    try {
      const prog = await reassembler.addChunk(chunk);

      if (prog) {
        progressRef.current.set(chunk.metadata.fileId, prog);
        setProgress(new Map(progressRef.current));
        onProgress?.(chunk.metadata.fileId, prog);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(chunk.metadata.fileId, errorMessage);
      throw error;
    } finally {
      setIsReassembling(false);
    }
  }, [onProgress, onError]);

  const reassemble = useCallback(async (fileId: string): Promise<ReassemblyResult> => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      throw new Error('Reassembler not initialized');
    }

    setIsReassembling(true);

    try {
      const result = await reassembler.reassemble(fileId);

      // Update results
      const newResults = new Map(results);
      newResults.set(fileId, result);
      setResults(newResults);
      results.set(fileId, result);

      // Remove from progress
      progressRef.current.delete(fileId);
      setProgress(new Map(progressRef.current));

      // Auto-download if enabled and reassembly succeeded
      if (result.success && autoDownload) {
        const downloadResult = downloadFile(result.file, { autoDownload: true });
        if (downloadResult.success && downloadResult.url) {
          const newUrls = new Map(downloadUrls);
          newUrls.set(fileId, downloadResult.url);
          setDownloadUrls(newUrls);

          toast.success(`File "${result.fileName}" downloaded successfully!`);
        }
      }

      // Call completion callback
      if (result.success) {
        onComplete?.(result);
      } else {
        onError?.(fileId, result.error || 'Unknown error');
      }

      return result;
    } finally {
      setIsReassembling(false);
    }
  }, [results, downloadUrls, onComplete, onError, autoDownload]);

  const getProgress = useCallback((fileId: string): ReassemblyProgress | null => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      return null;
    }

    return reassembler.getProgress(fileId);
  }, []);

  const isComplete = useCallback((fileId: string): boolean => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      return false;
    }

    return reassembler.isComplete(fileId);
  }, []);

  const cancel = useCallback((fileId: string): boolean => {
    const reassembler = reassemblerRef.current;
    if (!reassembler) {
      return false;
    }

    const cancelled = reassembler.cancelReassembly(fileId);

    if (cancelled) {
      progressRef.current.delete(fileId);
      setProgress(new Map(progressRef.current));
    }

    return cancelled;
  }, []);

  const reset = useCallback(() => {
    setProgress(new Map());
    setResults(new Map());
    setDownloadUrls(new Map());
    setIsReassembling(false);
    progressRef.current.clear();
    downloadManagerRef.current.cleanupAll();
  }, []);

  const downloadFileHandler = useCallback(async (fileId: string, autoDownload = true): Promise<DownloadResult> => {
    const result = results.get(fileId);

    if (!result || !result.success) {
      return {
        success: false,
        error: 'File not found or reassembly failed',
      };
    }

    const downloadResult = downloadFile(result.file, { autoDownload });

    if (downloadResult.success && downloadResult.url) {
      const newUrls = new Map(downloadUrls);
      newUrls.set(fileId, downloadResult.url);
      setDownloadUrls(newUrls);
    }

    return downloadResult;
  }, [results, downloadUrls]);

  return {
    initializeFile,
    addChunk,
    reassemble,
    downloadFile: downloadFileHandler,
    getProgress,
    isComplete,
    cancel,
    reset,
    progress,
    results,
    downloadUrls,
    isReassembling,
  };
}

export default useFileReassembly;
