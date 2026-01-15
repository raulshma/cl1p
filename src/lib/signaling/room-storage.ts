/**
 * Signaling Room Storage
 * 
 * In-memory storage for WebRTC signaling data.
 * This is suitable for development and single-server deployments.
 * For production with multiple servers, use Redis or a database.
 */

import type { SignalData } from '@/types';

export interface PeerInfo {
  peerId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen?: number;
  connectedTo: string[]; // List of peer IDs this peer is connected to (for mesh)
}

export interface SignalingRoom {
  roomId: string;
  hostOffer: SignalData | null; // Initial offer (kept for backward compatibility)
  hostPeerId: string;
  joinerAnswers: Map<string, { answer: SignalData; peerId: string; timestamp: number }>;
  activePeers: Set<string>; // Track all active peers (host + joiners)
  // Multi-peer support
  pendingJoiners: Set<string>; // Joiners waiting for an offer
  joinerOffers: Map<string, { offer: SignalData; timestamp: number }>; // Per-joiner offers from host
  // Mesh topology support
  peerInfo: Map<string, PeerInfo>; // Detailed info about each peer
  // Peer-to-peer signaling for mesh
  peerSignals: Map<string, Map<string, { signal: SignalData; timestamp: number }>>; // fromPeerId -> toPeerId -> signal
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

// In-memory storage for signaling rooms
// Map<roomId, SignalingRoom>
const signalingRooms = new Map<string, SignalingRoom>();

// Room expiry time (30 minutes of inactivity)
const ROOM_EXPIRY_MS = 30 * 60 * 1000;

// Peer expiry time (2.5 minutes without heartbeat)
const PEER_EXPIRY_MS = 2.5 * 60 * 1000;

// Cleanup interval (1 minute)
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Start cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of signalingRooms) {
      // Remove stale peers first
      const stalePeers: string[] = [];
      for (const [peerId, info] of room.peerInfo) {
        const lastSeen = info.lastSeen ?? info.joinedAt;
        if (now - lastSeen > PEER_EXPIRY_MS) {
          stalePeers.push(peerId);
        }
      }

      if (stalePeers.length > 0) {
        for (const peerId of stalePeers) {
          room.activePeers.delete(peerId);
          room.joinerAnswers.delete(peerId);
          room.pendingJoiners.delete(peerId);
          room.joinerOffers.delete(peerId);
          room.peerInfo.delete(peerId);
          room.peerSignals.delete(peerId);

          // Remove signals targeting the stale peer
          for (const signals of room.peerSignals.values()) {
            signals.delete(peerId);
          }

          // Remove from connectedTo lists
          for (const peerInfo of room.peerInfo.values()) {
            if (peerInfo.connectedTo.includes(peerId)) {
              peerInfo.connectedTo = peerInfo.connectedTo.filter((id) => id !== peerId);
            }
          }
        }
      }

      // Only remove room if it has expired AND has no active peers
      if (now > room.expiresAt && room.activePeers.size === 0) {
        console.log(`[Signaling] Expired room removed: ${roomId}`);
        signalingRooms.delete(roomId);
      } else if (room.activePeers.size > 0) {
        // Keep room alive if there are active peers
        room.expiresAt = now + ROOM_EXPIRY_MS;
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Ensure a room exists (for mesh connections without offers).
 * Creates a new room if it doesn't exist yet.
 */
export function ensureRoom(roomId: string, hostPeerId: string): SignalingRoom {
  const existing = signalingRooms.get(roomId);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const hostInfo: PeerInfo = {
    peerId: hostPeerId,
    nickname: 'Host',
    isHost: true,
    joinedAt: now,
    lastSeen: now,
    connectedTo: [],
  };

  const room: SignalingRoom = {
    roomId,
    hostOffer: null,
    hostPeerId,
    joinerAnswers: new Map(),
    activePeers: new Set([hostPeerId]),
    pendingJoiners: new Set(),
    joinerOffers: new Map(),
    peerInfo: new Map([[hostPeerId, hostInfo]]),
    peerSignals: new Map(),
    createdAt: now,
    expiresAt: now + ROOM_EXPIRY_MS,
    lastActivity: now,
  };

  signalingRooms.set(roomId, room);
  console.log(`[Signaling] Room created: ${roomId} by ${hostPeerId}`);
  return room;
}

/**
 * Create or update a room with host offer
 */
export function setRoomOffer(
  roomId: string,
  offer: SignalData,
  hostPeerId: string
): SignalingRoom {
  const now = Date.now();
  
  let room = signalingRooms.get(roomId);
  
  if (room) {
    // Update existing room
    room.hostOffer = offer;
    room.hostPeerId = hostPeerId;
    room.expiresAt = now + ROOM_EXPIRY_MS;
    room.lastActivity = now;
    // Add host to active peers
    room.activePeers.add(hostPeerId);
    const hostInfo = room.peerInfo.get(hostPeerId);
    if (hostInfo) {
      hostInfo.lastSeen = now;
    } else {
      room.peerInfo.set(hostPeerId, {
        peerId: hostPeerId,
        nickname: 'Host',
        isHost: true,
        joinedAt: now,
        lastSeen: now,
        connectedTo: [],
      });
    }
    // Don't clear old answers - allow multiple joiners
  } else {
    // Create new room with mesh topology support
    const hostInfo: PeerInfo = {
      peerId: hostPeerId,
      nickname: 'Host',
      isHost: true,
      joinedAt: now,
      lastSeen: now,
      connectedTo: [],
    };
    
    room = {
      roomId,
      hostOffer: offer,
      hostPeerId,
      joinerAnswers: new Map(),
      activePeers: new Set([hostPeerId]),
      pendingJoiners: new Set(),
      joinerOffers: new Map(),
      peerInfo: new Map([[hostPeerId, hostInfo]]),
      peerSignals: new Map(),
      createdAt: now,
      expiresAt: now + ROOM_EXPIRY_MS,
      lastActivity: now,
    };
    signalingRooms.set(roomId, room);
  }
  
  console.log(`[Signaling] Room offer set: ${roomId} by ${hostPeerId}, active peers: ${room.activePeers.size}`);
  return room;
}

/**
 * Get room offer for a joiner
 */
export function getRoomOffer(roomId: string): { offer: SignalData; hostPeerId: string } | null {
  const room = signalingRooms.get(roomId);
  
  if (!room || !room.hostOffer) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > room.expiresAt) {
    signalingRooms.delete(roomId);
    return null;
  }
  
  return {
    offer: room.hostOffer,
    hostPeerId: room.hostPeerId,
  };
}

/**
 * Add a joiner's answer to a room
 */
export function addJoinerAnswer(
  roomId: string,
  answer: SignalData,
  joinerPeerId: string
): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    console.log(`[Signaling] Room not found for answer: ${roomId}`);
    return false;
  }
  
  const now = Date.now();
  room.joinerAnswers.set(joinerPeerId, {
    answer,
    peerId: joinerPeerId,
    timestamp: now,
  });
  
  // Add joiner to active peers
  room.activePeers.add(joinerPeerId);
  if (!room.peerInfo.has(joinerPeerId)) {
    room.peerInfo.set(joinerPeerId, {
      peerId: joinerPeerId,
      nickname: joinerPeerId.startsWith('host-') ? 'Host' : `Peer ${joinerPeerId.slice(-6)}`,
      isHost: joinerPeerId === room.hostPeerId,
      joinedAt: now,
      lastSeen: now,
      connectedTo: [],
    });
  } else {
    const info = room.peerInfo.get(joinerPeerId);
    if (info) {
      info.lastSeen = now;
    }
  }
  room.lastActivity = now;
  room.expiresAt = now + ROOM_EXPIRY_MS;
  
  console.log(`[Signaling] Answer added to room: ${roomId} from ${joinerPeerId}, active peers: ${room.activePeers.size}`);
  return true;
}

