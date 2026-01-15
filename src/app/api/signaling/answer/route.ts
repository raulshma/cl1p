/**
 * Signaling API - Submit Answer / Get Answers
 * 
 * POST /api/signaling/answer - Submit a joiner's answer
 * GET /api/signaling/answer?roomId=xxx - Get pending answers (for host polling)
 */

import { NextResponse } from 'next/server';
import { addJoinerAnswer, getPendingAnswers, clearAnswer } from '@/lib/signaling/room-storage';
import type { SignalData } from '@/types';

interface SubmitAnswerRequest {
  roomId: string;
  answer: SignalData;
  joinerPeerId: string;
}

// POST - Submit answer (joiner)
export async function POST(request: Request) {
  try {
    const body = await request.json() as SubmitAnswerRequest;
    
    const { roomId, answer, joinerPeerId } = body;
    
    // Validate required fields
    if (!roomId || !answer || !joinerPeerId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, answer, joinerPeerId' },
        { status: 400 }
      );
    }
    
    // Validate answer structure
    if (!answer.type || answer.type !== 'answer') {
      return NextResponse.json(
        { error: 'Invalid answer: must have type "answer"' },
        { status: 400 }
      );
    }
    
    // Add answer to room
    const success = addJoinerAnswer(roomId, answer, joinerPeerId);
    
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
    console.error('[Signaling API] Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}

// GET - Get pending answers (host polling)
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
    
    const answers = getPendingAnswers(roomId);
    
    return NextResponse.json({
      roomId,
      answers,
      count: answers.length,
    });
  } catch (error) {
    console.error('[Signaling API] Error getting answers:', error);
    return NextResponse.json(
      { error: 'Failed to get answers' },
      { status: 500 }
    );
  }
}

// DELETE - Clear a processed answer (optional)
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
    
    const success = clearAnswer(roomId, joinerPeerId);
    
    return NextResponse.json({
      success,
      roomId,
      joinerPeerId,
    });
  } catch (error) {
    console.error('[Signaling API] Error clearing answer:', error);
    return NextResponse.json(
      { error: 'Failed to clear answer' },
      { status: 500 }
    );
  }
}
