'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRoomStore, usePeerStore, useMessageStore } from '@/store';
import { PeerConnectionManager } from '@/lib/webrtc/PeerConnectionManager';
import type { SignalData, ConnectionState, Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface UseSignalingConnectionOptions {
  roomId: string;
  isHost: boolean;
  enabled?: boolean; // Only start connection when true
  debug?: boolean;
}

export interface UseSignalingConnectionReturn {
  // State
  connectionState: ConnectionState;
  peerId: string;
  error: string | null;
  isPolling: boolean;
  connectedPeers: string[];
  
  // Actions
  startConnection: () => Promise<void>;
  reconnect: () => void;
  sendMessage: (message: string) => boolean;
  broadcast: (data: string | object) => void;
}

// Polling interval for host to check for answers
const POLL_INTERVAL_MS = 1500;

// Heartbeat interval to keep room alive
const HEARTBEAT_INTERVAL_MS = 60000; // 1 minute

/**
 * Hook to manage WebRTC connections using Next.js API signaling server.
 * 
 * For hosts:
 * - Creates an initiator peer and sends offer to signaling server
 * - Polls for joiner answers
 * - Processes answers to establish connection
 * 
 * For joiners:
 * - Fetches host's offer from signaling server
 * - Generates and submits answer
 * - Waits for connection
 */
export function useSignalingConnection({
  roomId,
  isHost,
  enabled = true,
  debug = false,
}: UseSignalingConnectionOptions): UseSignalingConnectionReturn {
  const { setConnectionState, addPeer: addPeerToRoom } = useRoomStore();
  const { setLocalPeerId, addPeer, updatePeer } = usePeerStore();
  const { addMessage } = useMessageStore();
  
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false);
  const offerSentRef = useRef<boolean>(false);
  const answerSentRef = useRef<boolean>(false);
  const isHostRef = useRef<boolean>(isHost);
  
  // Keep isHostRef in sync with isHost prop
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);
  
  // Generate peer ID based on role - memoized so it only changes when isHost changes
  const [peerId] = useState(() => isHost ? 'host-' + uuidv4().slice(0, 8) : 'peer-' + uuidv4().slice(0, 8));
  const peerIdRef = useRef<string>(peerId);
  
  // Update peer ID ref when role changes (for reconnects)
  useEffect(() => {
    if (peerIdRef.current && !peerIdRef.current.startsWith(isHost ? 'host-' : 'peer-')) {
      const newPeerId = isHost ? 'host-' + uuidv4().slice(0, 8) : 'peer-' + uuidv4().slice(0, 8);
      peerIdRef.current = newPeerId;
      console.log('[useSignalingConnection] Peer ID updated:', newPeerId, 'isHost:', isHost);
    }
  }, [isHost]);
  
  const [connectionState, setLocalConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useSignalingConnection]', ...args);
    }
  }, [debug]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      log('Polling stopped');
    }
  }, [log]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      log('Heartbeat stopped');
    }
  }, [log]);

  // Send heartbeat to keep room alive
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

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    
    log('Starting heartbeat');
    
    // Send immediately and then at intervals
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, log]);

  // Track which peers we've already processed answers for
  const processedPeersRef = useRef<Set<string>>(new Set());
  // Store the host's original initiator peer ID so we can signal the answer to it
  const hostInitiatorPeerIdRef = useRef<string | null>(null);
  // Map from internal initiator peer IDs to actual joiner peer IDs
  const initiatorToJoinerMapRef = useRef<Map<string, string>>(new Map());

  // Create a new initiator peer for additional joiners
  const createNewInitiatorForNextJoiner = useCallback(() => {
    const peerManager = peerManagerRef.current;
    if (!peerManager || !isHostRef.current) return;
    
    // Create a new initiator peer for the next joiner
    const newInitiatorId = 'host-initiator-' + Date.now();
    hostInitiatorPeerIdRef.current = newInitiatorId;
    
    log('Creating new initiator peer for next joiner:', newInitiatorId);
    
    peerManager.createPeer(newInitiatorId, 'initiator', {
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    // The signal event will trigger and update the server with the new offer
  }, [log]);

  // Poll for answers (host only)
  const pollForAnswers = useCallback(async () => {
    const currentIsHost = isHostRef.current;
    if (!currentIsHost || !peerManagerRef.current) return;
    
    try {
      const response = await fetch(`/api/signaling/answer?roomId=${encodeURIComponent(roomId)}`);
      const data = await response.json();
      
      if (data.answers && data.answers.length > 0) {
        log('Received answers:', data.answers.length);
        
        const peerManager = peerManagerRef.current;
        
        // Process ALL answers (support multiple joiners)
        for (const { answer, peerId: joinerPeerId } of data.answers) {
          // Skip if we've already processed this peer
          if (processedPeersRef.current.has(joinerPeerId)) {
            log('Already processed answer from:', joinerPeerId);
            continue;
          }
          
          try {
            log('Processing answer from joiner:', joinerPeerId);
            
            // For each joiner, use the current initiator peer that generated the offer
            const initiatorPeerId = hostInitiatorPeerIdRef.current;
            
            if (initiatorPeerId && peerManager.hasPeer(initiatorPeerId)) {
              log('Signaling answer to initiator peer:', initiatorPeerId);
              
              try {
                peerManager.connect(initiatorPeerId, answer);
                
                // Map the initiator peer ID to the actual joiner peer ID
                initiatorToJoinerMapRef.current.set(initiatorPeerId, joinerPeerId);
                
                // Mark as processed
                processedPeersRef.current.add(joinerPeerId);
                
                // Clear processed answer from server
                fetch(`/api/signaling/answer?roomId=${encodeURIComponent(roomId)}&joinerPeerId=${encodeURIComponent(joinerPeerId)}`, {
                  method: 'DELETE',
                }).catch(err => log('Error clearing answer:', err));
                
                // Clear the initiator ref and CREATE A NEW ONE for the next joiner
                hostInitiatorPeerIdRef.current = null;
                
                // Schedule creation of new initiator for next joiner (after short delay)
                setTimeout(() => {
                  createNewInitiatorForNextJoiner();
                }, 500);
              } catch (err) {
                log('Error signaling answer:', err);
                processedPeersRef.current.delete(joinerPeerId); // Allow retry
              }
            } else {
              log('No initiator peer available yet - waiting for new offer to be created');
              // Don't mark as processed - we'll retry when new offer is ready
              // The createNewInitiatorForNextJoiner will create a new offer
            }
          } catch (err) {
            log('Error processing answer from', joinerPeerId, ':', err);
            // Don't mark as processed so we can retry
          }
        }
      }
    } catch (err) {
      log('Error polling for answers:', err);
    }
  }, [roomId, log, createNewInitiatorForNextJoiner]);

  // Start polling for answers (host only)
  const startPolling = useCallback(() => {
    const currentIsHost = isHostRef.current;
    if (!currentIsHost || pollingIntervalRef.current) return;
    
    log('Starting answer polling');
    setIsPolling(true);
    
    // Poll immediately and then at intervals
    pollForAnswers();
    pollingIntervalRef.current = setInterval(pollForAnswers, POLL_INTERVAL_MS);
  }, [pollForAnswers, log]);

  // Send/update offer to signaling server (host) - can be called multiple times for multi-peer
  const updateOfferOnServer = useCallback(async (offer: SignalData) => {
    try {
      log('Sending/updating offer on signaling server');
      const response = await fetch('/api/signaling/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          offer,
          hostPeerId: peerIdRef.current,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        log('Offer sent/updated successfully');
        
        // Only start polling and heartbeat on first offer
        if (!offerSentRef.current) {
          offerSentRef.current = true;
          startPolling();
          startHeartbeat(); // Start heartbeat to keep room alive
        }
      } else {
        throw new Error(data.error || 'Failed to send offer');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send offer';
      setError(errorMsg);
      log('Error sending offer:', errorMsg);
    }
  }, [roomId, log, startPolling, startHeartbeat]);

  // Send answer to signaling server (joiner)
  const sendAnswerToServer = useCallback(async (answer: SignalData) => {
    if (answerSentRef.current) return;
    
    try {
      log('Sending answer to signaling server');
      const response = await fetch('/api/signaling/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          answer,
          joinerPeerId: peerIdRef.current,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        log('Answer sent successfully');
        answerSentRef.current = true;
        startHeartbeat(); // Start heartbeat to keep room alive
      } else {
        throw new Error(data.error || 'Failed to send answer');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send answer';
      setError(errorMsg);
      log('Error sending answer:', errorMsg);
    }
  }, [roomId, log, startHeartbeat]);

  // Fetch offer from signaling server (joiner)
  const fetchOfferFromServer = useCallback(async (): Promise<SignalData | null> => {
    try {
      log('Fetching offer from signaling server');
      const response = await fetch(`/api/signaling/offer?roomId=${encodeURIComponent(roomId)}`);
      const data = await response.json();
      
      if (data.hasOffer && data.offer) {
        log('Offer received from server');
        return data.offer;
      }
      
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch offer';
      setError(errorMsg);
      log('Error fetching offer:', errorMsg);
      return null;
    }
  }, [roomId, log]);

  // Start connection process
  const startConnection = useCallback(async () => {
    if (initializingRef.current || peerManagerRef.current) {
      log('Connection already initializing or exists');
      return;
    }
    
    initializingRef.current = true;
    setError(null);
    setLocalConnectionState('connecting');
    setConnectionState('connecting');
    
    const currentIsHost = isHostRef.current;
    log('Starting connection', { roomId, isHost: currentIsHost });
    
    // Create peer manager
    const peerManager = new PeerConnectionManager({
      debug: true, // Enable debug for troubleshooting
      connectionTimeout: 0, // Disable timeout - signaling server handles timing
      maxRetries: 0, // Disable retries - we handle reconnection manually
    });
    peerManagerRef.current = peerManager;
    
    // Set local peer ID
    setLocalPeerId(peerIdRef.current);
    
    // Listen for signal events
    peerManager.on('signal', (signalData: unknown, peerId: string) => {
      const signal = signalData as SignalData;
      log('Signal generated', { type: signal?.type, peerId, isHost: currentIsHost });
      
      if (currentIsHost && signal.type === 'offer') {
        log('Host sending offer to server');
        updateOfferOnServer(signal);
      } else if (!currentIsHost && signal.type === 'answer') {
        log('Joiner sending answer to server');
        sendAnswerToServer(signal);
      } else {
        log('Unexpected signal type or role mismatch', { signalType: signal?.type, isHost: currentIsHost });
      }
    });
    
    // Listen for connection established
    peerManager.on('connect', (_: unknown, internalPeerId: string) => {
      // Resolve the actual peer ID from the mapping (for host's initiator peers)
      let actualPeerId = internalPeerId;
      if (currentIsHost && initiatorToJoinerMapRef.current.has(internalPeerId)) {
        actualPeerId = initiatorToJoinerMapRef.current.get(internalPeerId)!;
        log('Resolved initiator to joiner:', { internalPeerId, actualPeerId });
      }
      
      log('Connection established!', { peerId: actualPeerId });
      setLocalConnectionState('connected');
      setConnectionState('connected');
      setError(null);
      // Don't stop polling - we want to accept more peers!
      
      // Add peer to both stores with connected state
      addPeerToRoom(actualPeerId);
      addPeer({
        id: actualPeerId,
        connectionState: 'connected',
        lastSeen: new Date(),
        metadata: {
          nickname: actualPeerId.startsWith('host-') ? 'Host' : `Peer ${actualPeerId.slice(-6)}`,
        },
      });
      setConnectedPeers(prev => {
        const updated = prev.includes(actualPeerId) ? prev : [...prev, actualPeerId];
        
        // If host, broadcast updated peer list to all peers after a short delay
        if (currentIsHost && peerManager) {
          setTimeout(() => {
            const peerList = {
              type: 'peer_list',
              peers: updated.map(id => ({
                id,
                nickname: id.startsWith('host-') ? 'Host' : `Peer ${id.slice(-6)}`,
              })),
              hostId: peerIdRef.current,
            };
            log('Broadcasting peer list:', peerList.peers.length, 'peers');
            peerManager.broadcast(peerList);
          }, 100);
        }
        
        return updated;
      });
    });
    
    // Listen for data messages
    peerManager.on('data', (data: unknown, peerId: string) => {
      log('Data received from peer', { peerId, dataType: typeof data });
      
      try {
        // Parse the message
        let messageData: any;
        if (typeof data === 'string') {
          messageData = JSON.parse(data);
        } else if (Buffer.isBuffer(data)) {
          messageData = JSON.parse(data.toString('utf-8'));
        } else {
          messageData = data;
        }
        
        // Handle different message types
        if (messageData.type === 'ping') {
          // Heartbeat - ignore
          return;
        }
        
        // Handle peer list updates from host
        if (messageData.type === 'peer_list' && !currentIsHost) {
          log('Received peer list from host:', messageData.peers?.length, 'peers');
          const peers = messageData.peers || [];
          const hostId = messageData.hostId;
          
          // Update connected peers list (include host + all other peers)
          const allPeerIds = hostId ? [hostId, ...peers.filter((p: {id: string}) => p.id !== hostId).map((p: {id: string}) => p.id)] : peers.map((p: {id: string}) => p.id);
          setConnectedPeers(allPeerIds);
          
          // Add/update each peer in the store
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
          
          // Also add host if not in list
          if (hostId && !peers.some((p: {id: string}) => p.id === hostId)) {
            addPeer({
              id: hostId,
              connectionState: 'connected',
              lastSeen: new Date(),
              metadata: { nickname: 'Host' },
            });
          }
          return;
        }
        
        // Check if it's a broadcast message
        if (messageData.id && messageData.content && messageData.senderId) {
          const message: Message = {
            id: messageData.id,
            type: 'text',
            peerId: messageData.senderId,
            timestamp: new Date(messageData.timestamp || Date.now()),
            content: {
              type: 'text',
              content: messageData.content,
            },
          };
          
          log('Adding message to store', { messageId: message.id });
          addMessage(message);
          
          // Update peer last seen
          updatePeer(peerId, { lastSeen: new Date() });
        }
      } catch (err) {
        log('Error processing received data:', err);
      }
    });
    
    // Listen for ICE state changes
    peerManager.on('iceStateChange', (iceState: unknown, peerId: string) => {
      log('ICE state changed', { iceState, peerId });
    });
    
    // Listen for errors
    peerManager.on('error', (err: unknown, peerId: string) => {
      const errorMsg = err instanceof Error ? err.message : 'Connection error';
      log('Connection error', { peerId, error: errorMsg });
      setError(errorMsg);
    });
    
    // Listen for close
    peerManager.on('close', (_: unknown, peerId: string) => {
      log('Connection closed', { peerId });
      
      // Update peer state
      updatePeer(peerId, { connectionState: 'disconnected' });
      
      // Remove from connected peers
      setConnectedPeers(prev => {
        const updated = prev.filter(p => p !== peerId);
        
        // Only set to disconnected if NO peers remain
        if (updated.length === 0) {
          setLocalConnectionState('disconnected');
          setConnectionState('disconnected');
        }
        
        return updated;
      });
      
      // Notify server that peer left
      fetch(`/api/signaling/peer-leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, peerId }),
      }).catch(err => log('Error notifying server of peer leave:', err));
    });
    
    // Create peer based on role
    if (currentIsHost) {
      log('Creating host initiator peer - will wait for joiner answer');
      
      // Create the initiator peer that will generate the offer
      // IMPORTANT: This peer MUST be kept alive to receive the answer!
      const initiatorPeerId = 'host-initiator';
      hostInitiatorPeerIdRef.current = initiatorPeerId;
      
      peerManager.createPeer(initiatorPeerId, 'initiator', {
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      
      // The signal event will trigger and send the offer to the server
      // The peer is kept alive to receive the answer from pollForAnswers
      log('Host initiator peer created, waiting for answer...');
    } else {
      // Joiner: fetch offer and create receiver
      log('Fetching offer as joiner');
      
      // Poll for offer with retries (host may not have created room yet)
      let offer: SignalData | null = null;
      const maxRetries = 15;
      const retryDelay = 2000;
      
      for (let i = 0; i < maxRetries && !offer; i++) {
        offer = await fetchOfferFromServer();
        
        if (!offer && i < maxRetries - 1) {
          log(`No offer yet, retrying... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      if (!offer) {
        setError('No offer available. Please wait for the host to create the room.');
        setLocalConnectionState('failed');
        setConnectionState('failed');
        initializingRef.current = false;
        return;
      }
      
      log('Creating receiver peer with offer');
      peerManager.createPeer('host', 'receiver', {
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });
      
      // Process the offer
      try {
        log('Signaling offer to peer');
        peerManager.connect('host', offer);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process offer';
        setError(errorMsg);
        log('Error processing offer', { error: errorMsg });
      }
    }
    
    initializingRef.current = false;
  }, [
    roomId, 
    log, 
    setConnectionState, 
    setLocalPeerId, 
    addPeerToRoom,
    addPeer,
    updatePeer,
    addMessage,
    updateOfferOnServer,
    sendAnswerToServer,
    fetchOfferFromServer,
  ]);

  // Send a message to all connected peers
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
      
      log('Sending message', { messageId: messageData.id });
      peerManager.broadcast(messageData);
      
      // Add our own message to the store
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

  // Broadcast data to all peers
  const broadcast = useCallback((data: string | object) => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      log('Cannot broadcast: peer manager not initialized');
      return;
    }
    
    peerManager.broadcast(data);
  }, [log]);

  // Reconnect action
  const reconnect = useCallback(() => {
    log('Reconnecting...');
    
    // Cleanup
    stopPolling();
    stopHeartbeat();
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy();
      peerManagerRef.current = null;
    }
    
    // Reset state
    initializingRef.current = false;
    offerSentRef.current = false;
    answerSentRef.current = false;
    processedPeersRef.current.clear();
    hostInitiatorPeerIdRef.current = null;
    initiatorToJoinerMapRef.current.clear();
    setError(null);
    setConnectedPeers([]);
    setLocalConnectionState('disconnected');
    setConnectionState('disconnected');
    
    // Generate new peer ID based on current role
    const currentIsHost = isHostRef.current;
    peerIdRef.current = currentIsHost ? 'host-' + uuidv4().slice(0, 8) : 'peer-' + uuidv4().slice(0, 8);
    log('New peer ID for reconnect:', peerIdRef.current);
    
    // Start fresh connection
    startConnection();
  }, [log, stopPolling, stopHeartbeat, setConnectionState, startConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log('Cleaning up signaling connection');
      stopPolling();
      stopHeartbeat();
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
        peerManagerRef.current = null;
      }
    };
  }, [log, stopPolling, stopHeartbeat]);

  // Auto-start connection when enabled
  useEffect(() => {
    if (enabled && !initializingRef.current && !peerManagerRef.current) {
      log(`Auto-starting connection (enabled=true, isHost=${isHost}, roomId=${roomId})`);
      startConnection();
    }
    // Note: isHost and roomId are intentionally NOT in dependencies
    // We only want to start once when enabled becomes true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    connectionState,
    peerId: peerIdRef.current,
    error,
    isPolling,
    connectedPeers,
    startConnection,
    reconnect,
    sendMessage,
    broadcast,
  };
}

export default useSignalingConnection;
