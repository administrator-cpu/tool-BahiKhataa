import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import User from '../auth/user.model.js';
import Customer from '../customer/customer.model.js';
import Vendor from '../Vendor/vendor.model.js';
import Ledger from '../ledger/ledger.model.js';
import PurchaseLedger from '../PurchaseLedger/purchaseLedger.model.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../tests/setup.js';

const SYNC_KEY = 'test-sync-key';
const INTERNAL_KEY = 'test-internal-key';

beforeAll(async () => {
  process.env.SYNC_API_KEY = SYNC_KEY;
  process.env.INTERNAL_BAHIKHATA_SECRET = INTERNAL_KEY;
  await connectTestDB();
});
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

const sync = (resource, query = {}, key = SYNC_KEY) =>
  request(app).get(`/api/sync/${resource}`).query(query).set('x-api-key', key);

// Follows nextCursor until hasMore is false
const syncAll = async (resource, query = {}) => {
  const all = [];
  let cursor;
  for (let i = 0; i < 50; i++) {
    const res = await sync(resource, { ...query, ...(cursor && { cursor }) });
    expect(res.statusCode).toBe(200);
    all.push(...res.body.data);
    cursor = res.body.nextCursor;
    if (!res.body.hasMore) return { all, cursor };
  }
  throw new Error('paging did not finish');
};

const makeAdmin = async () => {
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password123', role: 'admin' });
  return { admin, auth: `Bearer ${jwt.sign({ id: admin._id }, process.env.JWT_SECRET)}` };
};

