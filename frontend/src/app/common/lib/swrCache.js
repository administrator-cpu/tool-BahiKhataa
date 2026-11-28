// Tiny stale-while-revalidate cache for API reads.
// - peek(key): last response for this key (or undefined), to paint instantly
// - load(key, fetcher): fetch fresh data; concurrent callers share one request
// - prefetch(key, fetcher): warm the cache (e.g. on hover) unless it is very fresh
// The server stays the only source of truth: cached data is always followed by a fresh load.

const store = new Map();
const inflight = new Map();
export const FRESH_MS = 5000; // younger than this: use as-is, no refetch on mount
const MAX_STALE_MS = 60000;   // older than this: never painted, always refetched

// Until the first page load has hydrated, components must render exactly what the server
// HTML contains, so cached data is only offered for painting after that (see CacheReady).
let hydrated = false;
export const markHydrated = () => { hydrated = true; };

export const peek = (key) => {
  if (!hydrated) return undefined;
  const hit = store.get(key);
  return hit && Date.now() - hit.at < MAX_STALE_MS ? hit.data : undefined;
};

export const isFresh = (key) => {
  const hit = store.get(key);
  return !!hit && Date.now() - hit.at < FRESH_MS;
};

export function load(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key);
  const p = fetcher()
    .then((data) => {
      store.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function prefetch(key, fetcher) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return;
  load(key, fetcher).catch(() => {});
}

export const invalidate = (key) => store.delete(key);

// For rarely-changing lists (e.g. employees): reuse a response younger than ttlMs.
export function cachedLoad(key, fetcher, ttlMs) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data);
  return load(key, fetcher);
}
