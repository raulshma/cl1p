'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ConnectionStatusSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'h-6 w-24',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'h-8 w-32',
    dot: 'w-2.5 h-2.5',
  },
  lg: {
    container: 'h-10 w-40',
    dot: 'w-3 h-3',
  },
};

/**
 * Skeleton loader for ConnectionStatusIndicator component
 */
export const ConnectionStatusSkeleton: React.FC<ConnectionStatusSkeletonProps> = ({
  size = 'md',
  className,
}) => {
  const sizeStyles = sizeConfig[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border bg-white dark:bg-gray-800 shadow-sm',
        'border-gray-300 dark:border-gray-600',
        sizeStyles.container,
        className
      )}
      aria-label="Loading connection status"
    >
      {/* Dot skeleton */}
      <div className="relative flex items-center justify-center mx-2">
        <Skeleton className={cn('rounded-full', sizeStyles.dot)} />
      </div>

      {/* Icon skeleton */}
      <Skeleton className="w-4 h-4 sm:w-5 sm:h-5" />

      {/* Label skeleton */}
      <Skeleton className="h-3 w-16 mx-1 sm:h-4 sm:w-20" />
    </div>
  );
};

export default ConnectionStatusSkeleton;