/**
 * Get pending answers for a room (for host to poll)
 */
export function getPendingAnswers(roomId: string): Array<{ answer: SignalData; peerId: string }> {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return [];
  }
  
  const answers = Array.from(room.joinerAnswers.values()).map(({ answer, peerId }) => ({
    answer,
    peerId,
  }));
  
  return answers;
}

/**
 * Clear a specific answer after host has processed it
 */
export function clearAnswer(roomId: string, joinerPeerId: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const deleted = room.joinerAnswers.delete(joinerPeerId);
  console.log(`[Signaling] Answer cleared for ${joinerPeerId} in room ${roomId}`);
  return deleted;
}

/**
 * Remove a peer from the room (when they disconnect)
 */
export function removePeerFromRoom(roomId: string, peerId: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  room.activePeers.delete(peerId);
  room.joinerAnswers.delete(peerId);
  room.pendingJoiners.delete(peerId);
  room.joinerOffers.delete(peerId);
  room.peerInfo.delete(peerId);
  room.peerSignals.delete(peerId);
  for (const signals of room.peerSignals.values()) {
    signals.delete(peerId);
  }
  for (const peerInfo of room.peerInfo.values()) {
    if (peerInfo.connectedTo.includes(peerId)) {
      peerInfo.connectedTo = peerInfo.connectedTo.filter((id) => id !== peerId);
    }
  }
  
  console.log(`[Signaling] Peer ${peerId} removed from room ${roomId}, remaining peers: ${room.activePeers.size}`);
  
  // If no peers remain, mark room for deletion
  if (room.activePeers.size === 0) {
    console.log(`[Signaling] Room ${roomId} has no active peers, will expire soon`);
    room.expiresAt = Date.now() + 60000; // 1 minute grace period
  }
  
  return true;
}

