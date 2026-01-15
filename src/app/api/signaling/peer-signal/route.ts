/**
 * Signaling API - Peer-to-Peer Signaling for Mesh Topology
 * 
 * POST /api/signaling/peer-signal - Send a signal from one peer to another
 * GET /api/signaling/peer-signal?roomId=xxx&toPeerId=yyy - Get pending signals for a peer
 * DELETE /api/signaling/peer-signal - Clear a processed signal
 */

import { NextResponse } from 'next/server';
import { 
  setPeerSignal, 
  getPendingSignalsForPeer, 
  clearPeerSignal 
} from '@/lib/signaling/room-storage';
import type { SignalData } from '@/types';

interface SendPeerSignalRequest {
  roomId: string;
  fromPeerId: string;
  toPeerId: string;
  signal: SignalData;
}

interface ClearPeerSignalRequest {
  roomId: string;
  fromPeerId: string;
  toPeerId: string;
}

// POST - Send a signal from one peer to another
export async function POST(request: Request) {
  try {
    const body = await request.json() as SendPeerSignalRequest;
    
    const { roomId, fromPeerId, toPeerId, signal } = body;
    
    if (!roomId || !fromPeerId || !toPeerId || !signal) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, fromPeerId, toPeerId, signal' },
        { status: 400 }
      );
    }
    
    const success = setPeerSignal(roomId, fromPeerId, toPeerId, signal);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      roomId,
      fromPeerId,
      toPeerId,
    });
  } catch (error) {
    console.error('[Signaling API] Error sending peer signal:', error);
    return NextResponse.json(
      { error: 'Failed to send peer signal' },
      { status: 500 }
    );
  }
}

// GET - Get pending signals for a peer
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const toPeerId = searchParams.get('toPeerId');
    
    if (!roomId || !toPeerId) {
      return NextResponse.json(
        { error: 'Missing roomId or toPeerId parameter' },
        { status: 400 }
      );
    }
    
    const pendingSignals = getPendingSignalsForPeer(roomId, toPeerId);
    
    return NextResponse.json({
      roomId,
      toPeerId,
      signals: pendingSignals,
      count: pendingSignals.length,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting peer signals:', error);
    return NextResponse.json(
      { error: 'Failed to get peer signals' },
      { status: 500 }
    );
  }
}

// DELETE - Clear a processed signal
export async function DELETE(request: Request) {
  try {
    const body = await request.json() as ClearPeerSignalRequest;
    
    const { roomId, fromPeerId, toPeerId } = body;
    
    if (!roomId || !fromPeerId || !toPeerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, fromPeerId, toPeerId' },
        { status: 400 }
      );
    }
    
    const success = clearPeerSignal(roomId, fromPeerId, toPeerId);
    
    return NextResponse.json({
      success,
      roomId,
      fromPeerId,
      toPeerId,
    });
  } catch (error) {
    console.error('[Signaling API] Error clearing peer signal:', error);
    return NextResponse.json(
      { error: 'Failed to clear peer signal' },
      { status: 500 }
    );
  }
}
