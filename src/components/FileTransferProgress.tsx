'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

/**
 * Transfer direction type
 */
export type TransferDirection = 'upload' | 'download';

/**
 * Transfer status type
 */
export type TransferStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

/**
 * File transfer progress information
 */
export interface FileTransferProgress {
  transferId: string;
  fileName: string;
  fileSize: number;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0-100
  transferSpeed?: number; // bytes per second
  timeRemaining?: number; // seconds
  peerId?: string;
  error?: string;
}

/**
 * Props for FileTransferProgress component
 */
export interface FileTransferProgressProps {
  transfer: FileTransferProgress;
  onCancel?: (transferId: string) => void;
  onRetry?: (transferId: string) => void;
  className?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format transfer speed for display
 */
function formatTransferSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format time remaining for display
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * FileTransferProgress Component
 *
 * Displays real-time progress for active file transfers with:
 * - Progress bar with percentage
 * - Transfer speed
 * - Estimated time remaining
 * - File name and size
 * - Status indicators
 */
export const FileTransferProgress: React.FC<FileTransferProgressProps> = ({
  transfer,
  onCancel,
  onRetry,
  className,
}) => {
  const {
    fileName,
    fileSize,
    direction,
    status,
    progress,
    transferSpeed,
    timeRemaining,
    error,
  } = transfer;

  // Determine icon based on direction and status
  const Icon = useMemo(() => {
    if (status === 'completed') {
      return CheckIcon;
    }
    if (status === 'failed' || status === 'cancelled') {
      return ExclamationTriangleIcon;
    }
    return direction === 'upload' ? CloudArrowUpIcon : CloudArrowDownIcon;
  }, [direction, status]);

  // Determine color scheme based on status
  const statusColors = useMemo(() => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: 'text-green-500',
          progress: 'bg-green-500',
        };
      case 'failed':
      case 'cancelled':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500',
          progress: 'bg-red-500',
        };
      case 'in-progress':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-500',
          progress: 'bg-blue-500',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'text-gray-500',
          progress: 'bg-gray-500',
        };
    }
  }, [status]);

  // Calculate progress bar width
  const progressWidth = `${Math.max(0, Math.min(100, progress))}%`;

  return (
    <motion.div
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-200',
        statusColors.bg,
        statusColors.border,
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with icon and file info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={cn('flex-shrink-0', statusColors.icon)}>
            <Icon className="w-5 h-5" />
          </div>

          {/* File information */}
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium truncate', statusColors.text)}>
              {fileName}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileSize)}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground capitalize">
                {direction}
              </p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className={cn('text-xs font-medium capitalize', statusColors.text)}>
                {status.replace('-', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 ml-2">
          {(status === 'pending' || status === 'in-progress') && onCancel && (
            <motion.button
              onClick={() => onCancel(transfer.transferId)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Cancel transfer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <XMarkIcon className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
          {(status === 'failed' || status === 'cancelled') && onRetry && (
            <motion.button
              onClick={() => onRetry(transfer.transferId)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Retry transfer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(status === 'pending' || status === 'in-progress') && (
        <div className="space-y-2">
          {/* Progress bar track */}
          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={cn('absolute top-0 left-0 h-full rounded-full', statusColors.progress)}
              initial={{ width: 0 }}
              animate={{ width: progressWidth }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Progress details */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <span className={cn('font-medium', statusColors.text)}>
                {progress.toFixed(1)}%
              </span>
              {transferSpeed !== undefined && transferSpeed > 0 && (
                <span className="text-muted-foreground">
                  {formatTransferSpeed(transferSpeed)}
                </span>
              )}
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <span className="text-muted-foreground">
                  {formatTimeRemaining(timeRemaining)} remaining
                </span>
              )}
            </div>
            <span className="text-muted-foreground">
              {formatFileSize(fileSize * (progress / 100))} / {formatFileSize(fileSize)}
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (status === 'failed' || status === 'cancelled') && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Completed indicator */}
      {status === 'completed' && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
          Transfer completed successfully
        </div>
      )}
    </motion.div>
  );
};

/**
 * FileTransferProgressList Component
 *
 * Displays a list of file transfers with their progress
 */
export interface FileTransferProgressListProps {
  transfers: FileTransferProgress[];
  onCancel?: (transferId: string) => void;
  onRetry?: (transferId: string) => void;
  className?: string;
  maxVisible?: number;
}

export const FileTransferProgressList: React.FC<FileTransferProgressListProps> = ({
  transfers,
  onCancel,
  onRetry,
  className,
  maxVisible,
}) => {
  const visibleTransfers = maxVisible
    ? transfers.slice(0, maxVisible)
    : transfers;

  const hasActiveTransfers = transfers.some(
    t => t.status === 'pending' || t.status === 'in-progress'
  );

  if (transfers.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      {hasActiveTransfers && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            Active Transfers ({transfers.length})
          </h3>
        </div>
      )}

      {/* Transfer list */}
      <div className="space-y-2">
        {visibleTransfers.map((transfer) => (
          <FileTransferProgress
            key={transfer.transferId}
            transfer={transfer}
            onCancel={onCancel}
            onRetry={onRetry}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {maxVisible && transfers.length > maxVisible && (
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            +{transfers.length - maxVisible} more transfer{transfers.length - maxVisible > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileTransferProgress;
