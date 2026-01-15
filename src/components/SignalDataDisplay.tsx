'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import type { SignalData } from '@/types';

/**
 * Props for SignalDataDisplay component
 */
export interface SignalDataDisplayProps {
  /**
   * The signal data to display
   */
  signalData: SignalData;

  /**
   * Label for the display
   */
  label?: string;

  /**
   * Description or hint text
   */
  description?: string;

  /**
   * Whether to show the signal data by default
   */
  defaultVisible?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Whether to show the copy button
   */
  showCopyButton?: boolean;

  /**
   * Custom copy button label
   */
  copyButtonLabel?: string;
}

/**
 * SignalDataDisplay Component
 *
 * Displays WebRTC signal data (offer/answer) in a formatted way
 * with copy functionality and visibility toggle.
 */
export function SignalDataDisplay({
  signalData,
  label = 'Signal Data',
  description,
  defaultVisible = false,
  className = '',
  showCopyButton = true,
  copyButtonLabel = 'Copy',
}: SignalDataDisplayProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert signal data to JSON string for display
  const signalString = useMemo(() => {
    try {
      return JSON.stringify(signalData, null, 2);
    } catch {
      return String(signalData);
    }
  }, [signalData]);

  // Get signal type for display
  const signalType = useMemo(() => {
    if (typeof signalData === 'object' && signalData !== null && 'type' in signalData) {
      return String(signalData.type);
    }
    return 'signal';
  }, [signalData]);

  // Truncate for preview
  const previewText = useMemo(() => {
    const maxLength = 100;
    if (signalString.length <= maxLength) {
      return signalString;
    }
    return signalString.substring(0, maxLength) + '...';
  }, [signalString]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Copy Button */}
        {showCopyButton && (
          <CopyButton
            textToCopy={signalString}
            size="sm"
            variant="outline"
            label={copyButtonLabel}
            successMessage={`${signalType} copied to clipboard!`}
          />
        )}
      </div>

      {/* Signal Data Display */}
      <div className="relative">
        <div className="bg-muted border border-input rounded-md overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {signalType}
              </span>
              <span className="text-xs text-muted-foreground">
                ({signalString.length} characters)
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Visibility Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(!isVisible)}
                className="h-7 px-2"
                aria-label={isVisible ? 'Hide signal data' : 'Show signal data'}
              >
                {isVisible ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    <span className="text-xs">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    <span className="text-xs">Show</span>
                  </>
                )}
              </Button>

              {/* Expand Toggle */}
              {isVisible && signalString.length > 200 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 px-2"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {isVisible ? (
            <pre
              className={`
                p-3 text-xs font-mono overflow-x-auto
                ${isExpanded ? 'max-h-none' : 'max-h-32 overflow-y-auto'}
                text-foreground bg-background
              `}
            >
              {signalString}
            </pre>
          ) : (
            <div className="p-3 text-xs text-muted-foreground italic">
              ••• Signal data hidden •••
            </div>
          )}
        </div>

        {/* Hidden input for easy copying */}
        <input
          type="text"
          value={signalString}
          readOnly
          className="absolute opacity-0 pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Type: {signalType}</span>
        <span>•</span>
        <span>{signalString.length} chars</span>
        {signalString.length > 100 && (
          <>
            <span>•</span>
            <span>Preview: {previewText}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default SignalDataDisplay;