/**
 * Update peer activity timestamp
 */
export function updatePeerActivity(roomId: string, peerId: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const now = Date.now();
  room.lastActivity = now;
  room.expiresAt = now + ROOM_EXPIRY_MS;
  
  // Ensure peer is in active peers
  room.activePeers.add(peerId);

  const existing = room.peerInfo.get(peerId);
  if (existing) {
    existing.lastSeen = now;
  } else {
    room.peerInfo.set(peerId, {
      peerId,
      nickname: peerId.startsWith('host-') ? 'Host' : `Peer ${peerId.slice(-6)}`,
      isHost: peerId === room.hostPeerId,
      joinedAt: now,
      lastSeen: now,
      connectedTo: [],
    });
  }
  
  return true;
}

/**
 * Delete a room entirely
 */
export function deleteRoom(roomId: string): boolean {
  return signalingRooms.delete(roomId);
}

/**
 * Check if a room exists
 */
export function roomExists(roomId: string): boolean {
  const room = signalingRooms.get(roomId);
  if (!room) return false;
  
  // Check expiry
  if (Date.now() > room.expiresAt) {
    signalingRooms.delete(roomId);
    return false;
  }
  
  return true;
}

/**
 * Get room stats for debugging
 */
export function getRoomStats(): { 
  totalRooms: number; 
  rooms: Array<{ roomId: string; activePeers: number; hostPeerId: string; pendingJoiners: number }> 
} {
  return {
    totalRooms: signalingRooms.size,
    rooms: Array.from(signalingRooms.values()).map(room => ({
      roomId: room.roomId,
      activePeers: room.activePeers.size,
      hostPeerId: room.hostPeerId,
      pendingJoiners: room.pendingJoiners.size,
    })),
  };
}

// ============================================
// Multi-peer support functions
// ============================================

/**
 * Register a joiner who wants to connect (joiner calls this)
 * Host will poll for pending joiners and create offers for each
 */
