import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 2000;

type SendRoomRequestPayload = {
  targetIp: string;
  targetPort: string;
  request: Record<string, unknown>;
};

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<SendRoomRequestPayload>;

    if (!payload.targetIp || !payload.targetPort || !payload.request) {
      return NextResponse.json(
        { ok: false, error: 'Missing target information' },
        { status: 400 }
      );
    }

    const url = `http://${payload.targetIp}:${payload.targetPort}/api/network/room-request`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.request),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Remote device responded with ${response.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to send request' },
      { status: 500 }
    );
  }
}
