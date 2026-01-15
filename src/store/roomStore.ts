import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Room, ConnectionState } from '@/types';
import {
  hashPassword,
  generateConnectionString,
  validatePasswordStrength,
} from '@/lib/crypto/password-encryption';
import {
  clearRoomData,
  clearString,
  clearMap,
} from '@/lib/utils/secure-data-cleanup';

export interface RoomStore {
  // State
  currentRoom: Room | null;
  connectionString: string;
  shareUrl: string;
  error: string | null;
  connectionState: ConnectionState;

  // Actions
  createRoom: (roomId: string, password?: string) => void;
  joinRoom: (roomId: string, password?: string, hashedPassword?: string) => void;
  leaveRoom: () => void;
  setConnectionString: (connectionString: string) => void;
  setShareUrl: (url: string) => void;
  setError: (error: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  addPeer: (peerId: string, metadata?: Record<string, string>) => void;
  removePeer: (peerId: string) => void;
  updatePeerState: (peerId: string, state: ConnectionState) => void;
  clearRoom: () => void;
  verifyRoomPassword: (password: string) => boolean;
}


export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentRoom: null,
      connectionString: '',
      shareUrl: '',
      error: null,
      connectionState: 'disconnected',

      // Actions
      createRoom: (roomId, password) =>
        set((state) => {
          let hashedPassword: string | undefined;

          if (password) {
            // Validate password strength
            const validation = validatePasswordStrength(password);
            if (!validation.isValid) {
              return {
                ...state,
                error: validation.message,
              };
            }
            // Hash the password before storing
            hashedPassword = hashPassword(password);
          }

          const room: Room = {
            id: roomId,
            isHost: true,
            peers: new Map(),
            createdAt: new Date(),
            connectionState: 'connected',
            password: hashedPassword,
          };

          // Generate connection string with hashed password if provided
          const connectionString = generateConnectionString(roomId, hashedPassword);

          return {
            ...state,
            currentRoom: room,
            connectionString,
            connectionState: 'connected',
            error: null,
          };
        }),

      joinRoom: (roomId, password, hashedPassword) =>
        set((state) => {
          let finalHashedPassword: string | undefined;

          // If hashed password is provided (from connection string), use it
          if (hashedPassword) {
            finalHashedPassword = hashedPassword;
          } else if (password) {
            // If plain password is provided, hash it
            finalHashedPassword = hashPassword(password);
          }

          const room: Room = {
            id: roomId,
            isHost: false,
            peers: new Map(),
            createdAt: new Date(),
            connectionState: 'connecting',
            password: finalHashedPassword,
          };

          // Generate connection string
          const connectionString = generateConnectionString(roomId, finalHashedPassword);

          return {
            ...state,
            currentRoom: room,
            connectionString,
            connectionState: 'connecting',
            error: null,
          };
        }),

      leaveRoom: () => {
        const state = get();

        // Securely clear sensitive data before leaving
        if (state.currentRoom) {
          clearRoomData(state.currentRoom);
        }
        if (state.connectionString) {
          clearString(state.connectionString);
        }

        set(
          {
            currentRoom: null,
            connectionString: '',
            shareUrl: '',
            error: null,
            connectionState: 'disconnected',
          },
          false,
          'leaveRoom'
        );
      },

      setConnectionString: (connectionString) =>
        set({ connectionString }, false, 'setConnectionString'),

      setShareUrl: (shareUrl) => set({ shareUrl }, false, 'setShareUrl'),

      setError: (error) => set({ error }, false, 'setError'),

      setConnectionState: (connectionState) =>
        set({ connectionState }, false, 'setConnectionState'),

      addPeer: (peerId, metadata) =>
        set((state) => {
          if (!state.currentRoom) return state;

          const newPeers = new Map(state.currentRoom.peers);
          newPeers.set(peerId, {
            id: peerId,
            connectionState: 'connected',
            lastSeen: new Date(),
            metadata,
          });

          return {
            currentRoom: {
              ...state.currentRoom,
              peers: newPeers,
            },
          };
        }, false, 'addPeer'),

      removePeer: (peerId) =>
        set((state) => {
          if (!state.currentRoom) return state;

          const newPeers = new Map(state.currentRoom.peers);
          newPeers.delete(peerId);

          return {
            currentRoom: {
              ...state.currentRoom,
              peers: newPeers,
            },
          };
        }, false, 'removePeer'),

      updatePeerState: (peerId, connectionState) =>
        set((state) => {
          if (!state.currentRoom) return state;

          const peer = state.currentRoom.peers.get(peerId);
          if (!peer) return state;

          const newPeers = new Map(state.currentRoom.peers);
          newPeers.set(peerId, {
            ...peer,
            connectionState,
            lastSeen: new Date(),
          });

          return {
            currentRoom: {
              ...state.currentRoom,
              peers: newPeers,
            },
          };
        }, false, 'updatePeerState'),

      clearRoom: () => {
        const state = get();

        // Securely clear sensitive data before clearing
        if (state.currentRoom) {
          clearRoomData(state.currentRoom);
        }
        if (state.connectionString) {
          clearString(state.connectionString);
        }

        set(
          {
            currentRoom: null,
            connectionString: '',
            shareUrl: '',
            error: null,
            connectionState: 'disconnected',
          },
          false,
          'clearRoom'
        );
      },

      verifyRoomPassword: (password): boolean => {
        const state = get();
        if (!state.currentRoom?.password) {
          // Room is not password protected
          return true;
        }

        // Import the verifyPassword function dynamically to avoid circular dependencies
        const { verifyPassword: verify } = require('@/lib/crypto/password-encryption');
        return verify(password, state.currentRoom.password) as boolean;
      },
    }),
    { name: 'RoomStore' }
  )
);
