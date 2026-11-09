import mongoose from 'mongoose';
import Customer from '../customer/customer.model.js';
import Vendor from '../Vendor/vendor.model.js';
import Ledger from '../ledger/ledger.model.js';
import PurchaseLedger from '../PurchaseLedger/purchaseLedger.model.js';
import User from '../auth/user.model.js';
import DeletedRecord from './deletedRecord.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// resource name in the URL -> model + the fields exposed (null = all fields)
const RESOURCES = {
  customers: { model: Customer, select: null },
  vendors: { model: Vendor, select: null },
  ledgers: { model: Ledger, select: null },
  'purchase-ledgers': { model: PurchaseLedger, select: null },
  // Only what is needed to resolve `manager` / `addedBy`; never auth fields
  users: { model: User, select: 'name email role createdAt updatedAt' },
  deletions: { model: DeletedRecord, select: null }
};

// Cursor = position of the last record returned, as (updatedAt, _id)
const encodeCursor = (doc) =>
  Buffer.from(JSON.stringify({ u: doc.updatedAt.toISOString(), i: doc._id.toString() })).toString('base64url');

const decodeCursor = (cursor) => {
  try {
    const { u, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const updatedAt = new Date(u);
    if (isNaN(updatedAt.getTime()) || !mongoose.Types.ObjectId.isValid(i)) throw new Error('bad cursor');
    return { updatedAt, id: new mongoose.Types.ObjectId(i) };
  } catch {
    return null;
  }
};

/**
 * GET /api/sync/:resource?updatedSince=&cursor=&limit=
 * Read-only, ordered by (updatedAt, _id). Follow `nextCursor` until `hasMore` is false.
 */
export const getSyncPage = catchAsync(async (req, res, next) => {
  const config = RESOURCES[req.params.resource];
  if (!config) {
    return next(new AppError(`Unknown sync resource. Use one of: ${Object.keys(RESOURCES).join(', ')}`, 404));
  }

  const { updatedSince, cursor } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const conditions = [];

  if (updatedSince) {
    const since = new Date(updatedSince);
    if (isNaN(since.getTime())) {
      return next(new AppError('updatedSince must be an ISO 8601 date, e.g. 2026-11-01T00:00:00Z', 400));
    }
    conditions.push({ updatedAt: { $gte: since } });
  }

  if (cursor) {
    const position = decodeCursor(cursor);
    if (!position) return next(new AppError('Invalid cursor', 400));
    conditions.push({
      $or: [
        { updatedAt: { $gt: position.updatedAt } },
        { updatedAt: position.updatedAt, _id: { $gt: position.id } }
      ]
    });
  }

  const filter = conditions.length ? { $and: conditions } : {};

  let query = config.model.find(filter).sort({ updatedAt: 1, _id: 1 }).limit(limit + 1).lean();
  if (config.select) query = query.select(config.select);
  const docs = await query;

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  res.status(200).json({
    status: 'success',
    resource: req.params.resource,
    count: page.length,
    hasMore,
    nextCursor: page.length ? encodeCursor(page[page.length - 1]) : (cursor || null),
    serverTime: new Date().toISOString(),
    data: page
  });
});
