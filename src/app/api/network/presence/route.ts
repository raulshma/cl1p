import { NextResponse } from 'next/server';
import { getLocalDeviceInfos, setLocalDeviceInfo, type DeviceType } from '@/lib/network/discovery-store';

export const dynamic = 'force-dynamic';

type PresencePayload = {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: string;
  userAgent: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<PresencePayload>;

    if (!payload.deviceId || !payload.deviceName || !payload.deviceType) {
      return NextResponse.json(
        { ok: false, error: 'Missing required device fields' },
        { status: 400 }
      );
    }

    setLocalDeviceInfo({
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      deviceType: payload.deviceType,
      platform: payload.platform ?? 'unknown',
      userAgent: payload.userAgent ?? '',
      lastSeen: Date.now(),
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
  const devices = getLocalDeviceInfos();
  return NextResponse.json({ ok: true, devices });
}
