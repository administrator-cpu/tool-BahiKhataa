import { crmClient } from '../../utils/crmClient.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

// Every ever-activated CRM connection, fetched page by page from GET /api/crm/connections.
// Kept in memory for a few minutes so opening several vendor pages doesn't refetch everything.
const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_LIMIT = 500;
const MAX_PAGES = 200; // safety stop (100k connections)

let cache = { data: null, fetchedAt: 0 };
let inFlight = null;

const fetchAllPages = async () => {
  const all = [];
  let cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data: body } = await crmClient.get('/api/crm/connections', {
      params: { limit: PAGE_LIMIT, ...(cursor && { cursor }) },
      timeout: 30000
    });
    all.push(...(body?.data || []));
    if (!body?.hasMore) return all;
    if (!body.nextCursor || body.nextCursor === cursor) break;
    cursor = body.nextCursor;
  }
  throw new Error('CRM connections paging did not finish');
};

export const getCrmConnections = async ({ refresh = false } = {}) => {
  const fresh = cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (fresh && !refresh) return { connections: cache.data, fetchedAt: new Date(cache.fetchedAt) };

  if (!inFlight) {
    inFlight = fetchAllPages()
      .then((data) => {
        cache = { data, fetchedAt: Date.now() };
        return data;
      })
      .finally(() => { inFlight = null; });
  }

  try {
    const connections = await inFlight;
    return { connections, fetchedAt: new Date(cache.fetchedAt) };
  } catch (err) {
    logger.error('Failed to load CRM connections', { error: err.message, status: err.response?.status });
    throw new AppError('Could not load connection data from the CRM. Please try again shortly.', 502);
  }
};

export const clearCrmConnectionsCache = () => {
  cache = { data: null, fetchedAt: 0 };
  inFlight = null;
};
