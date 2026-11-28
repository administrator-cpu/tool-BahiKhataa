import mongoose from 'mongoose';

// Same bucket rules as Ledger.getAgingReport / PurchaseLedger.getAgingReport,
// but computed for many parties in ONE aggregation instead of 2 queries per party.

const DAY_MS = 86400000;
const ageDays = { $ceil: { $divide: [{ $abs: { $subtract: ['$$NOW', '$date'] } }, DAY_MS] } };
const sumIf = (cond) => ({ $sum: { $cond: [cond, '$balanceDue', 0] } });
const EMPTY = { total: 0, current: 0, thirtyPlus: 0, sixtyPlus: 0, ninetyPlus: 0 };

const bucketGroup = (partyField, currentCond) => ({
  $group: {
    _id: `$${partyField}`,
    total: { $sum: '$balanceDue' },
    current: sumIf(currentCond),
    thirtyPlus: sumIf({ $and: [{ $not: [currentCond] }, { $gt: ['$days', 30] }, { $lte: ['$days', 60] }] }),
    sixtyPlus: sumIf({ $and: [{ $not: [currentCond] }, { $gt: ['$days', 60] }, { $lte: ['$days', 90] }] }),
    ninetyPlus: sumIf({ $and: [{ $not: [currentCond] }, { $gt: ['$days', 90] }] }),
  },
});

const toBuckets = (parties, rows) => {
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const out = new Map();
  for (const p of parties) {
    const r = byId.get(String(p._id)) || EMPTY;
    const advance = p.availableAdvance > 0 ? p.availableAdvance : 0;
    out.set(String(p._id), {
      total: r.total - advance,
      current: r.current,
      thirtyPlus: r.thirtyPlus,
      sixtyPlus: r.sixtyPlus,
      ninetyPlus: r.ninetyPlus,
      availableAdvance: advance,
    });
  }
  return out;
};

/**
 * @param parties lean customer docs with { _id, availableAdvance }
 * @param scoped  true → restrict to these customers; false → all customers (admin view)
 * @returns Map<customerId, aging>
 */
export const getCustomerAgingMap = async (parties, { scoped = true } = {}) => {
  if (!parties.length) return new Map();
  const Ledger = mongoose.model('Ledger');
  const match = { status: 'approved', debit: { $gt: 0 }, balanceDue: { $gt: 0 }, paymentStatus: { $ne: 'Paid' } };
  if (scoped) match.customer = { $in: parties.map((p) => p._id) };

  const rows = await Ledger.aggregate([
    { $match: match },
    { $project: { customer: 1, balanceDue: 1, days: ageDays } },
    bucketGroup('customer', { $lte: ['$days', 30] }),
  ]);
  return toBuckets(parties, rows);
};

/** Vendor variant: negative balances (debit notes) count, and always land in "current". */
export const getVendorAgingRows = (vendorIds = null) => {
  const PurchaseLedger = mongoose.model('PurchaseLedger');
  const match = { status: 'approved', credit: { $ne: 0 }, paymentStatus: { $ne: 'Paid' }, balanceDue: { $ne: 0 } };
  if (vendorIds) match.vendor = { $in: vendorIds };
  return PurchaseLedger.aggregate([
    { $match: match },
    { $project: { vendor: 1, balanceDue: 1, days: ageDays } },
    bucketGroup('vendor', { $or: [{ $lt: ['$balanceDue', 0] }, { $lte: ['$days', 30] }] }),
  ]);
};

export const getVendorAgingMap = async (parties) => {
  if (!parties.length) return new Map();
  return toBuckets(parties, await getVendorAgingRows());
};

export { toBuckets };
