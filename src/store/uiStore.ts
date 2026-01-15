import { create } from 'zustand';
import type { Toast, TypingIndicator } from '@/types';
import { toast as toastFn } from '@/components/ui/toast';

export interface UIStore {
  // State
  isLoading: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toasts: Toast[];
  typingIndicators: Map<string, TypingIndicator>;
  modalOpen: boolean;
  modalType: 'settings' | 'room-info' | 'peer-info' | 'keyboard-shortcuts' | null;

  // Loading actions
  setLoading: (loading: boolean) => void;

  // Sidebar actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;

  // Typing indicator actions
  setTypingIndicator: (peerId: string, isTyping: boolean) => void;
  clearTypingIndicator: (peerId: string) => void;
  clearAllTypingIndicators: () => void;

  // Modal actions
  openModal: (modalType: 'settings' | 'room-info' | 'peer-info' | 'keyboard-shortcuts') => void;
  closeModal: () => void;
  openKeyboardShortcuts: () => void;
}

const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useUIStore = create<UIStore>()(
  (set) => ({
      // Initial state
      isLoading: false,
      sidebarOpen: false,
      theme: 'system',
      toasts: [],
      typingIndicators: new Map(),
      modalOpen: false,
      modalType: null,

      // Loading actions
      setLoading: (isLoading) => set({ isLoading }),

      // Sidebar actions
      setSidebarOpen: (sidebarOpen) =>
        set({ sidebarOpen }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Theme actions
      setTheme: (theme) => set({ theme }),

      // Toast actions
      addToast: (toast) => {
        // Use react-hot-toast for displaying notifications
        toastFn.custom(toast);

        // Keep state updated for any components that might still reference it
        const newToast: Toast = {
          ...toast,
          id: generateToastId(),
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));
      },

      removeToast: (toastId) => {
        // Dismiss specific toast using react-hot-toast
        toastFn.dismissById(toastId);

        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== toastId),
        }));
      },

      clearToasts: () => {
        // Dismiss all toasts using react-hot-toast
        toastFn.clear();

        set({ toasts: [] });
      },

      // Typing indicator actions
      setTypingIndicator: (peerId, isTyping) =>
        set((state) => {
          const newIndicators = new Map(state.typingIndicators);
          if (isTyping) {
            newIndicators.set(peerId, {
              peerId,
              isTyping,
              lastUpdate: new Date(),
            });
          } else {
            newIndicators.delete(peerId);
          }
          return { typingIndicators: newIndicators };
        }),

      clearTypingIndicator: (peerId) =>
        set((state) => {
          const newIndicators = new Map(state.typingIndicators);
          newIndicators.delete(peerId);
          return { typingIndicators: newIndicators };
        }),

      clearAllTypingIndicators: () =>
        set({ typingIndicators: new Map() }),

      // Modal actions
      openModal: (modalType) =>
        set({
          modalOpen: true,
          modalType,
        }),

      closeModal: () =>
        set({
          modalOpen: false,
          modalType: null,
        }),

      openKeyboardShortcuts: () =>
        set({
          modalOpen: true,
          modalType: 'keyboard-shortcuts',
        }),
    })
);
