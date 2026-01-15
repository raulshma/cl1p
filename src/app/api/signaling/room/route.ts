/**
 * Signaling API - Create Room / Set Offer
 * 
 * POST /api/signaling/room
 * 
 * Creates a room with the host's offer or updates existing room.
 */

import { NextResponse } from 'next/server';
import { setRoomOffer, roomExists } from '@/lib/signaling/room-storage';
import type { SignalData } from '@/types';

interface CreateRoomRequest {
  roomId: string;
  offer: SignalData;
  hostPeerId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateRoomRequest;
    
    const { roomId, offer, hostPeerId } = body;
    
    // Validate required fields
    if (!roomId || !offer || !hostPeerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, offer, hostPeerId' },
        { status: 400 }
      );
    }
    
    // Validate offer structure
    if (!offer.type || offer.type !== 'offer') {
      return NextResponse.json(
        { error: 'Invalid offer: must have type "offer"' },
        { status: 400 }
      );
    }
    
    // Create/update room with offer
    const room = setRoomOffer(roomId, offer, hostPeerId);
    
    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      hostPeerId: room.hostPeerId,
      expiresAt: room.expiresAt,
    });
  } catch (error) {
    console.error('[Signaling API] Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId parameter' },
        { status: 400 }
      );
    }
    
    const exists = roomExists(roomId);
    
    return NextResponse.json({
      exists,
      roomId,
    });
  } catch (error) {
    console.error('[Signaling API] Error checking room:', error);
    return NextResponse.json(
      { error: 'Failed to check room' },
      { status: 500 }
    );
  }
}
