'use client';

import React, { useState, useEffect } from 'react';
import FileDropzone from '@/components/FileDropzone';
import {
  FileTransferProgressList,
  type FileTransferProgress,
} from '@/components/FileTransferProgress';
import { useFileTransferProgress } from '@/hooks/useFileTransferProgress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedSection } from '@/components/animated';

/**
 * Demo page for file transfer progress bars
 *
 * This demonstrates the real-time progress tracking feature with:
 * - Upload progress simulation
 * - Download progress simulation
 * - Speed calculation
 * - ETA estimation
 * - Multiple concurrent transfers
 */
export default function FileTransferProgressDemo() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const {
    transfers,
    activeTransfers,
    addTransfer,
    updateTransferProgress,
    setTransferStatus,
    cancelTransfer,
    clearCompleted,
  } = useFileTransferProgress({
    updateInterval: 500,
    debug: true,
  });

  /**
   * Handle file selection from dropzone
   */
  const handleFileDrop = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  /**
   * Simulate file upload
   */
  const simulateUpload = (file: File) => {
    const transferId = `upload-${Date.now()}-${Math.random()}`;

    // Add transfer as pending
    addTransfer({
      transferId,
      fileName: file.name,
      fileSize: file.size,
      direction: 'upload',
      status: 'pending',
      progress: 0,
    });

    // Start upload after a brief delay
    setTimeout(() => {
      setTransferStatus(transferId, 'in-progress');

      let progress = 0;
      const uploadInterval = setInterval(() => {
        progress += Math.random() * 15; // Random progress increment

        if (progress >= 100) {
          progress = 100;
          clearInterval(uploadInterval);
          setTransferStatus(transferId, 'completed');
          updateTransferProgress(transferId, progress);
        } else {
          updateTransferProgress(transferId, progress);
        }
      }, 500);

      // Cleanup on unmount
      return () => clearInterval(uploadInterval);
    }, 1000);
  };

  /**
   * Simulate file download
   */
  const simulateDownload = (fileName: string, fileSize: number) => {
    const transferId = `download-${Date.now()}-${Math.random()}`;

    // Add transfer as pending
    addTransfer({
      transferId,
      fileName,
      fileSize,
      direction: 'download',
      status: 'pending',
      progress: 0,
    });

    // Start download after a brief delay
    setTimeout(() => {
      setTransferStatus(transferId, 'in-progress');

      let progress = 0;
      const downloadInterval = setInterval(() => {
        progress += Math.random() * 10; // Slower than upload

        if (progress >= 100) {
          progress = 100;
          clearInterval(downloadInterval);
          setTransferStatus(transferId, 'completed');
          updateTransferProgress(transferId, progress);
        } else {
          updateTransferProgress(transferId, progress);
        }
      }, 500);

      // Cleanup on unmount
      return () => clearInterval(downloadInterval);
    }, 1000);
  };

  /**
   * Simulate a failed transfer
   */
  const simulateFailedTransfer = () => {
    const transferId = `failed-${Date.now()}`;
    const file = selectedFiles[0] || new File(['test'], 'failed-file.txt', { type: 'text/plain' });

    addTransfer({
      transferId,
      fileName: file.name,
      fileSize: file.size,
      direction: 'upload',
      status: 'in-progress',
      progress: 0,
    });

    // Simulate failure at 50%
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      if (progress >= 50) {
        clearInterval(interval);
        setTransferStatus(transferId, 'failed', 'Connection lost - transfer failed');
      } else {
        updateTransferProgress(transferId, progress);
      }
    }, 300);
  };

  /**
   * Auto-clear completed transfers periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      clearCompleted(10000); // Clear after 10 seconds
    }, 5000);

    return () => clearInterval(interval);
  }, [clearCompleted]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <AnimatedSection>
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            File Transfer Progress Demo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time progress bars with transfer speed and estimated time remaining
          </p>
        </div>
      </AnimatedSection>

      {/* Demo Controls */}
      <AnimatedSection delay={0.1}>
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Demo Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Upload all selected files */}
            <Button
              onClick={() => selectedFiles.forEach(simulateUpload)}
              disabled={selectedFiles.length === 0}
              className="w-full"
            >
              Upload Selected Files ({selectedFiles.length})
            </Button>

            {/* Simulate download */}
            <Button
              onClick={() => {
                const sizes = [1024, 10240, 102400, 1048576];
                const size = sizes[Math.floor(Math.random() * sizes.length)] as number;
                simulateDownload(`download-${Date.now()}.bin`, size);
              }}
              variant="outline"
              className="w-full"
            >
              Simulate Download
            </Button>

            {/* Simulate failed transfer */}
            <Button
              onClick={simulateFailedTransfer}
              variant="destructive"
              className="w-full"
            >
              Simulate Failure
            </Button>

            {/* Clear all */}
            <Button
              onClick={() => {
                setSelectedFiles([]);
                transfers.forEach(t => cancelTransfer(t.transferId));
              }}
              variant="ghost"
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </Card>
      </AnimatedSection>

      {/* File Dropzone */}
      <AnimatedSection delay={0.2}>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Select Files to Upload
          </h2>
          <FileDropzone
            onDrop={handleFileDrop}
            maxSize={50 * 1024 * 1024} // 50MB
            maxFiles={10}
          />
        </Card>
      </AnimatedSection>

      {/* Active Transfers */}
      {activeTransfers.length > 0 && (
        <AnimatedSection delay={0.3}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Active Transfers ({activeTransfers.length})
              </h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live Updates</span>
              </div>
            </div>
            <FileTransferProgressList
              transfers={transfers.filter(t =>
                t.status === 'pending' || t.status === 'in-progress'
              )}
              onCancel={(transferId) => {
                cancelTransfer(transferId);
              }}
            />
          </Card>
        </AnimatedSection>
      )}

      {/* Completed Transfers */}
      {transfers.filter(t => t.status === 'completed').length > 0 && (
        <AnimatedSection delay={0.4}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Completed Transfers ({transfers.filter(t => t.status === 'completed').length})
            </h2>
            <FileTransferProgressList
              transfers={transfers.filter(t => t.status === 'completed')}
              maxVisible={5}
            />
          </Card>
        </AnimatedSection>
      )}

      {/* Failed Transfers */}
      {transfers.filter(t => t.status === 'failed' || t.status === 'cancelled').length > 0 && (
        <AnimatedSection delay={0.5}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Failed Transfers ({transfers.filter(t => t.status === 'failed' || t.status === 'cancelled').length})
            </h2>
            <FileTransferProgressList
              transfers={transfers.filter(t => t.status === 'failed' || t.status === 'cancelled')}
              onRetry={(transferId) => {
                const transfer = transfers.find(t => t.transferId === transferId);
                if (transfer) {
                  simulateUpload(new File(['retry'], transfer.fileName, { type: 'application/octet-stream' }));
                }
              }}
            />
          </Card>
        </AnimatedSection>
      )}

      {/* Statistics */}
      <AnimatedSection delay={0.6}>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Transfer Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">
                {activeTransfers.length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">
                {transfers.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">
                {transfers.filter(t => t.status === 'failed').length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-500">
                {transfers.filter(t => t.direction === 'upload').length} / {transfers.filter(t => t.direction === 'download').length}
              </p>
              <p className="text-sm text-muted-foreground">Up / Down</p>
            </div>
          </div>
        </Card>
      </AnimatedSection>
    </div>
  );
}
