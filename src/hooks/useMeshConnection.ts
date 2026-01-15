'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRoomStore, usePeerStore, useMessageStore } from '@/store';
import { PeerConnectionManager } from '@/lib/webrtc/PeerConnectionManager';
import type { SignalData, ConnectionState, Message } from '@/types';
import type { PeerInfo } from '@/lib/signaling/room-storage';
import { v4 as uuidv4 } from 'uuid';
import { buildPeerId } from '@/lib/utils/peer-fingerprint';

export interface UseMeshConnectionOptions {
  roomId: string;
  isHost: boolean;
  enabled?: boolean;
  debug?: boolean;
  onDataMessage?: (message: Record<string, unknown>, senderPeerId: string) => boolean | void;
}

export interface UseMeshConnectionReturn {
  // State
  connectionState: ConnectionState;
  peerId: string;
  error: string | null;
  isPolling: boolean;
  connectedPeers: string[];
  availablePeers: PeerInfo[];
  
  // Peer selection state
  showPeerSelection: boolean;
  setShowPeerSelection: (show: boolean) => void;
  
  // Actions
  startConnection: () => Promise<void>;
  connectToPeers: (peerIds: string[]) => Promise<void>;
  reconnect: () => void;
  sendMessage: (message: string) => boolean;
  sendToPeer: (peerId: string, data: string | object | ArrayBuffer) => boolean;
  broadcast: (data: string | object) => void;
  refreshPeerList: () => Promise<PeerInfo[]>;
}

const POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 60000;
const PEER_LIST_POLL_INTERVAL_MS = 3000;
const PEER_STALE_MS = HEARTBEAT_INTERVAL_MS * 2;

const getPeerStorageKey = (roomId: string, isHost: boolean) =>
  `room-peer-${roomId}-${isHost ? 'host' : 'joiner'}`;

const fingerprintSignal = (signal: SignalData): string => {
  try {
    const raw = JSON.stringify(signal);
    // Simple deterministic hash (djb2)
    let hash = 5381;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash * 33) ^ raw.charCodeAt(i);
    }
    return String(hash >>> 0);
  } catch {
    return String(Date.now());
  }
};

const getStoredPeerId = (roomId: string, isHost: boolean): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(getPeerStorageKey(roomId, isHost));
};

const setStoredPeerId = (roomId: string, isHost: boolean, peerId: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(getPeerStorageKey(roomId, isHost), peerId);
};

const clearStoredPeerId = (roomId: string, isHost: boolean) => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getPeerStorageKey(roomId, isHost));
};

/**
 * Hook for mesh WebRTC connections with peer selection.
 * Supports direct peer-to-peer connections between any peers in the room.
 */
