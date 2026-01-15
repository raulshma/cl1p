import { create } from 'zustand';
import type { ClipboardItem } from '@/types';
import {
  clearClipboardData,
  clearArray,
} from '@/lib/utils/secure-data-cleanup';

export interface ClipboardStore {
  // State
  items: ClipboardItem[];
  currentClipboard: string | null;
  syncEnabled: boolean;
  lastSync: Date | null;

  // Actions
  addClipboardItem: (item: Omit<ClipboardItem, 'id' | 'timestamp'>) => void;
  removeClipboardItem: (itemId: string) => void;
  clearClipboardItems: () => void;
  setCurrentClipboard: (content: string) => void;
  setSyncEnabled: (enabled: boolean) => void;
  updateLastSync: () => void;
  getClipboardItemById: (itemId: string) => ClipboardItem | undefined;
  getLatestClipboardItem: () => ClipboardItem | undefined;
}

const generateId = (): string => {
  return '${' + 'Date.now()' + '}-${' + 'Math.random().toString(36).substr(2, 9)' + '}';
};

export const useClipboardStore = create<ClipboardStore>()(
  (set, get) => ({
      // Initial state
      items: [],
      currentClipboard: null,
      syncEnabled: true,
      lastSync: null,

      // Actions
      addClipboardItem: (item) =>
        set((state) => {
          const newItem: ClipboardItem = {
            ...item,
            id: generateId(),
            timestamp: new Date(),
          };

          // Keep only last 100 items to prevent memory issues
          const updatedItems = [newItem, ...state.items].slice(0, 100);

          return {
            items: updatedItems,
            currentClipboard: newItem.content,
          };
        }),

      removeClipboardItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),

      clearClipboardItems: () => {
        const state = get();

        // Securely clear sensitive clipboard data before clearing
        state.items.forEach((item) => {
          clearClipboardData({ content: item.content });
        });

        if (state.currentClipboard) {
          const cleared = state.currentClipboard;
          // Clear the string
          clearClipboardData({ content: cleared });
        }

        set({
          items: [],
          currentClipboard: null,
        });
      },

      setCurrentClipboard: (content) =>
        set({ currentClipboard: content }),

      setSyncEnabled: (enabled) =>
        set({ syncEnabled: enabled }),

      updateLastSync: () =>
        set({ lastSync: new Date() }),

      getClipboardItemById: (itemId) => {
        return get().items.find((item) => item.id === itemId);
      },

      getLatestClipboardItem: () => {
        const items = get().items;
        return items.length > 0 ? items[0] : undefined;
      },
    })
);
