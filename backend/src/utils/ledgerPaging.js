import mongoose from 'mongoose';

// Keyset ("cursor") paging for ledger histories, newest first.
// Rows are ordered by date, then _id, so every row appears exactly once across pages
// even when several entries share the same date.

export const PAGE_SORT = { date: -1, _id: -1 };
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export const parseLimit = (raw) => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
};

export const encodeCursor = (row) =>
  Buffer.from(JSON.stringify({ d: new Date(row.date).toISOString(), i: String(row._id) })).toString('base64url');

export const decodeCursor = (cursor) => {
  try {
    const { d, i } = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    const date = new Date(d);
    if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(i)) return null;
    return { date, id: new mongoose.Types.ObjectId(i) };
  } catch {
    return null;
  }
};

// Rows strictly after the cursor in PAGE_SORT order
export const afterCursor = (baseFilter, position) =>
  position
    ? {
        ...baseFilter,
        $or: [{ date: { $lt: position.date } }, { date: position.date, _id: { $lt: position.id } }],
      }
    : baseFilter;

/**
 * Reads one page. Fetches limit + 1 rows to know whether another page exists.
 * @returns {{ rows: object[], nextCursor: string|null }}
 */
export const readPage = async (Model, baseFilter, { limit, cursor, select = '-__v' }) => {
  const docs = await Model.find(afterCursor(baseFilter, cursor))
    .select(select)
    .sort(PAGE_SORT)
    .limit(limit + 1)
    .lean();
  const hasMore = docs.length > limit;
  const rows = hasMore ? docs.slice(0, limit) : docs;
  return { rows, nextCursor: hasMore ? encodeCursor(rows[rows.length - 1]) : null };
};

/**
 * Debit / credit column totals over the WHOLE history, with exactly the arithmetic the
 * ledger tables used in the browser: `sum + (Number(value) || 0)`, added in display order.
 * `approvedOnly` mirrors LedgerTable (customer); PurchaseLedgerTable sums every row.
 */
export const sumColumns = (rows, { approvedOnly }) => {
  let debit = 0;
  let credit = 0;
  for (const row of rows) {
    if (approvedOnly && row.status !== 'approved') continue;
    debit = debit + (Number(row.debit) || 0);
    credit = credit + (Number(row.credit) || 0);
  }
  return { debit, credit };
};

export const readColumnTotals = async (Model, baseFilter, { approvedOnly }) => {
  const rows = await Model.find(baseFilter).select('status debit credit').sort(PAGE_SORT).lean();
  return sumColumns(rows, { approvedOnly });
};
