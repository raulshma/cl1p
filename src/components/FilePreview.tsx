'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, EyeIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/utils/file-validation';
import { ImagePreview } from './FilePreview/ImagePreview';
import { PdfPreview } from './FilePreview/PdfPreview';
import { TextPreview } from './FilePreview/TextPreview';
import { FileIconPreview } from './FilePreview/FileIconPreview';

export interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
  showRemoveButton?: boolean;
  variant?: 'grid' | 'list' | 'compact';
}

export type PreviewVariant = 'grid' | 'list' | 'compact';

/**
 * FilePreview Component
 *
 * Displays a preview for uploaded files with support for:
 * - Images: Shows thumbnail with full-size preview
 * - PDFs: Shows PDF icon with page count
 * - Text files: Shows content preview
 * - Other files: Shows appropriate file icon
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  className,
  showRemoveButton = true,
  variant = 'grid',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Create and cleanup object URL
  useEffect(() => {
    if (file.type.startsWith('image/') || file.type.startsWith('text/')) {
      objectUrlRef.current = URL.createObjectURL(file);
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [file]);

  const handlePreviewError = useCallback(() => {
    setPreviewError(true);
  }, []);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Determine file type
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/');

  // Render preview content based on file type
  const renderPreview = () => {
    if (previewError) {
      return <FileIconPreview file={file} variant={variant} />;
    }

    if (isImage) {
      return (
        <ImagePreview
          file={file}
          objectUrl={objectUrlRef.current}
          variant={variant}
          onError={handlePreviewError}
        />
      );
    }

    if (isPdf) {
      return <PdfPreview file={file} variant={variant} />;
    }

    if (isText) {
      return (
        <TextPreview
          file={file}
          objectUrl={objectUrlRef.current}
          variant={variant}
          onError={handlePreviewError}
        />
      );
    }

    return <FileIconPreview file={file} variant={variant} />;
  };

  return (
    <>
      <motion.div
        className={cn(
          'relative group bg-card rounded-lg border border-border transition-all duration-200',
          'hover:border-primary/50 hover:shadow-md',
          variant === 'grid' && 'aspect-square',
          variant === 'list' && 'w-full',
          variant === 'compact' && 'inline-flex',
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Preview Content */}
        <div
          className={cn(
            'relative overflow-hidden',
            variant === 'grid' && 'w-full h-full',
            variant === 'list' && 'flex items-center space-x-4 p-4',
            variant === 'compact' && 'flex items-center space-x-2 p-2'
          )}
        >
          {renderPreview()}

          {/* File Info (list and compact variants) */}
          {(variant === 'list' || variant === 'compact') && (
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-medium text-foreground truncate',
                  variant === 'compact' && 'text-xs'
                )}
              >
                {file.name}
              </p>
              <p
                className={cn(
                  'text-muted-foreground',
                  variant === 'compact' && 'text-xs'
                )}
              >
                {formatFileSize(file.size)}
              </p>
            </div>
          )}

          {/* Remove Button */}
          {showRemoveButton && onRemove && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className={cn(
                'absolute top-2 right-2 p-1.5 rounded-md',
                'bg-background/80 backdrop-blur-sm',
                'opacity-0 group-hover:opacity-100',
                'hover:bg-destructive hover:text-destructive-foreground',
                'transition-all duration-200',
                variant === 'compact' && 'static opacity-100'
              )}
              aria-label="Remove file"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <XMarkIcon className={cn(variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4')} />
            </motion.button>
          )}

          {/* Preview Button (for images and PDFs) */}
          {(isImage || isPdf) && variant === 'grid' && (
            <motion.button
              onClick={handleOpenModal}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Preview file"
            >
              <EyeIcon className="w-8 h-8 text-white" />
            </motion.button>
          )}
        </div>

        {/* File Info (grid variant) */}
        {variant === 'grid' && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-xs text-white font-medium truncate">{file.name}</p>
            <p className="text-xs text-white/80">{formatFileSize(file.size)}</p>
          </div>
        )}
      </motion.div>

      {/* Full-size Modal for Images */}
      <AnimatePresence>
        {showModal && isImage && objectUrlRef.current && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="relative max-w-4xl max-h-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={objectUrlRef.current}
                alt={file.name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                aria-label="Close preview"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-size Modal for PDFs */}
      <AnimatePresence>
        {showModal && isPdf && objectUrlRef.current && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="relative w-full max-w-4xl h-[80vh]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={objectUrlRef.current}
                className="w-full h-full rounded-lg"
                title={file.name}
              />
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                aria-label="Close preview"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilePreview;
