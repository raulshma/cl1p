/**
 * File transfer runtime configuration
 */

import { getRuntimeEnvNumber } from '@/lib/runtime-config';

export const WEBTORRENT_THRESHOLD_MB = getRuntimeEnvNumber(
  'NEXT_PUBLIC_WEBTORRENT_THRESHOLD_MB',
  20
);

export const WEBTORRENT_THRESHOLD_BYTES = WEBTORRENT_THRESHOLD_MB * 1024 * 1024;

export const WEBTORRENT_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
];
