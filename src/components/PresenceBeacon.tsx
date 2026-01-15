'use client';

import React from 'react';
import { getDeviceInfoFromNavigator } from '@/lib/utils/device-info';
import { getOrCreateDeviceFingerprint } from '@/lib/utils/peer-fingerprint';

const PRESENCE_INTERVAL_MS = 30000;

export function PresenceBeacon() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const deviceId = getOrCreateDeviceFingerprint();

    const sendPresence = () => {
      const info = getDeviceInfoFromNavigator();

      fetch('/api/network/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          deviceName: info.deviceName,
          deviceType: info.deviceType,
          platform: info.platform,
          userAgent: info.userAgent,
        }),
      }).catch(() => {
        // Best-effort presence update
      });
    };

    sendPresence();
    const interval = setInterval(sendPresence, PRESENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
