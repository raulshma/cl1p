/**
 * Signaling API - Joiner Registration
 * 
 * POST /api/signaling/join - Register as a joiner wanting to connect
 * GET /api/signaling/join?roomId=xxx&joinerPeerId=yyy - Get offer for this joiner
 */

import { NextResponse } from 'next/server';
import { registerJoiner, getJoinerOffer, clearJoinerOffer } from '@/lib/signaling/room-storage';

interface JoinRequest {
  roomId: string;
  joinerPeerId: string;
}

// POST - Register as a joiner
export async function POST(request: Request) {
  try {
    const body = await request.json() as JoinRequest;
    
    const { roomId, joinerPeerId } = body;
    
    if (!roomId || !joinerPeerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, joinerPeerId' },
        { status: 400 }
      );
    }
    
    const success = registerJoiner(roomId, joinerPeerId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      roomId,
      joinerPeerId,
      message: 'Registered. Poll for your offer.',
    });
  } catch (error) {
    console.error('[Signaling API] Error registering joiner:', error);
    return NextResponse.json(
      { error: 'Failed to register joiner' },
      { status: 500 }
    );
  }
}

// GET - Get offer for this specific joiner
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const joinerPeerId = searchParams.get('joinerPeerId');
    
    if (!roomId || !joinerPeerId) {
      return NextResponse.json(
        { error: 'Missing roomId or joinerPeerId parameter' },
        { status: 400 }
      );
    }
    
    const offer = getJoinerOffer(roomId, joinerPeerId);
    
    return NextResponse.json({
      roomId,
      joinerPeerId,
      hasOffer: !!offer,
      offer,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting joiner offer:', error);
    return NextResponse.json(
      { error: 'Failed to get joiner offer' },
      { status: 500 }
    );
  }
}

// DELETE - Clear joiner offer after connection
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const joinerPeerId = searchParams.get('joinerPeerId');
    
    if (!roomId || !joinerPeerId) {
      return NextResponse.json(
        { error: 'Missing roomId or joinerPeerId parameter' },
        { status: 400 }
      );
    }
    
    const success = clearJoinerOffer(roomId, joinerPeerId);
    
    return NextResponse.json({
      success,
      roomId,
      joinerPeerId,
    });
  } catch (error) {
    console.error('[Signaling API] Error clearing joiner offer:', error);
    return NextResponse.json(
      { error: 'Failed to clear joiner offer' },
      { status: 500 }
    );
  }
}
