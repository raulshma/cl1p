import { NextResponse } from 'next/server';
import { getLocalDeviceInfo, getLocalDeviceInfos } from '@/lib/network/discovery-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const devices = getLocalDeviceInfos();
  const device = devices[0] ?? getLocalDeviceInfo();
  return NextResponse.json(
    {
      ok: true,
      devices: devices.length > 0 ? devices : undefined,
      device: device ?? {
        deviceId: 'unknown',
        deviceName: 'Live Clipboard',
        deviceType: 'unknown',
        platform: 'unknown',
        userAgent: '',
        lastSeen: Date.now(),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
