// Store type definitions with strict typing
// These types define the shape and actions for each Zustand store

import type {
  Peer,
  Room,
  ClipboardItem,
  ConnectionState,
  Toast,
  TypingIndicator,
  UIState,
} from './index';

// Re-export UI types that are used in store interfaces
export type { Toast, TypingIndicator, UIState };

// ============================================================================
// PEER STORE TYPES
// ============================================================================

export interface PeerStore {
  // State
  peers: Map<string, Peer>;
  localPeerId: string | null;
  selectedPeerId: string | null;

  // Actions
  setLocalPeerId: (peerId: string) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (peerId: string) => void;
  updatePeer: (peerId: string, updates: Partial<Peer>) => void;
  selectPeer: (peerId: string | null) => void;
  getPeer: (peerId: string) => Peer | undefined;
  getAllPeers: () => Peer[];
  clearPeers: () => void;
}

// ============================================================================
// ROOM STORE TYPES
// ============================================================================

export interface RoomStore {
  // State
  currentRoom: Room | null;
  connectionString: string;
  shareUrl: string;
  error: string | null;
  connectionState: ConnectionState;

  // Actions
  createRoom: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setConnectionString: (connectionString: string) => void;
  setShareUrl: (url: string) => void;
  setError: (error: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  addPeer: (peerId: string, metadata?: Record<string, string>) => void;
  removePeer: (peerId: string) => void;
  updatePeerState: (peerId: string, state: ConnectionState) => void;
  clearRoom: () => void;
}

// ============================================================================
// CLIPBOARD STORE TYPES
// ============================================================================

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

// ============================================================================
// UI STORE TYPES
// ============================================================================

export interface UIStore extends UIState {
  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingWithMessage: (loading: boolean, message?: string) => void;

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
  openModal: (modalType: 'settings' | 'room-info' | 'peer-info' | 'confirm-dialog', data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

// ============================================================================
// STORE COMBINATIONS
// ============================================================================

export interface RootStore {
  peerStore: PeerStore;
  roomStore: RoomStore;
  clipboardStore: ClipboardStore;
  uiStore: UIStore;
}

// ============================================================================
// STORE MIDDLEWARE TYPES
// ============================================================================

export type StoreAction<T extends string, P = void> = {
  type: T;
  payload?: P;
};

export interface StoreMiddleware {
  (store: unknown): (next: unknown) => (action: StoreAction<string>) => unknown;
}
