'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import {
  generateShareableUrlFromData,
  getBaseUrl,
  getCurrentPageUrl,
} from '@/lib/utils/url-encoder';
import type { WebRTCConnectionStringData } from '@/lib/webrtc/connection-string-generator';
import toast from 'react-hot-toast';

interface ShareableUrlButtonProps {
  /**
   * Connection data to encode in the URL
   */
  connectionData: WebRTCConnectionStringData | null;

  /**
   * Custom URL to share (overrides connection data)
   */
  customUrl?: string;

  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Disable automatic URL generation
   */
  disabled?: boolean;

  /**
   * Callback when URL is copied
   */
  onCopy?: (url: string) => void;

  /**
   * Callback when URL generation fails
   */
  onError?: (error: string) => void;
}

/**
 * ShareableUrlButton Component
 *
 * Generates a shareable URL with encoded WebRTC connection data
 * and provides copy-to-clipboard functionality.
 */
export function ShareableUrlButton({
  connectionData,
  customUrl,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  onCopy,
  onError,
}: ShareableUrlButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  // Generate shareable URL
  const generateUrl = useCallback(() => {
    if (customUrl) {
      return customUrl;
    }

    if (!connectionData) {
      return getCurrentPageUrl();
    }

    try {
      const baseUrl = getBaseUrl();
      return generateShareableUrlFromData(baseUrl, connectionData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate URL';
      onError?.(errorMessage);
      return '';
    }
  }, [connectionData, customUrl, onError]);

  // Copy URL to clipboard
  const handleCopy = useCallback(async () => {
    if (disabled) {
      toast.error('Cannot copy: URL generation is disabled');
      return;
    }

    setIsGenerating(true);

    try {
      // Generate URL
      const url = generateUrl();

      if (!url) {
        throw new Error('Failed to generate shareable URL');
      }

      setShareUrl(url);

      // Copy to clipboard
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Copy to clipboard failed');
        }
      }

      // Show success state
      setCopied(true);
      onCopy?.(url);
      toast.success('Shareable URL copied to clipboard!');

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy URL';
      onError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [disabled, generateUrl, onCopy, onError]);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  // Combined classes
  const buttonClasses = `
    inline-flex items-center justify-center gap-2
    rounded-md font-medium transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    disabled:pointer-events-none disabled:opacity-50
    touch-manipulation
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        disabled={disabled || isGenerating}
        className={buttonClasses}
        aria-label="Copy shareable URL"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Generating...</span>
          </>
        ) : copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>Copy Shareable URL</span>
          </>
        )}
      </button>

      {/* Display the URL if it's been generated */}
      {shareUrl && !disabled && (
        <div className="mt-2 p-3 bg-muted rounded-md">
          <div className="flex items-start gap-2">
            <LinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Shareable URL
              </p>
              <code className="text-xs break-all text-foreground">
                {shareUrl}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple share button that copies the current page URL
 */
export function ShareCurrentPageButton({
  variant = 'outline',
  size = 'sm',
  className = '',
}: Pick<ShareableUrlButtonProps, 'variant' | 'size' | 'className'>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const url = getCurrentPageUrl();

      if (!url) {
        throw new Error('Unable to get current page URL');
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Copy failed');
        }
      }

      setCopied(true);
      toast.success('URL copied to clipboard!');

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy URL';
      toast.error(errorMessage);
    }
  }, []);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const buttonClasses = `
    inline-flex items-center justify-center gap-2
    rounded-md font-medium transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    touch-manipulation
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      onClick={handleCopy}
      className={buttonClasses}
      aria-label="Copy current page URL"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>Copy URL</span>
        </>
      )}
    </button>
  );
}

export default ShareableUrlButton;
