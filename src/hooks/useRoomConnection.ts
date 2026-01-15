'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRoomStore, usePeerStore } from '@/store';
import { PeerConnectionManager } from '@/lib/webrtc/PeerConnectionManager';
import { type WebRTCConnectionStringData } from '@/lib/webrtc/connection-string-generator';
import { encodeConnectionDataToParam } from '@/lib/utils/url-encoder';
import type { SignalData, ConnectionState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface UseRoomConnectionOptions {
  roomId: string;
  isHost: boolean;
  incomingConnectionData?: WebRTCConnectionStringData | null;
  debug?: boolean;
}

export interface UseRoomConnectionReturn {
  // State
  localSignal: SignalData | null;
  connectionState: ConnectionState;
  shareableUrl: string | null;
  peerId: string;
  error: string | null;
  isWaitingForAnswer: boolean;
  
  // Actions
  processRemoteSignal: (signalData: SignalData) => void;
  generateShareableUrl: () => string | null;
  reconnect: () => void;
}

/**
 * Hook to manage WebRTC connections for a room in a decentralized manner.
 * 
 * For hosts:
 * - Creates an initiator peer and generates an offer
 * - Provides a shareable URL with the offer encoded
 * - Processes answer signals from joiners
 * 
 * For joiners:
 * - If connection data is provided, processes the offer automatically
 * - Generates an answer signal to share back with the host
 * - Otherwise shows manual signaling UI
 */
export function useRoomConnection({
  roomId,
  isHost,
  incomingConnectionData,
  debug = false,
}: UseRoomConnectionOptions): UseRoomConnectionReturn {
  const { setConnectionState, addPeer } = useRoomStore();
  const { setLocalPeerId } = usePeerStore();
  
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const peerIdRef = useRef<string>(uuidv4());
  const hostPeerIdRef = useRef<string>('host-' + uuidv4().slice(0, 8));
  const initializingRef = useRef<boolean>(false);
  const offerProcessedRef = useRef<boolean>(false);
  
  const [localSignal, setLocalSignal] = useState<SignalData | null>(null);
  const [connectionState, setLocalConnectionState] = useState<ConnectionState>('disconnected');
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useRoomConnection]', ...args);
    }
  }, [debug]);

  // Initialize peer manager and create peer connection
  useEffect(() => {
    // Avoid re-initialization
    if (peerManagerRef.current) {
      return;
    }

    log('Initializing room connection', { roomId, isHost, hasIncomingData: !!incomingConnectionData });

    const peerManager = new PeerConnectionManager({
      debug,
      connectionTimeout: 0, // Disable timeout for manual signaling - user controls timing
      maxRetries: 0, // Disable auto-retries for manual signaling - user controls retries
    });
    peerManagerRef.current = peerManager;
    initializingRef.current = true;

    // Set local peer ID
    const myPeerId = isHost ? hostPeerIdRef.current : peerIdRef.current;
    setLocalPeerId(myPeerId);

    // Listen for signal events (offer/answer generation)
    peerManager.on('signal', (signalData: unknown, peerId: string) => {
      const signal = signalData as SignalData;
      log('Signal generated', { type: signal?.type, peerId });
      setLocalSignal(signal);
      
      if (isHost) {
        // Host generated offer, create shareable URL
        setIsWaitingForAnswer(true);
        setLocalConnectionState('connecting');
        setConnectionState('connecting');
        log('Host offer generated, waiting for answer');
      } else {
        // Joiner generated answer
        setLocalConnectionState('connecting');
        setConnectionState('connecting');
        log('Joiner answer generated, waiting for connection');
      }
    });

    // Listen for connection established
    peerManager.on('connect', (_: unknown, peerId: string) => {
      log('Connection established!', { peerId });
      setLocalConnectionState('connected');
      setConnectionState('connected');
      setIsWaitingForAnswer(false);
      setError(null);
      
      // Add peer to store
      addPeer(peerId);
      log('Peer added to store:', peerId);
    });
    
    // Listen for ICE state changes for debugging
    peerManager.on('iceStateChange', (iceState: unknown, peerId: string) => {
      log('ICE state changed', { iceState, peerId });
    });

    // Listen for errors
    peerManager.on('error', (err: unknown, peerId: string) => {
      const errorMsg = err instanceof Error ? err.message : 'Connection error';
      log('Connection error', { peerId, error: errorMsg });
      setError(errorMsg);
      setLocalConnectionState('failed');
      setConnectionState('failed');
    });

    // Listen for close
    peerManager.on('close', (_: unknown, peerId: string) => {
      log('Connection closed', { peerId });
      setLocalConnectionState('disconnected');
      setConnectionState('disconnected');
    });

    // Create the peer based on role
    if (isHost) {
      // Host is always the initiator
      log('Creating initiator peer (host)');
      peerManager.createPeer('joiner', 'initiator', {
        trickle: false, // Wait for complete ICE gathering
      });
    } else if (incomingConnectionData?.signalData) {
      // Joiner with incoming offer data - create receiver and process offer
      log('Creating receiver peer with incoming offer');
      
      // Prevent double-processing
      if (offerProcessedRef.current) {
        log('Offer already processed, skipping');
        return;
      }
      offerProcessedRef.current = true;
      
      peerManager.createPeer('host', 'receiver', {
        trickle: false,
      });
      
      // Process the incoming offer immediately
      // simple-peer handles the internal timing
      try {
        log('Processing incoming offer immediately');
        peerManager.connect('host', incomingConnectionData.signalData);
        setLocalConnectionState('connecting');
        setConnectionState('connecting');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process offer';
        setError(errorMsg);
        log('Error processing incoming offer', { error: errorMsg });
        offerProcessedRef.current = false; // Allow retry
      }
    } else {
      // Joiner without connection data - wait for manual offer input
      log('Joiner without connection data - awaiting manual offer');
      setLocalConnectionState('disconnected');
    }

    // Cleanup
    return () => {
      log('Cleaning up room connection');
      peerManager.destroy();
      peerManagerRef.current = null;
      initializingRef.current = false;
      offerProcessedRef.current = false;
    };
  }, [roomId, isHost, incomingConnectionData, debug, log, setConnectionState, setLocalPeerId, addPeer]);

  // Generate shareable URL when signal is available
  const generateShareableUrl = useCallback(() => {
    if (!localSignal || !isHost) {
      return null;
    }

    try {
      const connectionData: WebRTCConnectionStringData = {
        metadata: {
          roomId,
          peerId: hostPeerIdRef.current,
          timestamp: Date.now(),
          version: '1.0.0',
        },
        signalData: localSignal,
      };

      const dataParam = encodeConnectionDataToParam(connectionData);
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/room/${encodeURIComponent(roomId)}`
        : `/room/${encodeURIComponent(roomId)}`;
      
      const url = `${baseUrl}?data=${dataParam}`;
      setShareableUrl(url);
      log('Generated shareable URL');
      return url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate URL';
      setError(errorMsg);
      log('Error generating shareable URL', { error: errorMsg });
      return null;
    }
  }, [localSignal, isHost, roomId, log]);

  // Auto-generate URL when host has a signal
  useEffect(() => {
    if (isHost && localSignal && !shareableUrl) {
      generateShareableUrl();
    }
  }, [isHost, localSignal, shareableUrl, generateShareableUrl]);

  // Process remote signal (answer from joiner or offer from host)
  const processRemoteSignal = useCallback((signalData: SignalData) => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      setError('Connection manager not initialized');
      return;
    }

    try {
      if (isHost) {
        // Host processing answer from joiner
        log('Processing answer from joiner');
        peerManager.connect('joiner', signalData);
      } else {
        // Joiner processing offer from host (manual input)
        log('Processing offer from host (manual)');
        
        // Create receiver peer if not exists
        if (!peerManager.hasPeer('host')) {
          peerManager.createPeer('host', 'receiver', {
            trickle: false,
          });
        }
        
        // Process the offer
        setTimeout(() => {
          peerManager.connect('host', signalData);
          setLocalConnectionState('connecting');
          setConnectionState('connecting');
        }, 100);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process signal';
      setError(errorMsg);
      log('Error processing remote signal', { error: errorMsg });
    }
  }, [isHost, log, setConnectionState]);

  // Reconnect action
  const reconnect = useCallback(() => {
    const peerManager = peerManagerRef.current;
    if (!peerManager) {
      return;
    }

    setError(null);
    setLocalSignal(null);
    setShareableUrl(null);
    setIsWaitingForAnswer(false);
    offerProcessedRef.current = false; // Allow re-processing

    const targetPeerId = isHost ? 'joiner' : 'host';
    
    if (peerManager.hasPeer(targetPeerId)) {
      peerManager.removePeer(targetPeerId);
    }

    // Recreate peer
    if (isHost) {
      peerManager.createPeer('joiner', 'initiator', { trickle: false });
    }
    // For joiners, they need to re-input the offer
    setLocalConnectionState('disconnected');
    setConnectionState('disconnected');
  }, [isHost, setConnectionState]);

  return {
    localSignal,
    connectionState,
    shareableUrl,
    peerId: isHost ? hostPeerIdRef.current : peerIdRef.current,
    error,
    isWaitingForAnswer,
    processRemoteSignal,
    generateShareableUrl,
    reconnect,
  };
}

export default useRoomConnection;
