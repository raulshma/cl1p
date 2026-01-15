/**
 * Signaling API - Peer Leave Notification
 * 
 * POST /api/signaling/peer-leave
 * 
 * Notifies the server that a peer has left the room.
 */

import { NextResponse } from 'next/server';
import { removePeerFromRoom } from '@/lib/signaling/room-storage';

interface PeerLeaveRequest {
  roomId: string;
  peerId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PeerLeaveRequest;
    
    const { roomId, peerId } = body;
    
    // Validate required fields
    if (!roomId || !peerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, peerId' },
        { status: 400 }
      );
    }
    
    // Remove peer from room
    const success = removePeerFromRoom(roomId, peerId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Peer ${peerId} removed from room ${roomId}`,
    });
  } catch (error) {
    console.error('[Signaling API] Error handling peer leave:', error);
    return NextResponse.json(
      { error: 'Failed to process peer leave' },
      { status: 500 }
    );
  }
}