describe('Sync API', () => {
  describe('authentication', () => {
    it('rejects a missing or wrong key', async () => {
      expect((await request(app).get('/api/sync/customers')).statusCode).toBe(401);
      expect((await sync('customers', {}, 'wrong')).statusCode).toBe(401);
    });

    it('is disabled when SYNC_API_KEY is not set', async () => {
      delete process.env.SYNC_API_KEY;
      try {
        expect((await sync('customers', {}, 'undefined')).statusCode).toBe(401);
        expect((await sync('customers', {}, '')).statusCode).toBe(401);
      } finally {
        process.env.SYNC_API_KEY = SYNC_KEY;
      }
    });

    it('sync key cannot call the internal write endpoints', async () => {
      const res = await request(app).delete('/api/integration/invoices/sync/INV-1').set('x-api-key', SYNC_KEY);
      expect(res.statusCode).toBe(401);
    });

    it('is read-only', async () => {
      const res = await request(app).post('/api/sync/customers').set('x-api-key', SYNC_KEY).send({});
      expect(res.statusCode).toBe(404);
    });
  });

  describe('paging', () => {
    it('returns every record exactly once across pages', async () => {
      for (let i = 0; i < 7; i++) await Customer.create({ companyName: `CUST ${i}`, address: 'x' });

      const first = await sync('customers', { limit: 3 });
      expect(first.body.count).toBe(3);
      expect(first.body.hasMore).toBe(true);

      const { all } = await syncAll('customers', { limit: 3 });
      expect(all.map((c) => c.companyName).sort()).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `CUST ${i}`));
    });

    it('does not skip records that share the same updatedAt', async () => {
      const same = new Date('2026-11-01T10:00:00.000Z');
      await Customer.collection.insertMany(
        [0, 1, 2, 3, 4].map((i) => ({ companyName: `TIE ${i}`, address: 'x', createdAt: same, updatedAt: same }))
      );
      const { all } = await syncAll('customers', { limit: 2 });
      expect(new Set(all.map((c) => String(c._id))).size).toBe(5);
    });

    it('picks up later changes from the saved cursor', async () => {
      const a = await Customer.create({ companyName: 'A', address: 'x' });
      await Customer.create({ companyName: 'B', address: 'x' });
      const { cursor } = await syncAll('customers');

      // Nothing new yet
      const empty = await sync('customers', { cursor });
      expect(empty.body.count).toBe(0);
      expect(empty.body.nextCursor).toBe(cursor);

      await new Promise((r) => setTimeout(r, 5));
      a.address = 'changed';
      await a.save();

      const next = await sync('customers', { cursor });
      expect(next.body.data.map((c) => c.companyName)).toEqual(['A']);
      expect(next.body.data[0].address).toBe('CHANGED');
    });

    it('filters by updatedSince', async () => {
      await Customer.collection.insertMany([
        { companyName: 'OLD', address: 'x', updatedAt: new Date('2026-01-01T00:00:00Z') },
        { companyName: 'NEW', address: 'x', updatedAt: new Date('2026-11-01T00:00:00Z') }
      ]);
      const res = await sync('customers', { updatedSince: '2026-06-01T00:00:00Z' });
      expect(res.body.data.map((c) => c.companyName)).toEqual(['NEW']);
    });

    it('caps limit at 500 and validates input', async () => {
      expect((await sync('customers', { limit: 100000 })).statusCode).toBe(200);
      expect((await sync('customers', { updatedSince: 'not-a-date' })).statusCode).toBe(400);
      expect((await sync('customers', { cursor: 'garbage' })).statusCode).toBe(400);
      expect((await sync('nope')).statusCode).toBe(404);
    });
  });

  describe('resources', () => {
    it('serves every resource', async () => {
      for (const r of ['customers', 'vendors', 'ledgers', 'purchase-ledgers', 'users', 'deletions']) {
        expect((await sync(r)).statusCode).toBe(200);
      }
    });

    it('never exposes passwords or reset fields for users', async () => {
      await makeAdmin();
      const res = await sync('users');
      expect(res.body.data).toHaveLength(1);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['_id', 'createdAt', 'email', 'name', 'role', 'updatedAt']);
    });

    it('reflects bill changes when a payment is allocated', async () => {
      const { auth } = await makeAdmin();
      const customer = await Customer.create({ companyName: 'PAYER', address: 'x' });
      const bill = await Ledger.create({ customer: customer._id, date: new Date(), invoiceNo: 'INV-1', description: 'b', debit: 1000, balanceDue: 1000 });
      const { cursor } = await syncAll('ledgers');

      await new Promise((r) => setTimeout(r, 5));
      await request(app).post('/api/ledger/entry').set('Authorization', auth).send({
        customer: customer._id, date: new Date(), credit: 400, bankInfo: { bankName: 'HDFC' },
        allocations: [{ billId: bill._id, amountApplied: 400 }]
      });

      const changed = (await sync('ledgers', { cursor })).body.data;
      const updatedBill = changed.find((d) => String(d._id) === String(bill._id));
      expect(changed).toHaveLength(2); // new receipt + updated bill
      expect(updatedBill.balanceDue).toBe(600);
    });
  });

  describe('deletions', () => {
    it('records a tombstone when an admin deletes a ledger entry', async () => {
      const { admin, auth } = await makeAdmin();
      const customer = await Customer.create({ companyName: 'DEL', address: 'x' });
      const bill = await Ledger.create({ customer: customer._id, date: new Date(), invoiceNo: 'INV-9', description: 'b', debit: 500, balanceDue: 500 });

      const res = await request(app).delete(`/api/ledger/${bill._id}`).set('Authorization', auth);
      expect(res.statusCode).toBe(200);

      const tombstones = (await sync('deletions')).body.data;
      expect(tombstones).toHaveLength(1);
      expect(tombstones[0]).toMatchObject({
        resource: 'ledgers', recordId: String(bill._id), customer: String(customer._id),
        invoiceNo: 'INV-9', reason: 'user-delete', deletedBy: String(admin._id)
      });
      expect(await Ledger.findById(bill._id)).toBeNull();
    });

    it('records a tombstone when the invoicing app cancels an invoice', async () => {
      const customer = await Customer.create({ companyName: 'CANCEL', address: 'x' });
      const bill = await Ledger.create({ customer: customer._id, date: new Date(), invoiceNo: 'DL/26-27/11/001', description: 'b', debit: 500, balanceDue: 500 });

      const res = await request(app)
        .delete(`/api/integration/invoices/sync/${encodeURIComponent('DL/26-27/11/001')}`)
        .set('x-api-key', INTERNAL_KEY);
      expect(res.statusCode).toBe(200);

      const [tombstone] = (await sync('deletions')).body.data;
      expect(tombstone).toMatchObject({ resource: 'ledgers', recordId: String(bill._id), reason: 'invoice-cancelled', deletedBy: null });
    });

    it('records a tombstone when a vendor ledger entry is deleted', async () => {
      const { auth } = await makeAdmin();
      const vendor = await Vendor.create({ companyName: 'V', address: 'x' });
      const bill = await PurchaseLedger.create({ vendor: vendor._id, date: new Date(), invoiceNo: 'VB-1', description: 'b', credit: 300, balanceDue: 300 });

      expect((await request(app).delete(`/api/purchase-ledger/${bill._id}`).set('Authorization', auth)).statusCode).toBe(200);

      const [tombstone] = (await sync('deletions')).body.data;
      expect(tombstone).toMatchObject({ resource: 'purchase-ledgers', recordId: String(bill._id), vendor: String(vendor._id) });
    });

    it('writes no tombstone when the delete is refused', async () => {
      const { auth } = await makeAdmin();
      const customer = await Customer.create({ companyName: 'PAID', address: 'x' });
      const bill = await Ledger.create({ customer: customer._id, date: new Date(), invoiceNo: 'INV-P', description: 'b', debit: 500, balanceDue: 0, amountPaid: 500, paymentStatus: 'Paid' });

      expect((await request(app).delete(`/api/ledger/${bill._id}`).set('Authorization', auth)).statusCode).toBe(400);
      expect((await sync('deletions')).body.data).toHaveLength(0);
    });
  });
});
