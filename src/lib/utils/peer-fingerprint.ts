const FINGERPRINT_KEY = 'lc-device-fingerprint';
const SESSION_KEY = 'lc-session-id';

type PeerRole = 'host' | 'peer';



export const getOrCreateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server';

  const existing = localStorage.getItem(FINGERPRINT_KEY);
  if (existing) return existing;

  const fingerprint = 
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      
  localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  return fingerprint;
};

export const regenerateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server';

  const fingerprint = 
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

  localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  return fingerprint;
};

export const getOrCreateSessionId = (): string => {
  if (typeof window === 'undefined') return 'server';

  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `s-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

  sessionStorage.setItem(SESSION_KEY, randomId);
  return randomId;
};

export const buildPeerId = (role: PeerRole): string => {
  const fingerprint = getOrCreateDeviceFingerprint();
  const sessionId = getOrCreateSessionId();

  const shortFingerprint = fingerprint.slice(0, 10) || 'device';
  const shortSession = sessionId.slice(0, 6) || 'session';

  return `${role}-${shortFingerprint}-${shortSession}`;
};
