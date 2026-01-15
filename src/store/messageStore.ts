import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '@/types';
import type { BroadcastResult, DeliveryConfirmation } from '@/lib/webrtc/message-broadcaster';
import {
  clearMessageData,
  clearArray,
  clearMap,
} from '@/lib/utils/secure-data-cleanup';

export interface MessageStore {
  // State
  messages: Message[];
  broadcastResults: Map<string, BroadcastResult>;
  deliveryConfirmations: Map<string, DeliveryConfirmation[]>;

  // Actions
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;

  // Broadcast results
  setBroadcastResult: (messageId: string, result: BroadcastResult) => void;
  getBroadcastResult: (messageId: string) => BroadcastResult | undefined;
  clearBroadcastResults: () => void;

  // Delivery confirmations
  setDeliveryConfirmation: (confirmation: DeliveryConfirmation) => void;
  getDeliveryConfirmations: (messageId: string) => DeliveryConfirmation[];
  clearDeliveryConfirmations: () => void;

  // Queries
  getMessagesByPeer: (peerId: string) => Message[];
  getTextMessages: () => Message[];
  getRecentMessages: (limit?: number) => Message[];
  getMessageById: (messageId: string) => Message | undefined;
}

export const useMessageStore = create<MessageStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: [],
      broadcastResults: new Map(),
      deliveryConfirmations: new Map(),

      // Actions
      addMessage: (message) =>
        set(
          (state) => ({
            messages: [...state.messages, message],
          }),
          false,
          'addMessage'
        ),

      addMessages: (messages) =>
        set(
          (state) => ({
            messages: [...state.messages, ...messages],
          }),
          false,
          'addMessages'
        ),

      updateMessage: (messageId, updates) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          }),
          false,
          'updateMessage'
        ),

      removeMessage: (messageId) =>
        set(
          (state) => ({
            messages: state.messages.filter((msg) => msg.id !== messageId),
          }),
          false,
          'removeMessage'
        ),

      clearMessages: () => {
        const state = get();

        // Securely clear sensitive message data before clearing
        state.messages.forEach((message) => {
          try {
            // Clear text content
            if (message.content.type === 'text' && 'content' in message.content) {
              const textMsg = message.content as { content: string };
              textMsg.content = '\0'.repeat(textMsg.content.length);
            }
            // Clear file data
            if (message.content.type === 'file' && 'data' in message.content) {
              const fileMsg = message.content as { data?: ArrayBuffer };
              if (fileMsg.data instanceof ArrayBuffer) {
                const view = new Uint8Array(fileMsg.data);
                for (let i = 0; i < view.length; i++) {
                  view[i] = 0;
                }
              }
            }
          } catch (error) {
            console.warn('Error clearing message:', error);
          }
        });

        set(
          {
            messages: [],
          },
          false,
          'clearMessages'
        );
      },

      // Broadcast results
      setBroadcastResult: (messageId, result) =>
        set(
          (state) => {
            const newResults = new Map(state.broadcastResults);
            newResults.set(messageId, result);
            return { broadcastResults: newResults };
          },
          false,
          'setBroadcastResult'
        ),

      getBroadcastResult: (messageId) => {
        return get().broadcastResults.get(messageId);
      },

      clearBroadcastResults: () => {
        const state = get();

        // Clear the map securely
        clearMap(state.broadcastResults);

        set(
          {
            broadcastResults: new Map(),
          },
          false,
          'clearBroadcastResults'
        );
      },

      // Delivery confirmations
      setDeliveryConfirmation: (confirmation) =>
        set(
          (state) => {
            const newConfirmations = new Map(state.deliveryConfirmations);
            const confirmations = newConfirmations.get(confirmation.messageId) || [];
            confirmations.push(confirmation);
            newConfirmations.set(confirmation.messageId, confirmations);
            return { deliveryConfirmations: newConfirmations };
          },
          false,
          'setDeliveryConfirmation'
        ),

      getDeliveryConfirmations: (messageId) => {
        return get().deliveryConfirmations.get(messageId) || [];
      },

      clearDeliveryConfirmations: () => {
        const state = get();

        // Clear the map securely
        clearMap(state.deliveryConfirmations);

        set(
          {
            deliveryConfirmations: new Map(),
          },
          false,
          'clearDeliveryConfirmations'
        );
      },

      // Queries
      getMessagesByPeer: (peerId) => {
        return get().messages.filter((msg) => msg.peerId === peerId);
      },

      getTextMessages: () => {
        return get().messages.filter((msg) => msg.content.type === 'text');
      },

      getRecentMessages: (limit = 50) => {
        const messages = get().messages;
        return messages.slice(-limit);
      },

      getMessageById: (messageId) => {
        return get().messages.find((msg) => msg.id === messageId);
      },
    }),
    { name: 'MessageStore' }
  )
);
