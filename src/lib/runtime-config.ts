type RuntimeConfig = Record<string, string | undefined>;

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

const getRuntimeSource = (): RuntimeConfig => {
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__;
  }

  return process.env as RuntimeConfig;
};

export const getRuntimeEnv = (
  key: string,
  fallback?: string
): string | undefined => {
  const source = getRuntimeSource();
  const value = source[key];

  return value ?? fallback;
};

export const getRuntimeEnvNumber = (
  key: string,
  fallback: number
): number => {
  const value = getRuntimeEnv(key);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRuntimeEnvBoolean = (
  key: string,
  fallback: boolean
): boolean => {
  const value = getRuntimeEnv(key);

  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};
