'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PhotoIcon } from '@heroicons/react/24/outline';

export interface ImagePreviewProps {
  file: File;
  objectUrl: string | null;
  variant: 'grid' | 'list' | 'compact';
  onError?: () => void;
}

/**
 * ImagePreview Component
 *
 * Displays image thumbnails with loading states and error handling
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  objectUrl,
  variant,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (objectUrl) {
      setImageSrc(objectUrl);
    }
  }, [objectUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    onError?.();
  };

  if (!imageSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          variant === 'grid' && 'w-full h-full',
          variant === 'list' && 'w-16 h-16 rounded-lg flex-shrink-0',
          variant === 'compact' && 'w-10 h-10 rounded flex-shrink-0'
        )}
      >
        <PhotoIcon className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        variant === 'grid' && 'w-full h-full',
        variant === 'list' && 'w-16 h-16 rounded-lg flex-shrink-0',
        variant === 'compact' && 'w-10 h-10 rounded flex-shrink-0'
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <PhotoIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={file.name}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
