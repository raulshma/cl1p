'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTextHistoryStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export interface TextHistoryProps {
  /**
   * Callback when an entry is selected
   */
  onEntrySelect?: (content: string) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Maximum number of entries to display
   */
  maxDisplayEntries?: number;
}

const TextHistory: React.FC<TextHistoryProps> = ({
  onEntrySelect,
  className,
  maxDisplayEntries = 10,
}) => {
  const {
    entries,
    currentIndex,
    navigatePrevious,
    navigateNext,
    getCurrentEntry,
    clearHistory,
    canGoBack,
    canGoForward,
    getHistoryCount,
  } = useTextHistoryStore();

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [displayEntries, setDisplayEntries] = useState<typeof entries>([]);

  // Update display entries when history changes
  useEffect(() => {
    const sortedEntries = [...entries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    setDisplayEntries(sortedEntries.slice(0, maxDisplayEntries));
  }, [entries, maxDisplayEntries]);

  const handleCopy = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  const handleSelect = useCallback(
    (content: string) => {
      if (onEntrySelect) {
        onEntrySelect(content);
      }
    },
    [onEntrySelect]
  );

  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearHistory();
    }
  }, [clearHistory]);

  const handleNavigatePrevious = useCallback(() => {
    const entry = navigatePrevious();
    if (entry && onEntrySelect) {
      onEntrySelect(entry.content);
    }
  }, [navigatePrevious, onEntrySelect]);

  const handleNavigateNext = useCallback(() => {
    const entry = navigateNext();
    if (entry && onEntrySelect) {
      onEntrySelect(entry.content);
    }
  }, [navigateNext, onEntrySelect]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const historyCount = getHistoryCount();
  const currentEntry = getCurrentEntry();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">Text History</CardTitle>
          <CardDescription>
            {historyCount === 0
              ? 'No history yet'
              : `${historyCount} entr${historyCount !== 1 ? 'ies' : 'y'} stored`}
          </CardDescription>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNavigatePrevious}
            disabled={!canGoBack()}
            aria-label="Previous entry"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {currentIndex >= 0 ? currentIndex + 1 : 0} / {historyCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNavigateNext}
            disabled={!canGoForward()}
            aria-label="Next entry"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Entry Display */}
        {currentEntry && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClockIcon className="w-3 h-3" />
                <span>Current</span>
                <span>•</span>
                <span>{formatTimestamp(currentEntry.timestamp)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentEntry.content, -1)}
                aria-label="Copy current entry"
              >
                {copiedIndex === -1 ? (
                  <>Copied!</>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-foreground line-clamp-2">
              {currentEntry.content}
            </p>
          </div>
        )}

        {/* History List */}
        {displayEntries.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Recent Entries</div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {displayEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={cn(
                    'p-3 border rounded-lg transition-colors hover:bg-muted/50 cursor-pointer',
                    currentEntry?.id === entry.id && 'bg-muted border-primary'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 space-y-1"
                      onClick={() => handleSelect(entry.content)}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {entry.content}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(entry.content, idx)}
                      aria-label={`Copy entry from ${formatTimestamp(entry.timestamp)}`}
                    >
                      {copiedIndex === idx ? (
                        <span className="text-xs">Copied!</span>
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No text history yet.</p>
            <p className="text-xs mt-1">
              Start typing and your text will be saved automatically.
            </p>
          </div>
        )}

        {/* Clear History Button */}
        {historyCount > 0 && (
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
              className="w-full"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Clear All History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TextHistory;
