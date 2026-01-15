/**
 * Signaling API - Get Offer
 * 
 * GET /api/signaling/offer?roomId=xxx
 * 
 * Gets the host's offer for a room (used by joiners).
 */

import { NextResponse } from 'next/server';
import { getRoomOffer } from '@/lib/signaling/room-storage';

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
    
    const result = getRoomOffer(roomId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Room not found or no offer available', hasOffer: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      hasOffer: true,
      offer: result.offer,
      hostPeerId: result.hostPeerId,
      roomId,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting offer:', error);
    return NextResponse.json(
      { error: 'Failed to get offer' },
      { status: 500 }
    );
  }
}