export function registerJoiner(roomId: string, joinerPeerId: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    console.log(`[Signaling] Room not found for joiner registration: ${roomId}`);
    return false;
  }
  
  // Don't add if already connected or has an offer pending
  if (room.activePeers.has(joinerPeerId) || room.joinerOffers.has(joinerPeerId) || room.pendingJoiners.has(joinerPeerId)) {
    console.log(`[Signaling] Joiner ${joinerPeerId} already registered, has offer, or connected`);
    return true; // Still return true - they're already in the system
  }
  
  room.pendingJoiners.add(joinerPeerId);
  room.lastActivity = Date.now();
  
  console.log(`[Signaling] Joiner ${joinerPeerId} registered in room ${roomId}, pending: ${room.pendingJoiners.size}`);
  return true;
}

/**
 * Get pending joiners who need offers (host polls this)
 */
export function getPendingJoiners(roomId: string): string[] {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return [];
  }
  
  return Array.from(room.pendingJoiners);
}

/**
 * Set an offer for a specific joiner (host creates this after seeing pending joiner)
 */
export function setJoinerOffer(roomId: string, joinerPeerId: string, offer: SignalData): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    console.log(`[Signaling] Room not found for joiner offer: ${roomId}`);
    return false;
  }
  
  const now = Date.now();
  room.joinerOffers.set(joinerPeerId, { offer, timestamp: now });
  room.pendingJoiners.delete(joinerPeerId); // No longer pending
  room.lastActivity = now;
  
  console.log(`[Signaling] Offer set for joiner ${joinerPeerId} in room ${roomId}`);
  return true;
}

/**
 * Get offer for a specific joiner (joiner polls this)
 */
export function getJoinerOffer(roomId: string, joinerPeerId: string): SignalData | null {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return null;
  }
  
  const joinerOffer = room.joinerOffers.get(joinerPeerId);
  if (joinerOffer) {
    return joinerOffer.offer;
  }
  
  // Fall back to global offer for first joiner (backward compatibility)
  if (room.hostOffer && room.activePeers.size <= 1) {
    return room.hostOffer;
  }
  
  return null;
}

/**
 * Clear joiner offer after it's been used
 */
export function clearJoinerOffer(roomId: string, joinerPeerId: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const deleted = room.joinerOffers.delete(joinerPeerId);
  console.log(`[Signaling] Joiner offer cleared for ${joinerPeerId} in room ${roomId}`);
  return deleted;
}

// ============================================
// Mesh topology support functions
// ============================================

/**
 * Get a room by ID
 */
export function getRoom(roomId: string): SignalingRoom | null {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return null;
  }
  
  // Check expiry
  if (Date.now() > room.expiresAt) {
    signalingRooms.delete(roomId);
    return null;
  }
  
  return room;
}

/**
 * Get list of connected peers in a room with their info
 */
export function getConnectedPeers(roomId: string, excludePeerId?: string): PeerInfo[] {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return [];
  }
  
  const peers: PeerInfo[] = [];
  
  for (const peerId of room.activePeers) {
    if (excludePeerId && peerId === excludePeerId) continue;
    
    const peerInfo = room.peerInfo.get(peerId);
    if (peerInfo) {
      peers.push(peerInfo);
    } else {
      // Create basic info if not in peerInfo map
      peers.push({
        peerId,
        nickname: peerId.startsWith('host-') ? 'Host' : `Peer ${peerId.slice(-6)}`,
        isHost: peerId === room.hostPeerId,
        joinedAt: room.createdAt,
        lastSeen: room.createdAt,
        connectedTo: [],
      });
    }
  }
  
  return peers;
}

/**
 * Update which peers a specific peer is connected to (mesh tracking)
 */
