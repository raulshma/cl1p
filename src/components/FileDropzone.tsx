'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { FileDropzoneSkeleton } from './skeletons';
import {
  validateFile,
  sanitizeFilenameForPath,
  formatFileSize,
  SAFE_FILE_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
  type FileValidationResult,
} from '@/lib/utils';
import { createFileTransferRateLimiter } from '@/lib/utils/rate-limiter';

export interface FileDropzoneProps {
  onDrop?: (files: File[]) => void;
  onValidationError?: (error: FileValidationResult, file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export interface FileWithPreview extends File {
  preview?: string;
  sanitizedFilename?: string;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  onDrop,
  onValidationError,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md', '.csv'],
    'application/json': ['.json'],
    'application/zip': ['.zip'],
  },
  maxSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = 5,
  disabled = false,
  isLoading = false,
  className,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Create rate limiter for file transfers (1 transfer per 2 seconds)
  const rateLimiterRef = useRef(createFileTransferRateLimiter(false));

  const onDropCallback = useCallback(
    (acceptedFiles: File[]) => {
      // Check rate limit before processing files
      const rateLimitResult = rateLimiterRef.current.checkLimit();

      if (!rateLimitResult.allowed) {
        const errorMessage = `File transfer rate limited. Please wait ${Math.ceil((rateLimitResult.retryAfter || 0) / 1000)} seconds before uploading again.`;
        setRateLimitError(errorMessage);
        setTimeout(() => setRateLimitError(null), 3000);
        return;
      }

      // Clear rate limit error if allowed
      setRateLimitError(null);

      const validFiles: File[] = [];
      const newErrors = new Map<string, string>();

      acceptedFiles.forEach((file) => {
        // Validate file
        const validation = validateFile(file, {
          maxSize,
          allowedExtensions: SAFE_FILE_EXTENSIONS,
          sanitizeFilename: true,
          checkEmpty: true,
        });

        if (validation.isValid) {
          const fileWithPreview = Object.assign(file, {
            preview: URL.createObjectURL(file),
            sanitizedFilename: validation.sanitizedFilename || sanitizeFilenameForPath(file.name),
          }) as FileWithPreview;

          validFiles.push(fileWithPreview);
        } else {
          // Store error for this file
          newErrors.set(file.name, validation.error?.message || 'Invalid file');
          // Call validation error callback if provided
          if (onValidationError) {
            onValidationError(validation, file);
          }
        }
      });

      // Update files state
      setFiles((prev) => [...prev, ...validFiles]);

      // Update errors state
      setErrors(newErrors);

      // Call onDrop with valid files
      if (onDrop && validFiles.length > 0) {
        onDrop(validFiles);
      }
    },
    [onDrop, onValidationError, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: onDropCallback,
    accept,
    maxSize,
    maxFiles,
    disabled: disabled || isLoading,
  });

  // Show skeleton while loading (moved after all hooks)
  if (isLoading) {
    return <FileDropzoneSkeleton className={className} />;
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });

    // Also remove error for this file if exists
    setErrors((prev) => {
      const newErrors = new Map(prev);
      const fileName = files[index]?.name;
      if (fileName) {
        newErrors.delete(fileName);
      }
      return newErrors;
    });
  };

  const dismissError = (fileName: string) => {
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(fileName);
      return newErrors;
    });
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ease-in-out',
          'hover:bg-accent/50 hover:border-primary',
          isDragActive && !isDragReject && 'bg-accent border-primary scale-[1.02]',
          isDragReject && 'bg-destructive/10 border-destructive',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div
            className={cn(
              'p-4 rounded-full bg-primary/10 transition-all duration-200',
              isDragActive && !isDragReject && 'bg-primary/20 scale-110',
              isDragReject && 'bg-destructive/20'
            )}
          >
            <CloudArrowUpIcon
              className={cn(
                'w-10 h-10 text-primary transition-all duration-200',
                isDragActive && !isDragReject && 'scale-110',
                isDragReject && 'text-destructive'
              )}
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragActive
                ? isDragReject
                  ? 'File type not accepted'
                  : 'Drop the files here...'
                : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: {formatFileSize(maxSize)}
              {maxFiles > 0 && ` • Up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Display rate limit error */}
      <AnimatePresence>
        {rateLimitError && (
          <motion.div
            className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Rate Limit Warning
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {rateLimitError}
                </p>
              </div>
              <motion.button
                onClick={() => setRateLimitError(null)}
                className="p-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                aria-label="Dismiss warning"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg
                  className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display validation errors */}
      <AnimatePresence>
        {errors.size > 0 && (
          <motion.div
            className="mt-4 space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-sm font-medium text-destructive">
              Validation Errors ({errors.size})
            </h4>
            <div className="space-y-2">
              {Array.from(errors.entries()).map(([fileName, errorMessage], index) => (
                <motion.div
                  key={fileName}
                  className="flex items-start justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                      <svg
                        className="w-4 h-4 text-destructive"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-destructive truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-destructive/80 mt-1">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissError(fileName);
                    }}
                    className="ml-2 p-1 rounded-md hover:bg-destructive/20 transition-colors"
                    aria-label="Dismiss error"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg
                      className="w-4 h-4 text-destructive"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <AnimatePresence>
          <motion.div
            className="mt-4 space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-sm font-medium text-foreground">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {file.preview && file.type.startsWith('image/') ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                        onLoad={() => {
                          URL.revokeObjectURL(file.preview!);
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                        <CloudArrowUpIcon className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.sanitizedFilename || file.name}
                        {file.sanitizedFilename && file.sanitizedFilename !== file.name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (was: {file.name})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="ml-2 p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Remove file"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default FileDropzone;
