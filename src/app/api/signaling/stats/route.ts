/**
 * Signaling API - Room Stats
 * 
 * GET /api/signaling/stats
 * 
 * Returns statistics about active rooms.
 */

import { NextResponse } from 'next/server';
import { getRoomStats } from '@/lib/signaling/room-storage';

export async function GET() {
  try {
    const stats = getRoomStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting room stats:', error);
    return NextResponse.json(
      { error: 'Failed to get room stats' },
      { status: 500 }
    );
  }
}
