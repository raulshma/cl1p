'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTextHistoryStore } from '@/store';
import {
  ClipboardDocumentIcon,
  ShareIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

export interface TextareaInputProps {
  /**
   * Initial value of the textarea
   */
  defaultValue?: string;
  /**
   * Maximum number of characters allowed (0 for unlimited)
   */
  maxLength?: number;
  /**
   * Minimum number of rows to show
   */
  minRows?: number;
  /**
   * Maximum number of rows before scrolling
   */
  maxRows?: number;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether to show the character counter
   */
  showCounter?: boolean;
  /**
   * Whether to show action buttons
   */
  showActions?: boolean;
  /**
   * Whether to enable auto-resize
   */
  autoResize?: boolean;
  /**
   * Callback when text is submitted
   */
  onSubmit?: (text: string) => void;
  /**
   * Callback when text is copied to clipboard
   */
  onCopy?: (text: string) => void;
  /**
   * Callback when text is shared
   */
  onShare?: (text: string) => void;
  /**
   * Callback when text is cleared
   */
  onClear?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Custom submit button label
   */
  submitLabel?: string;
  /**
    * Whether to show the card header
    */
  showHeader?: boolean;
}

const TextareaInput: React.FC<TextareaInputProps> = ({
  defaultValue = '',
  maxLength = 0,
  minRows = 3,
  maxRows = 10,
  placeholder = 'Enter your message here...',
  showCounter = true,
  showActions = true,
  autoResize = true,
  showHeader = true,
  onSubmit,
  onCopy,
  onShare,
  onClear,
  className,
  disabled = false,
  submitLabel = 'Send',
}) => {
  const [value, setValue] = useState<string>(defaultValue);
  const [remainingChars, setRemainingChars] = useState<number>(
    maxLength > 0 ? maxLength - defaultValue.length : 0
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Text history integration
  const { addEntry, canGoBack, canGoForward, navigatePrevious, navigateNext } =
    useTextHistoryStore();

  // Update remaining characters when value or maxLength changes
  useEffect(() => {
    if (maxLength > 0) {
      setRemainingChars(maxLength - value.length);
    }
  }, [value, maxLength]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !autoResize) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate the height based on scrollHeight
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const padding = parseInt(getComputedStyle(textarea).paddingTop) +
                    parseInt(getComputedStyle(textarea).paddingBottom);

    // Calculate min and max heights in pixels
    const minHeight = lineHeight * minRows + padding;
    const maxHeight = lineHeight * maxRows + padding;

    // Set the height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [autoResize, minRows, maxRows]);

  // Adjust height when value changes
  useEffect(() => {
    if (autoResize) {
      adjustTextareaHeight();
    }
  }, [value, autoResize, adjustTextareaHeight]);

  // Adjust height on window resize
  useEffect(() => {
    if (!autoResize) return;

    const handleResize = () => {
      adjustTextareaHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoResize, adjustTextareaHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Enforce maxLength if set
    if (maxLength > 0 && newValue.length > maxLength) {
      setValue(newValue.slice(0, maxLength));
      return;
    }

    setValue(newValue);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      if (onCopy) {
        onCopy(value);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(value);
      return;
    }

    // Default share behavior
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Text',
          text: value,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  const handleClear = () => {
    setValue('');
    if (onClear) {
      onClear();
    }
  };

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Add to history before submitting
      addEntry(value);

      if (onSubmit) {
        await onSubmit(value);
      }

      // Clear after successful submission
      setValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Navigate history with Alt + Up/Down arrows
    if (e.altKey) {
      if (e.key === 'ArrowUp' && canGoBack()) {
        e.preventDefault();
        const entry = navigatePrevious();
        if (entry) {
          setValue(entry.content);
        }
        return;
      }
      if (e.key === 'ArrowDown' && canGoForward()) {
        e.preventDefault();
        const entry = navigateNext();
        if (entry) {
          setValue(entry.content);
        }
        return;
      }
    }
  };

  // Calculate character counter color
  const getCounterColor = () => {
    if (maxLength === 0) return 'text-muted-foreground';
    const percentage = (remainingChars / maxLength) * 100;

    if (percentage <= 10) {
      return 'text-destructive';
    } else if (percentage <= 25) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-muted-foreground';
  };

  const hasValue = value.trim().length > 0;

  return (
    <Card className={cn('w-full', className)}>
      {showHeader && (
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Compose Message</CardTitle>
          <CardDescription>
            Write and share text messages with your connected peers
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="message-input"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Message
          </label>
          <div className="relative">
            <Textarea
              id="message-input"
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength > 0 ? maxLength : undefined}
              className={cn(
                'resize-none pr-12',
                maxLength > 0 && remainingChars <= 10 && 'border-destructive focus-visible:ring-destructive'
              )}
              style={{
                minHeight: autoResize ? undefined : `${minRows * 1.5}rem`,
                maxHeight: autoResize ? undefined : `${maxRows * 1.5}rem`,
              }}
              aria-describedby="char-counter"
            />
            {value.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear text"
                disabled={disabled}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Character Counter */}
          {showCounter && (
            <div className="flex items-center justify-between">
              <p id="char-counter" className={cn('text-xs', getCounterColor())}>
                {maxLength > 0 ? (
                  <>
                    {remainingChars} character{remainingChars !== 1 ? 's' : ''} remaining
                  </>
                ) : (
                  <>
                    {value.length} character{value.length !== 1 ? 's' : ''}
                  </>
                )}
              </p>
              {maxLength > 0 && (
                <div className="flex-1 mx-4 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-200',
                      remainingChars <= 10
                        ? 'bg-destructive'
                        : remainingChars <= maxLength * 0.25
                        ? 'bg-yellow-600 dark:bg-yellow-400'
                        : 'bg-primary'
                    )}
                    style={{ width: `${(value.length / maxLength) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              disabled={!hasValue || disabled}
              className="flex-1 min-w-[120px]"
            >
              <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              disabled={!hasValue || disabled}
              className="flex-1 min-w-[120px]"
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasValue || disabled || isSubmitting}
              className="flex-1 min-w-[120px]"
            >
              <PaperAirplaneIcon className="w-4 h-4 mr-2" />
              {submitLabel}
            </Button>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground text-center">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to submit
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Navigate history: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Alt</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↓</kbd>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TextareaInput;
