import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Peer } from '@/types';
import { clearMap } from '@/lib/utils/secure-data-cleanup';

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

export const usePeerStore = create<PeerStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      peers: new Map(),
      localPeerId: null,
      selectedPeerId: null,

      // Actions
      setLocalPeerId: (peerId) =>
        set({ localPeerId: peerId }, false, 'setLocalPeerId'),

      addPeer: (peer) =>
        set((state) => {
          const newPeers = new Map(state.peers);
          newPeers.set(peer.id, peer);
          return { peers: newPeers };
        }, false, 'addPeer'),

      removePeer: (peerId) =>
        set((state) => {
          const newPeers = new Map(state.peers);
          newPeers.delete(peerId);
          return {
            peers: newPeers,
            selectedPeerId:
              state.selectedPeerId === peerId ? null : state.selectedPeerId,
          };
        }, false, 'removePeer'),

      updatePeer: (peerId, updates) =>
        set((state) => {
          const peer = state.peers.get(peerId);
          if (!peer) return state;

          const newPeers = new Map(state.peers);
          newPeers.set(peerId, { ...peer, ...updates });
          return { peers: newPeers };
        }, false, 'updatePeer'),

      selectPeer: (peerId) =>
        set({ selectedPeerId: peerId }, false, 'selectPeer'),

      getPeer: (peerId) => {
        return get().peers.get(peerId);
      },

      getAllPeers: () => {
        return Array.from(get().peers.values());
      },

      clearPeers: () => {
        const state = get();

        // Securely clear the peers map
        clearMap(state.peers);

        set({
          peers: new Map(),
          selectedPeerId: null,
        }, false, 'clearPeers');
      },
    }),
    { name: 'PeerStore' }
  )
);
