'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
  category?: string;
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[];
  disableInInput?: boolean;
}

/**
 * Custom hook to manage keyboard shortcuts
 *
 * @param config - Configuration object containing shortcuts and options
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       ctrlKey: true,
 *       description: 'Open keyboard shortcuts',
 *       action: () => openModal(),
 *     },
 *   ],
 *   disableInInput: true,
 * });
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { shortcuts, disableInInput = true } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if we're in an input element
      const activeElement = document.activeElement;
      const isInInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      // Skip if disabled in input and we're in an input element
      if (disableInInput && isInInput) {
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(
        (shortcut) =>
          !shortcut.disabled &&
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          (shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey) &&
          (shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey) &&
          (shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey) &&
          (shortcut.altKey === undefined || shortcut.altKey === event.altKey)
      );

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [shortcuts, disableInInput]
  );

  useEffect(() => {
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return shortcuts;
}

/**
 * Helper function to format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  // Check if running in browser environment
  const isMac = typeof window !== 'undefined' && window.navigator?.platform?.startsWith('Mac');

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.metaKey && !shortcut.ctrlKey) {
    parts.push('⌘');
  }
  if (shortcut.shiftKey) {
    parts.push('⇧ Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥ Option' : 'Alt');
  }

  // Format the key
  let key = shortcut.key;
  if (key === ' ') {
    key = 'Space';
  } else if (key === 'escape') {
    key = 'Esc';
  } else {
    // Capitalize the key
    key = key.charAt(0).toUpperCase() + key.slice(1);
  }

  parts.push(key);

  return parts.join(' + ');
}
