'use client';

import React from 'react';
import { useMessageStore } from '@/store';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MessageListProps {
  className?: string;
  localPeerId?: string | null;
}

export const MessageList: React.FC<MessageListProps> = ({ className, localPeerId }) => {
  const { messages } = useMessageStore();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col space-y-3 overflow-y-auto p-4', className)}>
      {messages.map((message) => {
        const isLocal = message.peerId === localPeerId;
        const isText = message.content.type === 'text';

        if (!isText) return null;

        const textContent = message.content as { type: 'text'; content: string };

        return (
          <div
            key={message.id}
            className={cn(
              'flex',
              isLocal ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
                isLocal
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold">
                  {isLocal ? 'You' : message.peerId.slice(0, 8)}
                </span>
                <span className="text-[10px] opacity-70">
                  {formatRelativeTime(message.timestamp)}
                </span>
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">
                {textContent.content}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
