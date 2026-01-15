/**
 * Signaling API - Peer List Management
 * 
 * GET /api/signaling/peers?roomId=xxx - Get list of connected peers in a room
 * POST /api/signaling/peers - Update peer connection info (for mesh topology)
 */

import { NextResponse } from 'next/server';
import { getConnectedPeers, updatePeerConnections, getRoom, ensureRoom, addPeerToRoom } from '@/lib/signaling/room-storage';

interface UpdatePeerConnectionsRequest {
  roomId: string;
  peerId: string;
  connectedTo: string[]; // List of peer IDs this peer is connected to
  isHost?: boolean;
}

// GET - Get list of connected peers in a room
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const excludePeerId = searchParams.get('excludePeerId');
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId parameter' },
        { status: 400 }
      );
    }
    
    const room = getRoom(roomId);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    const peers = getConnectedPeers(roomId, excludePeerId ?? undefined);
    
    return NextResponse.json({
      roomId,
      peers,
      hostPeerId: room.hostPeerId,
      peerCount: peers.length,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting peers:', error);
    return NextResponse.json(
      { error: 'Failed to get peers' },
      { status: 500 }
    );
  }
}

// POST - Update peer connection mapping (for mesh tracking)
export async function POST(request: Request) {
  try {
    const body = await request.json() as UpdatePeerConnectionsRequest;
    
    const { roomId, peerId, connectedTo, isHost } = body;
    
    if (!roomId || !peerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, peerId' },
        { status: 400 }
      );
    }
    
    // Ensure room exists for host; joiners should only register if room exists
    const existingRoom = getRoom(roomId);
    if (!existingRoom) {
      if (isHost) {
        ensureRoom(roomId, peerId);
      } else {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }
    }
    
    // Ensure the peer is registered in the room
    addPeerToRoom(roomId, peerId);
    
    const success = updatePeerConnections(roomId, peerId, connectedTo || []);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update peer connections' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      roomId,
      peerId,
      connectedTo,
    });
  } catch (error) {
    console.error('[Signaling API] Error updating peer connections:', error);
    return NextResponse.json(
      { error: 'Failed to update peer connections' },
      { status: 500 }
    );
  }
}
