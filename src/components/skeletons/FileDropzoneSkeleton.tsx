'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FileDropzoneSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for FileDropzone component
 */
export const FileDropzoneSkeleton: React.FC<FileDropzoneSkeletonProps> = ({
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg',
          'bg-white dark:bg-gray-800',
          'border-gray-300 dark:border-gray-700'
        )}
        aria-label="Loading file dropzone"
      >
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {/* Icon skeleton */}
          <div className="p-4 rounded-full bg-primary/10">
            <Skeleton className="w-10 h-10" />
          </div>

          {/* Text skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-64 sm:h-7 sm:w-80" />
            <Skeleton className="h-4 w-48 sm:h-5 sm:w-56" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileDropzoneSkeleton;
