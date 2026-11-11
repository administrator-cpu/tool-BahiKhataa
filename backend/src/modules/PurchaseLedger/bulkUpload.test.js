import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import User from '../auth/user.model.js';
import Vendor from '../Vendor/vendor.model.js';
import PurchaseLedger from './purchaseLedger.model.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../tests/setup.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

const setup = async () => {
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password123', role: 'admin' });
  const vendor = await Vendor.create({ companyName: 'BULK VENDOR', address: 'x' });
  return { vendor, auth: `Bearer ${jwt.sign({ id: admin._id }, process.env.JWT_SECRET)}` };
};

const row = (invoiceNo, baseAmount, extra = {}) => ({
  date: '05-11-2026', invoiceNo, description: 'd', baseAmount, tdsHead: '194C', tdsPercentage: 2, ...extra
});

describe('Vendor bulk upload', () => {
  it('accepts credit notes (negative base amounts) alongside bills and saves them', async () => {
    const { vendor, auth } = await setup();
    const bills = [row('BILL-1', 1000), row('CN-1', -1000), row('CN-2', '-2,500'), row('CN-3', '(500)'), row('BILL-2', '₹ 1,000')];

    const validate = await request(app).post('/api/purchase-ledger/bulk/validate')
      .set('Authorization', auth).send({ vendorId: vendor._id, bills });
    expect(validate.statusCode).toBe(200);
    expect(validate.body.data.hasErrors).toBe(false);

    const byInv = Object.fromEntries(validate.body.data.validatedBills.map((b) => [b.invoiceNo, b]));
    expect(byInv['CN-1']).toMatchObject({ baseAmount: -1000, totalAmount: -1180, tdsAmount: -20, payableAmount: -1160 });
    expect(byInv['CN-2'].baseAmount).toBe(-2500);
    expect(byInv['CN-3'].baseAmount).toBe(-500);
    expect(byInv['BILL-2'].baseAmount).toBe(1000);

    const commit = await request(app).post('/api/purchase-ledger/bulk/commit')
      .set('Authorization', auth).send({ vendorId: vendor._id, bills: validate.body.data.validatedBills });
    expect(commit.statusCode).toBe(201);
    expect(commit.body.data.insertedCount).toBe(5);

    const cn = await PurchaseLedger.findOne({ invoiceNo: 'CN-1' }).lean();
    expect(cn).toMatchObject({ credit: -1160, balanceDue: -1160, debit: 0, tdsAmount: -20 });
  });

  it('still rejects empty, zero and non-numeric base amounts', async () => {
    const { vendor, auth } = await setup();
    const bills = [row('A', 0), row('B', ''), row('C', 'abc'), row('D', '0')];

    const res = await request(app).post('/api/purchase-ledger/bulk/validate')
      .set('Authorization', auth).send({ vendorId: vendor._id, bills });
    expect(res.body.data.hasErrors).toBe(true);
    res.body.data.validatedBills.forEach((b) => {
      expect(b.isValid).toBe(false);
      expect(b.errors[0]).toMatch(/non-zero Base Amount/);
    });
  });
});
