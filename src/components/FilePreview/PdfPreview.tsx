'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export interface PdfPreviewProps {
  file: File;
  variant: 'grid' | 'list' | 'compact';
}

/**
 * PdfPreview Component
 *
 * Displays PDF icon with file information
 */
export const PdfPreview: React.FC<PdfPreviewProps> = ({ file, variant }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-red-50 dark:bg-red-900/20',
        variant === 'grid' && 'w-full h-full',
        variant === 'list' && 'w-16 h-16 rounded-lg flex-shrink-0',
        variant === 'compact' && 'w-10 h-10 rounded flex-shrink-0'
      )}
    >
      <DocumentTextIcon
        className={cn(
          'text-red-500 dark:text-red-400',
          variant === 'grid' && 'w-16 h-16',
          variant === 'list' && 'w-10 h-10',
          variant === 'compact' && 'w-6 h-6'
        )}
      />
    </div>
  );
};
