import { NextResponse } from 'next/server';
import {
  addRoomRequest,
  getRoomRequests,
  removeRoomRequest,
  type DeviceType,
} from '@/lib/network/discovery-store';

export const dynamic = 'force-dynamic';

type RoomRequestPayload = {
  id: string;
  roomId: string;
  roomUrl?: string;
  senderDeviceId: string;
  senderName: string;
  senderDeviceType: DeviceType;
  senderPlatform: string;
  senderIp?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<RoomRequestPayload>;

    if (!payload.id || !payload.roomId || !payload.senderDeviceId || !payload.senderName) {
      return NextResponse.json(
        { ok: false, error: 'Missing required request fields' },
        { status: 400 }
      );
    }

    addRoomRequest({
      id: payload.id,
      roomId: payload.roomId,
      roomUrl: payload.roomUrl,
      senderDeviceId: payload.senderDeviceId,
      senderName: payload.senderName,
      senderDeviceType: payload.senderDeviceType ?? 'unknown',
      senderPlatform: payload.senderPlatform ?? 'unknown',
      senderIp: payload.senderIp,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid payload' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const requests = getRoomRequests();
  return NextResponse.json({ ok: true, requests });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Missing id' },
      { status: 400 }
    );
  }

  const removed = removeRoomRequest(id);
  return NextResponse.json({ ok: removed });
}
