'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Check, X, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SignalData } from '@/types';

/**
 * Props for SignalDataInput component
 */
export interface SignalDataInputProps {
  /**
   * Label for the input
   */
  label?: string;

  /**
   * Description or hint text
   */
  description?: string;

  /**
   * Callback when signal data is submitted
   */
  onSubmit: (signalData: SignalData) => void;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Submit button label
   */
  submitLabel?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether to auto-detect and paste from clipboard
   */
  allowPaste?: boolean;
}

/**
 * SignalDataInput Component
 *
 * Provides an input field for pasting WebRTC signal data
 * from another peer with validation and submission.
 */
export function SignalDataInput({
  label = 'Paste Signal Data',
  description,
  onSubmit,
  disabled = false,
  className = '',
  submitLabel = 'Connect',
  placeholder = '{"type":"answer","sdp":"..."}',
  allowPaste = true,
}: SignalDataInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Validate signal data
  const validateSignalData = useCallback((input: string): { valid: boolean; data?: SignalData; error?: string } => {
    if (!input || input.trim().length === 0) {
      return { valid: false, error: 'Signal data is required' };
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(input.trim());

      // Basic validation for signal data structure
      if (!parsed.type || typeof parsed.type !== 'string') {
        return { valid: false, error: 'Invalid signal data: missing or invalid type' };
      }

      const validTypes = ['offer', 'answer', 'pranswer', 'rollback', 'candidate'];
      if (!validTypes.includes(parsed.type)) {
        return { valid: false, error: `Invalid signal data: unknown type "${parsed.type}"` };
      }

      // Check for SDP or candidate
      if (!parsed.sdp && !parsed.candidate) {
        return { valid: false, error: 'Invalid signal data: missing sdp or candidate' };
      }

      return { valid: true, data: parsed as SignalData };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Invalid JSON format'
      };
    }
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(null);

    // Validate as user types (debounced in real usage, but immediate here for simplicity)
    if (newValue.trim().length > 0) {
      const validation = validateSignalData(newValue);
      setIsValid(validation.valid);
      if (!validation.valid && validation.error) {
        setError(validation.error);
      }
    } else {
      setIsValid(null);
    }
  }, [validateSignalData]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        toast.error('Clipboard access not available');
        return;
      }

      const text = await navigator.clipboard.readText();
      setValue(text);

      const validation = validateSignalData(text);
      if (validation.valid) {
        setIsValid(true);
        toast.success('Signal data pasted from clipboard');
      } else {
        setIsValid(false);
        setError(validation.error || 'Invalid signal data');
        toast.error('Pasted data is not valid signal data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to paste from clipboard';
      toast.error(errorMessage);
    }
  }, [validateSignalData]);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();

    const validation = validateSignalData(value);

    if (!validation.valid) {
      const errorMsg = validation.error || 'Invalid signal data';
      setError(errorMsg);
      setIsValid(false);
      toast.error(errorMsg);
      return;
    }

    if (validation.data) {
      setError(null);
      setIsValid(true);
      onSubmit(validation.data);
    }
  }, [value, validateSignalData, onSubmit]);

  // Handle clear
  const handleClear = useCallback(() => {
    setValue('');
    setError(null);
    setIsValid(null);
  }, []);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return isValid === true && value.trim().length > 0 && !disabled;
  }, [isValid, value, disabled]);

  // Get validation status icon
  const validationIcon = useMemo(() => {
    if (isValid === null) return null;
    if (isValid) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    return <X className="h-4 w-4 text-destructive" />;
  }, [isValid]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            {label}
            {validationIcon}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Paste Button */}
        {allowPaste && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePaste}
            className="gap-1"
          >
            <Clipboard className="h-3 w-3" />
            <span>Paste</span>
          </Button>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`
              font-mono text-xs min-h-[120px]
              ${isValid === false ? 'border-destructive focus-visible:ring-destructive' : ''}
              ${isValid === true ? 'border-green-500 focus-visible:ring-green-500' : ''}
            `}
            aria-label={label}
            aria-invalid={isValid === false}
            aria-describedby={error ? 'signal-data-error' : undefined}
          />

          {/* Character count */}
          {value.length > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1 rounded">
              {value.length} chars
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div id="signal-data-error" className="text-xs text-destructive flex items-start gap-1">
            <span>{error}</span>
          </div>
        )}

        {/* Validation Hint */}
        {isValid === true && !error && (
          <div className="text-xs text-green-600 dark:text-green-400">
            ✓ Valid signal data detected
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>{submitLabel}</span>
          </Button>

          {value.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground">
        <p>Paste the {label.toLowerCase()} from your peer to establish the connection.</p>
      </div>
    </div>
  );
}

export default SignalDataInput;
