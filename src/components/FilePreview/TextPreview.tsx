'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export interface TextPreviewProps {
  file: File;
  objectUrl: string | null;
  variant: 'grid' | 'list' | 'compact';
  onError?: () => void;
  maxLines?: number;
}

/**
 * TextPreview Component
 *
 * Displays a preview of text file contents
 */
export const TextPreview: React.FC<TextPreviewProps> = ({
  file,
  objectUrl,
  variant,
  onError,
  maxLines = 5,
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!objectUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(objectUrl);
        const text = await response.text();

        // Limit content for preview
        const lines = text.split('\n').slice(0, maxLines);
        const preview = lines.join('\n');

        setContent(preview);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading text preview:', error);
        onError?.();
        setIsLoading(false);
      }
    };

    loadContent();
  }, [objectUrl, maxLines, onError]);

  if (variant === 'compact') {
    return (
      <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
        <DocumentTextIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
        <DocumentTextIcon className="w-10 h-10 text-blue-500 dark:text-blue-400" />
      </div>
    );
  }

  // Grid variant - show text preview
  return (
    <div className="w-full h-full p-4 bg-blue-50 dark:bg-blue-900/20 flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <DocumentTextIcon className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-pulse" />
        </div>
      ) : (
        <pre className="text-xs text-foreground overflow-hidden font-mono">
          {content}
          {content && <span className="text-muted-foreground">...</span>}
        </pre>
      )}
      <div className="mt-2 flex items-center justify-center">
        <DocumentTextIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
      </div>
    </div>
  );
};
