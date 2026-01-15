'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getFileIconType } from '@/lib/utils/file-download';
import {
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  TableCellsIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

export interface FileIconPreviewProps {
  file: File;
  variant: 'grid' | 'list' | 'compact';
}

/**
 * FileIconPreview Component
 *
 * Displays appropriate icon for files that can't be previewed
 */
export const FileIconPreview: React.FC<FileIconPreviewProps> = ({
  file,
  variant,
}) => {
  const iconType = getFileIconType(file.type);

  const getIcon = () => {
    const iconClass = cn(
      'text-muted-foreground',
      variant === 'grid' && 'w-16 h-16',
      variant === 'list' && 'w-10 h-10',
      variant === 'compact' && 'w-6 h-6'
    );

    switch (iconType) {
      case 'image':
        return <PhotoIcon className={iconClass} />;
      case 'video':
        return <VideoCameraIcon className={iconClass} />;
      case 'audio':
        return <MusicalNoteIcon className={iconClass} />;
      case 'pdf':
      case 'document':
        return <DocumentTextIcon className={iconClass} />;
      case 'archive':
        return <ArchiveBoxIcon className={iconClass} />;
      case 'code':
        return <CodeBracketIcon className={iconClass} />;
      case 'spreadsheet':
        return <TableCellsIcon className={iconClass} />;
      default:
        return <DocumentIcon className={iconClass} />;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-muted',
        variant === 'grid' && 'w-full h-full',
        variant === 'list' && 'w-16 h-16 rounded-lg flex-shrink-0',
        variant === 'compact' && 'w-10 h-10 rounded flex-shrink-0'
      )}
    >
      {getIcon()}
    </div>
  );
};
