import os from 'os';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getLocalIPv4Addresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  Object.values(interfaces).forEach((netInterface) => {
    if (!netInterface) return;
    netInterface.forEach((details) => {
      if (!details) return;
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    });
  });

  const envHostIp = process.env.HOST_IP || process.env.NEXT_PUBLIC_HOST_IP;
  if (envHostIp) {
    addresses.push(envHostIp);
  }

  return Array.from(new Set(addresses));
}

export async function GET() {
  const ips = getLocalIPv4Addresses();
  return NextResponse.json({ ips });
}
