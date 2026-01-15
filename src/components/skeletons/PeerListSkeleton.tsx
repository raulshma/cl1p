'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PeerListSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton loader for PeerList component
 */
export const PeerListSkeleton: React.FC<PeerListSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 sm:h-7 sm:w-40" />
          <Skeleton className="h-4 w-24 sm:h-5 sm:w-28" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Skeleton className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" />
            <Skeleton className="h-3 w-12 sm:h-4 sm:w-16" />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Skeleton className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" />
            <Skeleton className="h-3 w-16 sm:h-4 sm:w-20" />
          </div>
        </div>
      </div>

      {/* Peer list items skeleton */}
      <ul className="space-y-2" role="list" aria-label="Loading peer list">
        {Array.from({ length: count }).map((_, index) => (
          <li key={index}>
            <article
              className={cn(
                'flex items-center gap-2 sm:gap-3 p-3 rounded-lg border',
                'bg-white dark:bg-gray-800',
                'border-gray-200 dark:border-gray-700'
              )}
              aria-label={`Loading peer ${index + 1}`}
            >
              {/* Avatar skeleton */}
              <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />

              {/* Peer info skeleton */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-24 sm:h-5 sm:w-32" />
                <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
              </div>

              {/* Connection quality skeleton */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Skeleton className="h-3 w-8 sm:h-4 sm:w-10" />
                  <Skeleton className="w-12 sm:w-16 h-2 rounded-full" />
                </div>
                <Skeleton className="h-6 w-16 sm:h-7 sm:w-20 rounded-full" />
              </div>
            </article>
          </li>
        ))}
      </ul>

      {/* Statistics skeleton */}
      <div
        className={cn(
          'mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg',
          'bg-gray-50 dark:bg-gray-800/50',
          'border border-gray-200 dark:border-gray-700'
        )}
        aria-label="Loading peer statistics"
      >
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-6 w-8 mx-auto sm:h-8 sm:w-10" />
              <Skeleton className="h-3 w-16 mx-auto mt-2 sm:h-4 sm:w-20" />
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default PeerListSkeleton;
