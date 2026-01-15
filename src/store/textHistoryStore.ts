import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { TextHistoryEntry } from '@/types';

export interface TextHistoryStore {
  // State
  entries: TextHistoryEntry[];
  currentIndex: number;
  maxSize: number;

  // Actions
  addEntry: (content: string) => void;
  navigatePrevious: () => TextHistoryEntry | null;
  navigateNext: () => TextHistoryEntry | null;
  getCurrentEntry: () => TextHistoryEntry | null;
  clearHistory: () => void;
  setIndex: (index: number) => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  getHistoryCount: () => number;
}

const MAX_HISTORY_SIZE = 100; // Limit to 100 entries to prevent memory issues

export const useTextHistoryStore = create<TextHistoryStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        entries: [],
        currentIndex: -1,
        maxSize: MAX_HISTORY_SIZE,

        // Add a new entry to history
        addEntry: (content) => {
          const { entries, currentIndex, maxSize } = get();

          // Don't add empty entries or duplicates
          if (!content.trim()) return;
          if (entries[currentIndex]?.content === content) return;

          // Create new entry
          const newEntry: TextHistoryEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            timestamp: new Date(),
          };

          // Remove all entries after current index (new branch)
          const newEntries = entries.slice(0, currentIndex + 1);

          // Add new entry
          newEntries.push(newEntry);

          // Enforce max size limit
          if (newEntries.length > maxSize) {
            newEntries.shift(); // Remove oldest entry
          }

          set(
            {
              entries: newEntries,
              currentIndex: newEntries.length - 1,
            },
            false,
            'addEntry'
          );
        },

        // Navigate to previous entry
        navigatePrevious: () => {
          const { entries, currentIndex } = get();
          if (currentIndex <= 0) return null;

          const newIndex = currentIndex - 1;
          set({ currentIndex: newIndex }, false, 'navigatePrevious');
          return entries[newIndex] ?? null;
        },

        // Navigate to next entry
        navigateNext: () => {
          const { entries, currentIndex } = get();
          if (currentIndex >= entries.length - 1) return null;

          const newIndex = currentIndex + 1;
          set({ currentIndex: newIndex }, false, 'navigateNext');
          return entries[newIndex] ?? null;
        },

        // Get current entry
        getCurrentEntry: () => {
          const { entries, currentIndex } = get();
          if (currentIndex < 0 || currentIndex >= entries.length) return null;
          return entries[currentIndex] ?? null;
        },

        // Clear all history
        clearHistory: () => {
          set(
            {
              entries: [],
              currentIndex: -1,
            },
            false,
            'clearHistory'
          );
        },

        // Set index directly
        setIndex: (index) => {
          const { entries } = get();
          if (index >= -1 && index < entries.length) {
            set({ currentIndex: index }, false, 'setIndex');
          }
        },

        // Check if can go back
        canGoBack: () => {
          const { currentIndex } = get();
          return currentIndex > 0;
        },

        // Check if can go forward
        canGoForward: () => {
          const { entries, currentIndex } = get();
          return currentIndex < entries.length - 1;
        },

        // Get total history count
        getHistoryCount: () => {
          return get().entries.length;
        },
      }),
      {
        name: 'text-history-storage',
        partialize: (state) => ({
          entries: state.entries,
          currentIndex: state.currentIndex,
        }),
      }
    ),
    { name: 'TextHistoryStore' }
  )
);