export function useMeshConnection({
  roomId,
  isHost,
  enabled = true,
  debug = false,
  onDataMessage,
}: UseMeshConnectionOptions): UseMeshConnectionReturn {
  const { setConnectionState, addPeer: addPeerToRoom } = useRoomStore();
  const { setLocalPeerId, addPeer, updatePeer } = usePeerStore();
  const { addMessage } = useMessageStore();
  
  // Refs
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerListPollingRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false);
  const isHostRef = useRef<boolean>(isHost);
  const connectRetryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const connectRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  
  // State
  const [peerId] = useState(() => {
    const stored = getStoredPeerId(roomId, isHost);
    if (stored) return stored;
    const generated = buildPeerId(isHost ? 'host' : 'peer');
    setStoredPeerId(roomId, isHost, generated);
    return generated;
  });
  const peerIdRef = useRef<string>(peerId);
  
  const [connectionState, setLocalConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [availablePeers, setAvailablePeers] = useState<PeerInfo[]>([]);
  const [showPeerSelection, setShowPeerSelection] = useState(false);
  
  // Track pending offers/answers for each peer
  const pendingSignalsRef = useRef<Map<string, 'initiator' | 'receiver'>>(new Map());
  const processedSignalsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Ensure peer ID matches role (in case role changes between renders)
  useEffect(() => {
    const prefix = isHost ? 'host-' : 'peer-';
    if (!peerIdRef.current.startsWith(prefix)) {
      const newPeerId = buildPeerId(isHost ? 'host' : 'peer');
      clearStoredPeerId(roomId, !isHost);
      setStoredPeerId(roomId, isHost, newPeerId);
      peerIdRef.current = newPeerId;
    }
  }, [isHost, roomId]);
  
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useMeshConnection]', ...args);
    }
  }, [debug]);

  const notifyPeerLeave = useCallback((peerIdToRemove?: string) => {
    const id = peerIdToRemove || peerIdRef.current;
    if (!id) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = new Blob(
          [JSON.stringify({ roomId, peerId: id })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/signaling/peer-leave', payload);
        return;
      }
    } catch {
      // Fallback to fetch below
    }

    fetch('/api/signaling/peer-leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, peerId: id }),
      keepalive: true,
    }).catch(() => undefined);
  }, [roomId]);

  // Stop polling functions
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      log('Polling stopped');
    }
  }, [log]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      log('Heartbeat stopped');
    }
  }, [log]);

  const stopPeerListPolling = useCallback(() => {
    if (peerListPollingRef.current) {
      clearInterval(peerListPollingRef.current);
      peerListPollingRef.current = null;
      log('Peer list polling stopped');
    }
  }, [log]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/signaling/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          peerId: peerIdRef.current,
        }),
      });
      log('Heartbeat sent');
    } catch (err) {
      log('Error sending heartbeat:', err);
    }
  }, [roomId, log]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    log('Starting heartbeat');
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, log]);

  const clearProcessedSignalsForPeer = useCallback((targetPeerId: string) => {
    if (!targetPeerId) return;
    for (const key of processedSignalsRef.current) {
      if (key.startsWith(`${targetPeerId}-`)) {
        processedSignalsRef.current.delete(key);
      }
    }
  }, []);

  const clearConnectRetry = useCallback((targetPeerId: string) => {
    const timeout = connectRetryTimeoutsRef.current.get(targetPeerId);
    if (timeout) {
      clearTimeout(timeout);
      connectRetryTimeoutsRef.current.delete(targetPeerId);
    }
    connectRetryAttemptsRef.current.delete(targetPeerId);
  }, []);

  const scheduleConnectRetry = useCallback((targetPeerId: string) => {
    if (connectRetryTimeoutsRef.current.has(targetPeerId)) return;

    const attempts = connectRetryAttemptsRef.current.get(targetPeerId) ?? 0;
    if (attempts >= 2) return;

    connectRetryAttemptsRef.current.set(targetPeerId, attempts + 1);

    const timeout = setTimeout(() => {
      connectRetryTimeoutsRef.current.delete(targetPeerId);

      const peerManager = peerManagerRef.current;
      if (!peerManager) return;

      const state = peerManager.getConnectionState(targetPeerId);
      if (state === 'connected') {
        clearConnectRetry(targetPeerId);
        return;
      }

      log('Retrying connection to peer:', targetPeerId);
      pendingSignalsRef.current.delete(targetPeerId);
      clearProcessedSignalsForPeer(targetPeerId);

      if (peerManager.hasPeer(targetPeerId)) {
        peerManager.removePeer(targetPeerId);
      }

      peerManager.createPeer(targetPeerId, 'initiator', {
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      pendingSignalsRef.current.set(targetPeerId, 'initiator');
      scheduleConnectRetry(targetPeerId);
    }, 12000);

    connectRetryTimeoutsRef.current.set(targetPeerId, timeout);
  }, [clearConnectRetry, clearProcessedSignalsForPeer, log]);

  // Refresh peer list from server
  const refreshPeerList = useCallback(async (): Promise<PeerInfo[]> => {
    try {
      const response = await fetch(
        `/api/signaling/peers?roomId=${encodeURIComponent(roomId)}&excludePeerId=${encodeURIComponent(peerIdRef.current)}`
      );
      const data = await response.json();
      
      if (data.peers) {
        const now = Date.now();
        const filtered = (data.peers as PeerInfo[]).filter((peer) => {
          if (!peer.lastSeen) return true;
          return now - peer.lastSeen <= PEER_STALE_MS;
        });

        setAvailablePeers(filtered);
        log('Peer list refreshed:', filtered.length, 'peers');
        return filtered;
      }
    } catch (err) {
      log('Error refreshing peer list:', err);
    }
    return [];
  }, [roomId, log]);

  // Poll for incoming signals from other peers
  const pollForSignals = useCallback(async () => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) return;
    
    try {
      const response = await fetch(
        `/api/signaling/peer-signal?roomId=${encodeURIComponent(roomId)}&toPeerId=${encodeURIComponent(peerIdRef.current)}`
      );
      const data = await response.json();
      
      if (data.signals && data.signals.length > 0) {
        log('Received signals:', data.signals.length);
        
        for (const { fromPeerId, signal } of data.signals) {
          const signalKey = `${fromPeerId}-${signal.type}-${fingerprintSignal(signal)}`;
          
          if (processedSignalsRef.current.has(signalKey) && peerManager.hasPeer(fromPeerId)) {
            continue;
          }
          
          processedSignalsRef.current.add(signalKey);
          
          if (signal.type === 'offer') {
            // We received an offer - create receiver peer
            log('Processing offer from:', fromPeerId);

            const localPeerId = peerIdRef.current;
            const isInitiator = pendingSignalsRef.current.get(fromPeerId) === 'initiator';
            const shouldAcceptOffer = !isInitiator || localPeerId > fromPeerId;

            if (!shouldAcceptOffer) {
              log('Glare detected - keeping initiator role, ignoring offer from:', fromPeerId);
              continue;
            }

            if (peerManager.hasPeer(fromPeerId)) {
              peerManager.removePeer(fromPeerId);
            }

            clearProcessedSignalsForPeer(fromPeerId);
            clearConnectRetry(fromPeerId);

            peerManager.createPeer(fromPeerId, 'receiver', {
              trickle: false,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' }
                ]
              }
            });
            
            pendingSignalsRef.current.set(fromPeerId, 'receiver');
            
            // Process the offer
            try {
              peerManager.connect(fromPeerId, signal);
            } catch (err) {
              log('Error processing offer:', err);
              processedSignalsRef.current.delete(signalKey);
            }
          } else if (signal.type === 'answer') {
            // We received an answer - signal to our initiator peer
            log('Processing answer from:', fromPeerId);
            
            if (peerManager.hasPeer(fromPeerId)) {
              try {
                peerManager.connect(fromPeerId, signal);
              } catch (err) {
                log('Error processing answer:', err);
                processedSignalsRef.current.delete(signalKey);
              }
            }
          }
          
          // Clear the processed signal from server
          fetch('/api/signaling/peer-signal', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              fromPeerId,
              toPeerId: peerIdRef.current,
            }),
          }).catch(err => log('Error clearing signal:', err));
        }
      }
    } catch (err) {
      log('Error polling for signals:', err);
    }
  }, [roomId, log, clearProcessedSignalsForPeer, clearConnectRetry]);

  // Start polling for signals
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    log('Starting signal polling');
    setIsPolling(true);
    
    pollForSignals();
    pollingIntervalRef.current = setInterval(pollForSignals, POLL_INTERVAL_MS);
  }, [pollForSignals, log]);

  // Start polling for peer list updates
  const startPeerListPolling = useCallback(() => {
    if (peerListPollingRef.current) return;
    
    log('Starting peer list polling');
    refreshPeerList();
    peerListPollingRef.current = setInterval(refreshPeerList, PEER_LIST_POLL_INTERVAL_MS);
  }, [refreshPeerList, log]);

  // Connect to specific peers
  const connectToPeers = useCallback(async (targetPeerIds: string[]) => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      log('Peer manager not initialized');
      return;
    }
    
    log('Connecting to peers:', targetPeerIds);
    setShowPeerSelection(false);
    
    for (const targetPeerId of targetPeerIds) {
      if (connectedPeers.includes(targetPeerId)) {
        log('Already connected to:', targetPeerId);
        continue;
      }

      if (peerManager.hasPeer(targetPeerId)) {
        const state = peerManager.getConnectionState(targetPeerId);
        if (state === 'connected') {
          log('Peer already connected:', targetPeerId);
          continue;
        }

        log('Removing stale peer before reconnect:', targetPeerId);
        peerManager.removePeer(targetPeerId);
        pendingSignalsRef.current.delete(targetPeerId);
        clearProcessedSignalsForPeer(targetPeerId);
        clearConnectRetry(targetPeerId);
      }
      
      // Create initiator peer for this connection
      log('Creating initiator for:', targetPeerId);
      
      peerManager.createPeer(targetPeerId, 'initiator', {
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      
      pendingSignalsRef.current.set(targetPeerId, 'initiator');
      scheduleConnectRetry(targetPeerId);
    }
  }, [connectedPeers, log, clearProcessedSignalsForPeer, clearConnectRetry, scheduleConnectRetry]);

  // Setup peer manager event handlers
  const setupPeerManagerEvents = useCallback((peerManager: PeerConnectionManager) => {
    // Signal event - send signal to target peer via server
    peerManager.on('signal', (signalData: unknown, targetPeerId: string) => {
      const signal = signalData as SignalData;
      log('Signal generated for:', targetPeerId, signal.type);
      
      // Send signal to the target peer via the signaling server
      fetch('/api/signaling/peer-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          fromPeerId: peerIdRef.current,
          toPeerId: targetPeerId,
          signal,
        }),
      }).catch(err => log('Error sending signal:', err));
    });
    
    // Connection established
    peerManager.on('connect', (_: unknown, connectedPeerId: string) => {
      log('Connected to peer:', connectedPeerId);
      
      setLocalConnectionState('connected');
      setConnectionState('connected');
      setError(null);
      setShowPeerSelection(false);
      
      // Add to connected peers
      addPeerToRoom(connectedPeerId);
      addPeer({
        id: connectedPeerId,
        connectionState: 'connected',
        lastSeen: new Date(),
        metadata: {
          nickname: connectedPeerId.startsWith('host-') ? 'Host' : `Peer ${connectedPeerId.slice(-6)}`,
        },
      });
      
      setConnectedPeers(prev => {
        if (prev.includes(connectedPeerId)) return prev;
        const updated = [...prev, connectedPeerId];
        
        // Update connections on server
        fetch('/api/signaling/peers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            peerId: peerIdRef.current,
            connectedTo: updated,
          }),
        }).catch(err => log('Error updating connections:', err));
        
        return updated;
      });
      
      // Clear from pending
      pendingSignalsRef.current.delete(connectedPeerId);
      clearConnectRetry(connectedPeerId);
    });
    
    // Data received
    peerManager.on('data', (data: unknown, senderPeerId: string) => {
      log('Data received from:', senderPeerId);
      
      try {
        let messageData: Record<string, unknown>;
        if (typeof data === 'string') {
          messageData = JSON.parse(data);
        } else if (Buffer.isBuffer(data)) {
          messageData = JSON.parse(data.toString('utf-8'));
        } else {
          messageData = data as Record<string, unknown>;
        }
        
        // Handle ping
        if (messageData.type === 'ping') return;
        
        // Handle peer list updates
        if (messageData.type === 'peer_list') {
          const peers = (messageData.peers || []) as Array<{id: string; nickname?: string}>;
          for (const peer of peers) {
            addPeer({
              id: peer.id,
              connectionState: 'connected',
              lastSeen: new Date(),
              metadata: {
                nickname: peer.nickname || (peer.id.startsWith('host-') ? 'Host' : `Peer ${peer.id.slice(-6)}`),
              },
            });
          }
          return;
        }
        
        // Allow custom handlers (e.g., file transfer)
        if (onDataMessage) {
          const handled = onDataMessage(messageData, senderPeerId);
          if (handled) return;
        }

        // Handle regular messages
        if (messageData.id && messageData.content && messageData.senderId) {
          const message: Message = {
            id: messageData.id as string,
            type: 'text',
            peerId: messageData.senderId as string,
            timestamp: new Date((messageData.timestamp as number) || Date.now()),
            content: {
              type: 'text',
              content: messageData.content as string,
            },
          };
          
          addMessage(message);
          updatePeer(senderPeerId, { lastSeen: new Date() });
        }
      } catch (err) {
        log('Error processing data:', err);
      }
    });
    
    // Connection closed
    peerManager.on('close', (_: unknown, closedPeerId: string) => {
      log('Connection closed:', closedPeerId);
      
      updatePeer(closedPeerId, { connectionState: 'disconnected' });
      pendingSignalsRef.current.delete(closedPeerId);
      clearProcessedSignalsForPeer(closedPeerId);
      clearConnectRetry(closedPeerId);

      if (peerManager.hasPeer(closedPeerId)) {
        peerManager.removePeer(closedPeerId);
      }
      
      setConnectedPeers(prev => {
        const updated = prev.filter(p => p !== closedPeerId);
        
        // Update our connection map on the server
        fetch('/api/signaling/peers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            peerId: peerIdRef.current,
            connectedTo: updated,
          }),
        }).catch(err => log('Error updating connections after close:', err));
        
        if (updated.length === 0) {
          setLocalConnectionState('disconnected');
          setConnectionState('disconnected');
        }
        
        return updated;
      });
    });
    
    // Error
    peerManager.on('error', (err: unknown, errorPeerId: string) => {
      const errorMsg = err instanceof Error ? err.message : 'Connection error';
      log('Connection error with', errorPeerId, ':', errorMsg);
      setError(errorMsg);
    });
    
    // ICE state change
    peerManager.on('iceStateChange', (iceState: unknown, icePeerId: string) => {
      log('ICE state changed for', icePeerId, ':', iceState);
    });
  }, [roomId, log, setConnectionState, addPeerToRoom, addPeer, updatePeer, addMessage, clearProcessedSignalsForPeer, clearConnectRetry, onDataMessage]);

  // Start connection
  const startConnection = useCallback(async () => {
    if (initializingRef.current || peerManagerRef.current) {
      log('Connection already initializing or exists');
      return;
    }
    
    initializingRef.current = true;
    setError(null);
    setLocalConnectionState('connecting');
    setConnectionState('connecting');
    
    log('Starting mesh connection', { roomId, isHost: isHostRef.current });
    
    // Create peer manager
    const peerManager = new PeerConnectionManager({
      debug: true,
      connectionTimeout: 0,
      maxRetries: 0,
    });
    peerManagerRef.current = peerManager;
    
    // Set local peer ID
    setLocalPeerId(peerIdRef.current);
    
    // Setup event handlers
    setupPeerManagerEvents(peerManager);
    
    // Register self in the room
    try {
      await fetch('/api/signaling/peers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          peerId: peerIdRef.current,
          connectedTo: [],
          isHost: isHostRef.current,
        }),
      });
      log('Registered in room');
    } catch (err) {
      log('Error registering in room:', err);
    }
    
    // Start heartbeat and polling
    startHeartbeat();
    startPolling();
    startPeerListPolling();
    
    // Fetch initial peer list
    const peers = await refreshPeerList();
    
    // If there are available peers, show selection dialog
    if (peers.length > 0) {
      log('Peers available, showing selection dialog');
      setShowPeerSelection(true);
    } else {
      log('No peers available yet, waiting...');
      // For host, set to connected immediately (waiting for joiners)
      if (isHostRef.current) {
        setLocalConnectionState('connected');
        setConnectionState('connected');
      }
    }
    
    initializingRef.current = false;
  }, [
    roomId,
    log,
    setConnectionState,
    setLocalPeerId,
    setupPeerManagerEvents,
    startHeartbeat,
    startPolling,
    startPeerListPolling,
    refreshPeerList,
  ]);

  // Send message
  const sendMessage = useCallback((message: string): boolean => {
    const peerManager = peerManagerRef.current;
    if (!peerManager || connectionState !== 'connected') {
      log('Cannot send message: not connected');
      return false;
    }
    
    try {
      const messageData = {
        id: uuidv4(),
        type: 'text',
        content: message,
        senderId: peerIdRef.current,
        timestamp: Date.now(),
      };
      
      log('Broadcasting message');
      peerManager.broadcast(messageData);
      
      // Add to local store
      const localMessage: Message = {
        id: messageData.id,
        type: 'text',
        peerId: peerIdRef.current,
        timestamp: new Date(messageData.timestamp),
        content: {
          type: 'text',
          content: message,
        },
      };
      addMessage(localMessage);
      
      return true;
    } catch (err) {
      log('Error sending message:', err);
      return false;
    }
  }, [connectionState, log, addMessage]);

  // Send data to a specific peer
  const sendToPeer = useCallback((targetPeerId: string, data: string | object | ArrayBuffer): boolean => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      log('Cannot send to peer: peer manager not initialized');
      return false;
    }

    return peerManager.send(targetPeerId, data);
  }, [log]);

  // Broadcast
  const broadcast = useCallback((data: string | object) => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      log('Cannot broadcast: peer manager not initialized');
      return;
    }
    peerManager.broadcast(data);
  }, [log]);

  // Reconnect
  const reconnect = useCallback(() => {
    log('Reconnecting...');
    
    stopPolling();
    stopHeartbeat();
    stopPeerListPolling();
    
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy();
      peerManagerRef.current = null;
    }
    
    initializingRef.current = false;
    pendingSignalsRef.current.clear();
    processedSignalsRef.current.clear();
    for (const timeout of connectRetryTimeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    connectRetryTimeoutsRef.current.clear();
    connectRetryAttemptsRef.current.clear();
    setError(null);
    setConnectedPeers([]);
    setAvailablePeers([]);
    setLocalConnectionState('disconnected');
    setConnectionState('disconnected');
    
    // Notify server to remove previous peer before switching IDs
    notifyPeerLeave(peerIdRef.current);

    // Keep the same peer ID on reconnect for stability
    setStoredPeerId(roomId, isHostRef.current, peerIdRef.current);
    log('Reconnecting with peer ID:', peerIdRef.current);
    
    startConnection();
  }, [log, stopPolling, stopHeartbeat, stopPeerListPolling, setConnectionState, startConnection, notifyPeerLeave, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log('Cleaning up mesh connection');
      notifyPeerLeave();
      stopPolling();
      stopHeartbeat();
      stopPeerListPolling();
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
        peerManagerRef.current = null;
      }
    };
  }, [log, stopPolling, stopHeartbeat, stopPeerListPolling, notifyPeerLeave]);

  // Ensure peer is removed on refresh/close
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforeUnload = () => {
      notifyPeerLeave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [notifyPeerLeave]);

  // Auto-start when enabled
  useEffect(() => {
    if (enabled && !initializingRef.current && !peerManagerRef.current) {
      log(`Auto-starting mesh connection (enabled=true, isHost=${isHost})`);
      startConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Watch for new peers and show selection dialog if needed
  useEffect(() => {
    // Only show dialog if:
    // 1. We're not fully connected
    // 2. There are available peers we're not connected to
    // 3. We haven't manually dismissed it
    if (
      connectionState === 'connecting' &&
      availablePeers.length > 0 &&
      connectedPeers.length === 0 &&
      !showPeerSelection
    ) {
      const unconnectedPeers = availablePeers.filter(
        p => !connectedPeers.includes(p.peerId)
      );
      if (unconnectedPeers.length > 0) {
        setShowPeerSelection(true);
      }
    }
  }, [availablePeers, connectedPeers, connectionState, showPeerSelection]);

  // Auto-connect joiners to host when available (prevents refresh stuck in connecting)
  useEffect(() => {
    if (!enabled) return;
    if (isHostRef.current) return; // host waits for offers
    if (connectedPeers.length > 0) return;
    if (availablePeers.length === 0) return;

    const hostPeer = availablePeers.find((peer) => peer.isHost);
    if (!hostPeer) return;

    if (pendingSignalsRef.current.has(hostPeer.peerId)) return;

    connectToPeers([hostPeer.peerId]);
  }, [availablePeers, connectedPeers, connectToPeers, enabled]);

  return {
    connectionState,
    peerId: peerIdRef.current,
    error,
    isPolling,
    connectedPeers,
    availablePeers,
    showPeerSelection,
    setShowPeerSelection,
    startConnection,
    connectToPeers,
    reconnect,
    sendMessage,
    sendToPeer,
    broadcast,
    refreshPeerList,
  };
}

export default useMeshConnection;
