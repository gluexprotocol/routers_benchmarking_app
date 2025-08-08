type Entry<T> = { value: T; expiresAt: number; etag: string };

const store = new Map<string, Entry<any>>();

const MAX_ENTRIES = 500; // capacity cap
const SWEEP_LIMIT = 50; // max expired items removed per sweep

function now() {
  return Date.now();
}

function pruneExpired() {
  let removed = 0;
  for (const [k, v] of store) {
    if (v.expiresAt <= now()) {
      store.delete(k);
      if (++removed >= SWEEP_LIMIT) break;
    }
  }
}

function ensureCapacity() {
  while (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) {
      break;
    }
    store.delete(oldestKey);
  }
}

export function getCache<T>(key: string): { value: T; etag: string } | null {
  pruneExpired();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  // LRU bump
  store.delete(key);
  store.set(key, entry);
  return { value: entry.value as T, etag: entry.etag };
}

export function setCache<T>(
  key: string,
  value: T,
  ttlMs: number,
  etag: string
) {
  pruneExpired();
  const entry: Entry<T> = { value, expiresAt: now() + ttlMs, etag };
  store.set(key, entry);
  ensureCapacity();
}

export function makeKey(base: string, params: Record<string, any>) {
  return `${base}:${Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;
}
