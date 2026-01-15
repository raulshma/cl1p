'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KeyboardShortcut, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

/**
 * Dialog component to display all available keyboard shortcuts
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsDialog
 *   isOpen={isDialogOpen}
 *   onClose={() => setIsDialogOpen(false)}
 *   shortcuts={shortcuts}
 * />
 * ```
 */
export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  // Filter out disabled shortcuts
  const activeShortcuts = shortcuts.filter((s) => !s.disabled);

  // Group shortcuts by category for better organization
  const groupedShortcuts = activeShortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QuestionMarkCircleIcon className="w-6 h-6" aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick shortcuts to help you navigate and use the application more efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1.5 text-xs font-semibold bg-background border border-border rounded-md shadow-sm">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {activeShortcuts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No keyboard shortcuts configured
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
