'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardDocumentIcon, ChatBubbleLeftRightIcon, DocumentIcon } from '@heroicons/react/24/outline';

export type FeatureType = 'clipboard' | 'files' | 'chat';

interface FeatureSelectionDialogProps {
  open: boolean;
  onSelectFeature: (feature: FeatureType) => void;
}

export function FeatureSelectionDialog({
  open,
  onSelectFeature,
}: FeatureSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-4xl [&>button]:hidden prevent-close">
        <DialogHeader className="text-center pb-8 border-b border-border/10 mb-8">
          <DialogTitle className="text-3xl font-bold mb-3">
            Choose Your Focus
          </DialogTitle>
          <DialogDescription className="text-lg">
            Select the primary feature you want to use in this room.
            <br />
            You can always enable other features later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
          <FeatureCard
            icon={<ClipboardDocumentIcon className="w-12 h-12 mb-4 text-blue-500" />}
            title="Clipboard Sync"
            description="Instantly sync text and links across all connected devices."
            onClick={() => onSelectFeature('clipboard')}
            colorClass="hover:border-blue-500 hover:ring-blue-500/20"
            btnClass="bg-blue-600 hover:bg-blue-700 text-white"
          />

          <FeatureCard
            icon={<DocumentIcon className="w-12 h-12 mb-4 text-orange-500" />}
            title="File Transfer"
            description="Send photos, videos, and documents securely peer-to-peer."
            onClick={() => onSelectFeature('files')}
            colorClass="hover:border-orange-500 hover:ring-orange-500/20"
            btnClass="bg-orange-600 hover:bg-orange-700 text-white"
          />

          <FeatureCard
            icon={<ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 text-green-500" />}
            title="Secure Chat"
            description="Private, encrypted real-time chat with everyone in the room."
            onClick={() => onSelectFeature('chat')}
            colorClass="hover:border-green-500 hover:ring-green-500/20"
            btnClass="bg-green-600 hover:bg-green-700 text-white"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  colorClass: string;
  btnClass: string;
}

function FeatureCard({
  icon,
  title,
  description,
  onClick,
  colorClass,
  btnClass,
}: FeatureCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col items-center text-center p-6 
        rounded-2xl border bg-card cursor-pointer transition-all duration-300
        hover:shadow-xl hover:-translate-y-1 hover:ring-2 ring-offset-2
        ${colorClass}
      `}
    >
      <div className="p-4 rounded-full bg-muted/30 mb-2 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 flex-1">
        {description}
      </p>
      <Button className={`w-full rounded-xl ${btnClass}`}>
        Select {title}
      </Button>
    </div>
  );
}
