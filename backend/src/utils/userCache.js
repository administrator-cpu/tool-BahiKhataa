// Short-lived cache of the logged-in user so `protect` doesn't spend a database
// round trip on every request. Any write to the users collection clears it
// (see user.model.js), so role / password / deletion changes apply immediately
// on this server. With several API instances, others catch up within the TTL.
const TTL_MS = Number(process.env.AUTH_USER_CACHE_MS ?? 30000);
const MAX_ENTRIES = 1000;
const cache = new Map();

export const getCachedUser = (id) => {
  const hit = cache.get(id);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(id);
    return null;
  }
  return hit.user;
};

export const setCachedUser = (id, user) => {
  if (TTL_MS <= 0) return;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(id, { user, expires: Date.now() + TTL_MS });
};

export const clearUserCache = () => cache.clear();
