'use client';

import React, { useMemo } from 'react';
import { useUIStore } from '@/store';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';

/**
 * Global keyboard shortcuts provider component
 *
 * This component manages all global keyboard shortcuts for the application.
 * It should be placed near the root of the component tree.
 *
 * @example
 * ```tsx
 * <GlobalKeyboardShortcuts />
 * ```
 */
export function GlobalKeyboardShortcuts() {
  const {
    modalOpen,
    modalType,
    closeModal,
    openKeyboardShortcuts,
    toggleSidebar,
    setTheme,
  } = useUIStore();

  // Define all keyboard shortcuts
  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      // Help & Information
      {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
        description: 'Open keyboard shortcuts help',
        action: openKeyboardShortcuts,
        category: 'Help',
      },
      {
        key: '/',
        description: 'Open keyboard shortcuts help',
        action: openKeyboardShortcuts,
        category: 'Help',
      },

      // Navigation
      {
        key: 'b',
        ctrlKey: true,
        metaKey: true,
        description: 'Toggle sidebar',
        action: toggleSidebar,
        category: 'Navigation',
      },

      // Theme
      {
        key: 'd',
        ctrlKey: true,
        metaKey: true,
        description: 'Toggle dark mode',
        action: () => setTheme('dark'),
        category: 'Appearance',
      },
      {
        key: 'l',
        ctrlKey: true,
        metaKey: true,
        description: 'Toggle light mode',
        action: () => setTheme('light'),
        category: 'Appearance',
      },

      // Modal controls
      {
        key: 'escape',
        description: 'Close modal or dialog',
        action: closeModal,
        category: 'General',
      },
    ],
    [openKeyboardShortcuts, toggleSidebar, setTheme, closeModal]
  );

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts,
    disableInInput: true,
  });

  const isKeyboardShortcutsOpen = modalOpen && modalType === 'keyboard-shortcuts';

  return (
    <>
      <KeyboardShortcutsDialog
        isOpen={isKeyboardShortcutsOpen}
        onClose={closeModal}
        shortcuts={shortcuts}
      />
    </>
  );
}

export default GlobalKeyboardShortcuts;
