'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CopyButtonProps {
  /**
   * The text content to copy to clipboard
   */
  textToCopy: string;

  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'icon';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Label to show when not copied
   */
  label?: string;

  /**
   * Label to show when copied
   */
  copiedLabel?: string;

  /**
   * Success message to show in toast
   */
  successMessage?: string;

  /**
   * Error message to show in toast on failure
   */
  errorMessage?: string;

  /**
   * Disable automatic URL generation
   */
  disabled?: boolean;

  /**
   * Show only icon without text
   */
  iconOnly?: boolean;

  /**
   * Callback when text is copied
   */
  onCopy?: (text: string) => void;

  /**
   * Callback when copy fails
   */
  onError?: (error: string) => void;
}

/**
 * CopyButton Component
 *
 * A reusable button component that copies text to clipboard
 * and shows visual feedback with toast notifications.
 */
export function CopyButton({
  textToCopy,
  variant = 'ghost',
  size = 'sm',
  className = '',
  label = 'Copy',
  copiedLabel = 'Copied!',
  successMessage = 'Copied to clipboard!',
  errorMessage = 'Failed to copy',
  disabled = false,
  iconOnly = false,
  onCopy,
  onError,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = useCallback(async () => {
    if (disabled || !textToCopy || isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      // Attempt to copy using the modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
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
      onCopy?.(textToCopy);
      toast.success(successMessage);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsCopying(false);
    }
  }, [disabled, textToCopy, isCopying, successMessage, errorMessage, onCopy, onError]);

  // Size classes
  const sizeClasses = {
    sm: iconOnly ? 'p-1.5' : 'px-3 py-1.5 text-sm',
    md: iconOnly ? 'p-2' : 'px-4 py-2 text-base',
    lg: iconOnly ? 'p-2.5' : 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    icon: 'hover:bg-accent hover:text-accent-foreground p-1',
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

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      onClick={handleCopy}
      disabled={disabled || isCopying || !textToCopy}
      className={buttonClasses}
      aria-label={copied ? copiedLabel : `Copy ${label}`}
      title={textToCopy}
    >
      {isCopying ? (
        <>
          <div className="animate-spin rounded-full border-2 border-current border-t-transparent" />
          {!iconOnly && <span>Copying...</span>}
        </>
      ) : copied ? (
        <>
          <Check className={iconSize[size]} aria-hidden="true" />
          {!iconOnly && <span>{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className={iconSize[size]} aria-hidden="true" />
          {!iconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

/**
 * CopyButtonWithDisplay Component
 *
 * Displays text with a copy button alongside it
 */
interface CopyButtonWithDisplayProps extends Omit<CopyButtonProps, 'iconOnly'> {
  /**
   * Label for the text being displayed
   */
  displayLabel?: string;

  /**
   * Whether to show the text in a code block
   */
  code?: boolean;

  /**
   * Maximum width of the display container
   */
  maxWidth?: string;
}

export function CopyButtonWithDisplay({
  textToCopy,
  displayLabel,
  code = true,
  maxWidth = '100%',
  size = 'sm',
  variant = 'outline',
  className = '',
  ...props
}: CopyButtonWithDisplayProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`} style={{ maxWidth }}>
      <div className="flex-1 min-w-0">
        {displayLabel && (
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {displayLabel}
          </p>
        )}
        {code ? (
          <code className="text-xs break-all text-foreground block bg-muted px-2 py-1 rounded">
            {textToCopy}
          </code>
        ) : (
          <p className="text-sm break-all text-foreground">{textToCopy}</p>
        )}
      </div>
      <CopyButton
        textToCopy={textToCopy}
        size={size}
        variant={variant}
        iconOnly={true}
        {...props}
      />
    </div>
  );
}

export default CopyButton;
