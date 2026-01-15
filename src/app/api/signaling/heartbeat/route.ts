/**
 * Signaling API - Heartbeat
 * 
 * POST /api/signaling/heartbeat
 * 
 * Updates peer activity to keep room alive.
 */

import { NextResponse } from 'next/server';
import { updatePeerActivity } from '@/lib/signaling/room-storage';

interface HeartbeatRequest {
  roomId: string;
  peerId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as HeartbeatRequest;
    
    const { roomId, peerId } = body;
    
    // Validate required fields
    if (!roomId || !peerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, peerId' },
        { status: 400 }
      );
    }
    
    // Update peer activity
    const success = updatePeerActivity(roomId, peerId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Signaling API] Error handling heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}
