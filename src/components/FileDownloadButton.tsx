'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileIcon } from '@/lib/utils/file-download';
import type { ReassemblyResult } from '@/lib/webrtc';

export interface FileDownloadButtonProps {
  result: ReassemblyResult;
  onDownload?: (result: ReassemblyResult) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showFileSize?: boolean;
  showIcon?: boolean;
}

export const FileDownloadButton: React.FC<FileDownloadButtonProps> = ({
  result,
  onDownload,
  disabled = false,
  className,
  variant = 'default',
  showFileSize = true,
  showIcon = true,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (isDownloading || disabled || !result.success) {
      return;
    }

    setIsDownloading(true);

    try {
      // Create download link
      const url = URL.createObjectURL(result.file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Auto-revoke URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setDownloaded(true);
      onDownload?.(result);

      // Reset downloaded state after 3 seconds
      setTimeout(() => setDownloaded(false), 3000);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!result.success) {
    return (
      <div className={cn('flex items-center space-x-2 text-destructive', className)}>
        <XCircleIcon className="w-5 h-5" />
        <span className="text-sm">Failed to assemble file</span>
        {result.error && (
          <span className="text-xs text-muted-foreground">({result.error})</span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleDownload}
        disabled={disabled || isDownloading}
        size="sm"
        variant={downloaded ? 'secondary' : 'default'}
        className={cn('relative', className)}
      >
        {isDownloading ? (
          <>
            <span className="animate-pulse">Downloading...</span>
          </>
        ) : downloaded ? (
          <>
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            Downloaded
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Download
          </>
        )}
      </Button>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        className={cn(
          'p-4 bg-card rounded-lg border border-border',
          'hover:border-primary/50 transition-colors',
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {showIcon && (
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
                {getFileIcon(result.file.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {result.fileName}
              </h4>
              {showFileSize && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(result.file.size)}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                <span>Chunks: {result.chunksVerified}</span>
                <span>Duration: {(result.transferDuration / 1000).toFixed(2)}s</span>
                {result.verificationPassed && (
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={disabled || isDownloading}
            variant={downloaded ? 'secondary' : 'default'}
            size="sm"
          >
            {isDownloading ? (
              <>
                <span className="animate-pulse">Downloading...</span>
              </>
            ) : downloaded ? (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Downloaded
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      className={cn(
        'flex items-center justify-between p-3 bg-card rounded-lg border border-border',
        'hover:bg-accent/50 transition-colors',
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {showIcon && (
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center text-xl">
            {getFileIcon(result.file.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {result.fileName}
          </p>
          {showFileSize && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(result.file.size)}
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={handleDownload}
        disabled={disabled || isDownloading}
        variant={downloaded ? 'secondary' : 'default'}
        size="sm"
        className="ml-2"
      >
        {isDownloading ? (
          <span className="animate-pulse">...</span>
        ) : downloaded ? (
          <CheckCircleIcon className="w-4 h-4" />
        ) : (
          <ArrowDownTrayIcon className="w-4 h-4" />
        )}
      </Button>
    </motion.div>
  );
};

export default FileDownloadButton;
