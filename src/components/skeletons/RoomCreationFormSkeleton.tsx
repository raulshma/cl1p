'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomCreationFormSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for RoomCreationForm component
 */
export const RoomCreationFormSkeleton: React.FC<RoomCreationFormSkeletonProps> = ({
  className,
}) => {
  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div
        className={cn(
          'rounded-lg border',
          'bg-white dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700'
        )}
      >
        {/* Card header skeleton */}
        <div className="text-center px-4 sm:px-6 py-4 sm:py-6 space-y-2">
          <Skeleton className="h-7 w-40 mx-auto sm:h-8 sm:w-48" />
          <Skeleton className="h-4 w-64 mx-auto sm:h-5 sm:w-80" />
        </div>

        {/* Card content skeleton */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Room slug field skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 sm:h-5 sm:w-24" />
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-11 flex-1 sm:h-11" />
                <Skeleton className="h-11 w-24 sm:h-11 sm:w-28" />
              </div>
              <Skeleton className="h-4 w-56 sm:h-5 sm:w-72" />
            </div>

            {/* Password field skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 sm:h-5 sm:w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-11 flex-1" />
              </div>
              <Skeleton className="h-4 w-64 sm:h-5 sm:w-80" />
            </div>

            {/* Submit button skeleton */}
            <Skeleton className="h-12 w-full sm:h-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreationFormSkeleton;
