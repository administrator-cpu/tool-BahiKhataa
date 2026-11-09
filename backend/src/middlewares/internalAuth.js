import crypto from 'crypto';

const keysMatch = (provided, expected) => {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Read-only sync clients (e.g. Ledgerly). Uses its own key (SYNC_API_KEY),
 * separate from INTERNAL_BAHIKHATA_SECRET, which can also call write endpoints.
 * If SYNC_API_KEY is not set, the sync API stays disabled.
 */
export const protectSyncClients = (req, res, next) => {
  if (keysMatch(req.headers['x-api-key'], process.env.SYNC_API_KEY)) {
    return next();
  }

  return res.status(401).json({
    status: 'fail',
    message: 'Unauthorized sync request. Invalid API Key.'
  });
};

export const protectInternalApps = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && apiKey === process.env.INTERNAL_BAHIKHATA_SECRET) {
    return next();
  }

  return res.status(401).json({
    status: 'fail',
    message: 'Unauthorized internal request. Invalid API Key.'
  });
};