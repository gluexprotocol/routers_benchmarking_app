export const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const ssGet = <T>(
  key: string
): { etag?: string; data?: T; ts?: number } | null => {
  try {
    const raw = sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as { etag?: string; data?: T; ts?: number };
  } catch {
    return null;
  }
};

export const ssSet = <T>(key: string, value: { etag?: string; data?: T }) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...value, ts: Date.now() }));
  } catch {
    // ignore errors, eg: if storage is full
  }
};