export function updatePeerConnections(roomId: string, peerId: string, connectedTo: string[]): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const now = Date.now();
  const peerInfo = room.peerInfo.get(peerId);
  if (peerInfo) {
    peerInfo.connectedTo = connectedTo;
    peerInfo.lastSeen = now;
  } else {
    // If peer info doesn't exist, create it
    room.peerInfo.set(peerId, {
      peerId,
      nickname: peerId.startsWith('host-') ? 'Host' : `Peer ${peerId.slice(-6)}`,
      isHost: peerId === room.hostPeerId,
      joinedAt: now,
      lastSeen: now,
      connectedTo,
    });
  }
  
  // Ensure peer is active
  room.activePeers.add(peerId);
  room.lastActivity = now;
  room.expiresAt = now + ROOM_EXPIRY_MS;
  
  console.log(`[Signaling] Peer ${peerId} connections updated: ${connectedTo.join(', ')}`);
  return true;
}

/**
 * Add a peer to the room with their info
 */
export function addPeerToRoom(roomId: string, peerId: string, nickname?: string): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const now = Date.now();
  
  // Add to active peers
  room.activePeers.add(peerId);
  
  // Add peer info if not exists
  if (!room.peerInfo.has(peerId)) {
    room.peerInfo.set(peerId, {
      peerId,
      nickname: nickname || (peerId.startsWith('host-') ? 'Host' : `Peer ${peerId.slice(-6)}`),
      isHost: peerId === room.hostPeerId,
      joinedAt: now,
      lastSeen: now,
      connectedTo: [],
    });
  } else {
    const info = room.peerInfo.get(peerId);
    if (info) {
      info.lastSeen = now;
    }
  }
  
  room.lastActivity = now;
  room.expiresAt = now + ROOM_EXPIRY_MS;
  
  console.log(`[Signaling] Peer ${peerId} added to room ${roomId}, active peers: ${room.activePeers.size}`);
  return true;
}

/**
 * Store a signal from one peer to another (for mesh connections)
 */
export function setPeerSignal(
  roomId: string,
  fromPeerId: string,
  toPeerId: string,
  signal: SignalData
): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  // Get or create the map for the source peer
  if (!room.peerSignals.has(fromPeerId)) {
    room.peerSignals.set(fromPeerId, new Map());
  }
  
  const peerSignals = room.peerSignals.get(fromPeerId)!;
  peerSignals.set(toPeerId, { signal, timestamp: Date.now() });
  
  room.lastActivity = Date.now();
  
  console.log(`[Signaling] Signal stored: ${fromPeerId} -> ${toPeerId}`);
  return true;
}

/**
 * Get a signal from one peer to another
 */
export function getPeerSignal(
  roomId: string,
  fromPeerId: string,
  toPeerId: string
): SignalData | null {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return null;
  }
  
  const peerSignals = room.peerSignals.get(fromPeerId);
  if (!peerSignals) {
    return null;
  }
  
  const signalData = peerSignals.get(toPeerId);
  return signalData?.signal || null;
}

/**
 * Clear a peer signal after it's been processed
 */
export function clearPeerSignal(
  roomId: string,
  fromPeerId: string,
  toPeerId: string
): boolean {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  const peerSignals = room.peerSignals.get(fromPeerId);
  if (!peerSignals) {
    return false;
  }
  
  const deleted = peerSignals.delete(toPeerId);
  console.log(`[Signaling] Signal cleared: ${fromPeerId} -> ${toPeerId}`);
  return deleted;
}

/**
 * Get all pending signals for a peer (signals from other peers to this peer)
 */
export function getPendingSignalsForPeer(
  roomId: string,
  toPeerId: string
): Array<{ fromPeerId: string; signal: SignalData }> {
  const room = signalingRooms.get(roomId);
  
  if (!room) {
    return [];
  }
  
  const pendingSignals: Array<{ fromPeerId: string; signal: SignalData }> = [];
  
  for (const [fromPeerId, signals] of room.peerSignals) {
    const signalData = signals.get(toPeerId);
    if (signalData) {
      pendingSignals.push({ fromPeerId, signal: signalData.signal });
    }
  }
  
  return pendingSignals;
}
