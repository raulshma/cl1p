import os from 'os';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 800;
const CONCURRENCY_LIMIT = 24;

type DiscoveredDevice = {
  ip: string;
  port: string;
  device: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    platform: string;
    userAgent: string;
    lastSeen: number;
  };
};

type IdentifyResponse = {
  ok?: boolean;
  device?: DiscoveredDevice['device'];
  devices?: DiscoveredDevice['device'][];
};

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

function getHostAndPort(request: Request): { protocol: string; host: string; port: string } {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto ?? (request.url.startsWith('https') ? 'https' : 'http');
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const [host = '', portPart] = hostHeader.split(':');
  const port = portPart || (protocol === 'https' ? '443' : '80');

  return { protocol, host, port };
}

function getSubnetCandidates(ip: string): string[] {
  const parts = ip.split('.');
  if (parts.length !== 4) return [];
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  return Array.from({ length: 254 }, (_, index) => `${prefix}.${index + 1}`);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      const task = tasks[current];
      if (!task) continue;
      const result = await task();
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

export async function GET(request: Request) {
  const { protocol, port } = getHostAndPort(request);
  const localIps = getLocalIPv4Addresses();

  if (localIps.length === 0) {
    return NextResponse.json({ ok: true, devices: [] });
  }

  const candidateIps = new Set<string>();
  localIps.forEach((ip) => {
    getSubnetCandidates(ip).forEach((candidate) => {
      candidateIps.add(candidate);
    });
    candidateIps.add(ip);
  });

  const tasks = Array.from(candidateIps).map((ip) => async () => {
    const url = `${protocol}://${ip}:${port}/api/network/identify`;
    try {
      const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (!response.ok) return null;
      const data = (await response.json()) as IdentifyResponse;
      const devices = Array.isArray(data.devices)
        ? data.devices
        : data.device
          ? [data.device]
          : [];
      if (devices.length === 0) return null;
      return devices.map((device) => ({
        ip,
        port,
        device,
      })) as DiscoveredDevice[];
    } catch {
      return null;
    }
  });

  const results = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  const devices = results.flatMap((entry) => entry ?? []) as DiscoveredDevice[];

  return NextResponse.json({ ok: true, devices });
}
