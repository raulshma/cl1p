import type { DeviceType } from '@/lib/network/discovery-store';

type NavigatorUAData = {
  mobile?: boolean;
  platform?: string;
};

export type DeviceInfoPayload = {
  deviceType: DeviceType;
  deviceName: string;
  platform: string;
  userAgent: string;
};

const UA = {
  isIpad: /iPad|Macintosh.*Mobile/,
  isIphone: /iPhone/,
  isAndroid: /Android/,
  isMobile: /Mobi|Android|iPhone|iPod/,
  isTablet: /Tablet|iPad/,
  isWindows: /Windows NT/,
  isMac: /Macintosh/,
  isLinux: /Linux/,
};

function detectDeviceType(userAgent: string, isMobileHint?: boolean): DeviceType {
  if (isMobileHint) return 'mobile';
  if (UA.isTablet.test(userAgent)) return 'tablet';
  if (UA.isMobile.test(userAgent)) return 'mobile';
  if (UA.isWindows.test(userAgent) || UA.isMac.test(userAgent) || UA.isLinux.test(userAgent)) return 'desktop';
  return 'unknown';
}



function detectPlatform(userAgentData?: NavigatorUAData, fallback?: string): string {
  if (userAgentData?.platform) return userAgentData.platform;
  if (fallback) return fallback;
  return 'unknown';
}

const DEVICE_NAME_KEY = 'lc-device-name';

const ADJECTIVES = [
  'Cosmic', 'Digital', 'Neon', 'Cyber', 'Quantum', 'Rapid', 'Silent', 'Misty',
  'Solar', 'Lunar', 'Starry', 'Hidden', 'Brave', 'Calm', 'Swift', 'Wise'
];

const ANIMALS = [
  'Phoenix', 'Dragon', 'Tiger', 'Wolf', 'Eagle', 'Dolphin', 'Falcon', 'Owl',
  'Bear', 'Fox', 'Lynx', 'Raven', 'Hawk', 'Panda', 'Koala', 'Otter'
];

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj} ${animal} #${num}`;
}

export function regenerateDeviceName(): string {
  if (typeof window === 'undefined') return 'Server Node';
  const newName = generateRandomName();
  localStorage.setItem(DEVICE_NAME_KEY, newName);
  return newName;
}

export function getDeviceInfoFromNavigator(): DeviceInfoPayload {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'unknown',
      deviceName: 'Unknown Device',
      platform: 'unknown',
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent || '';
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  const deviceType = detectDeviceType(userAgent, uaData?.mobile);
  const platform = detectPlatform(uaData, navigator.platform);

  // Get or create stored name
  let deviceName = localStorage.getItem(DEVICE_NAME_KEY);
  if (!deviceName) {
    deviceName = generateRandomName();
    localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  }

  return {
    deviceType,
    deviceName,
    platform,
    userAgent,
  };
}
