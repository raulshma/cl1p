/**
 * Signaling API - Pending Joiners & Joiner Offers
 * 
 * GET /api/signaling/pending?roomId=xxx - Get pending joiners (host polls this)
 * POST /api/signaling/pending - Set offer for a specific joiner (host calls this)
 */

import { NextResponse } from 'next/server';
import { getPendingJoiners, setJoinerOffer } from '@/lib/signaling/room-storage';
import type { SignalData } from '@/types';

interface SetJoinerOfferRequest {
  roomId: string;
  joinerPeerId: string;
  offer: SignalData;
}

// GET - Get pending joiners who need offers
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
    
    const pendingJoiners = getPendingJoiners(roomId);
    
    return NextResponse.json({
      roomId,
      pendingJoiners,
      count: pendingJoiners.length,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting pending joiners:', error);
    return NextResponse.json(
      { error: 'Failed to get pending joiners' },
      { status: 500 }
    );
  }
}

// POST - Set offer for a specific joiner
export async function POST(request: Request) {
  try {
    const body = await request.json() as SetJoinerOfferRequest;
    
    const { roomId, joinerPeerId, offer } = body;
    
    if (!roomId || !joinerPeerId || !offer) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, joinerPeerId, offer' },
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
    
    const success = setJoinerOffer(roomId, joinerPeerId, offer);
    
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
    });
  } catch (error) {
    console.error('[Signaling API] Error setting joiner offer:', error);
    return NextResponse.json(
      { error: 'Failed to set joiner offer' },
      { status: 500 }
    );
  }
}
