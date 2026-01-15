'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ClipboardDocumentIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { FeatureType } from './FeatureSelectionDialog';

interface FeatureToggleControlProps {
  activeFeatures: Set<FeatureType>;
  onToggleFeature: (feature: FeatureType) => void;
  primaryFeature: FeatureType;
}

export function FeatureToggleControl({
  activeFeatures,
  onToggleFeature,
  primaryFeature,
}: FeatureToggleControlProps) {
  return (
    <div className="flex items-center gap-1 p-0.5">
      <ToggleBtn
        icon={<ClipboardDocumentIcon className="w-4 h-4" />}
        label="Clipboard"
        isActive={activeFeatures.has('clipboard')}
        isPrimary={primaryFeature === 'clipboard'}
        onClick={() => onToggleFeature('clipboard')}
      />
      <div className="w-px h-6 bg-border mx-1" />
      <ToggleBtn
        icon={<DocumentIcon className="w-4 h-4" />}
        label="Files"
        isActive={activeFeatures.has('files')}
        isPrimary={primaryFeature === 'files'}
        onClick={() => onToggleFeature('files')}
      />
      <div className="w-px h-6 bg-border mx-1" />
      <ToggleBtn
        icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
        label="Chat"
        isActive={activeFeatures.has('chat')}
        isPrimary={primaryFeature === 'chat'}
        onClick={() => onToggleFeature('chat')}
      />
    </div>
  );
}

function ToggleBtn({
  icon,
  label,
  isActive,
  isPrimary,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isPrimary: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={`
        gap-2 transition-all duration-200
        ${isActive ? 'bg-background shadow-sm text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
        ${isPrimary ? 'ring-primary/20 bg-primary/5 text-primary' : ''}
      `}
      title={isPrimary ? 'Primary Feature' : `Toggle ${label}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}
