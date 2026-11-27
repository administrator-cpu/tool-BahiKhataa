// API tests: need the test database
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import User from '../auth/user.model.js';
import Vendor from '../Vendor/vendor.model.js';
import PurchaseLedger from '../PurchaseLedger/purchaseLedger.model.js';
import { crmClient } from '../../utils/crmClient.js';
import { clearCrmConnectionsCache } from './crmConnections.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../tests/setup.js';

const originalAdapter = crmClient.defaults.adapter;
const CONNECTIONS = [
  { crmConnectionId: 'k1', fabCircuitId: 'FAB-1', customer: { name: 'CUST A' }, serviceType: 'ILL', bandwidth: '100', telcoProvider: 'Airtel', telecoCircuitId: 'AIR-001', commercials: { ratePerMb: 50 }, providerCost: { ratePerMb: 30 }, status: 'Active' },
  { crmConnectionId: 'k2', fabCircuitId: 'FAB-2', customer: { name: 'CUST B' }, serviceType: 'DNC', bandwidth: '1000', telcoProvider: 'TCL', telecoCircuitId: 'TCL-002', commercials: { ratePerMb: 30 }, providerCost: { ratePerMb: 18 }, status: 'Active' }
];
const mockCrm = (connections = CONNECTIONS) => {
  crmClient.defaults.adapter = async (config) => ({
    data: { success: true, data: connections, hasMore: false, nextCursor: null }, status: 200, statusText: 'OK', headers: {}, config
  });
};

beforeAll(async () => await connectTestDB());
afterEach(async () => {
  crmClient.defaults.adapter = originalAdapter;
  clearCrmConnectionsCache();
  await clearTestDB();
});
afterAll(async () => await closeTestDB());

const makeUser = async (role = 'admin') => {
  const user = await User.create({ name: 'U', email: `${role}@test.com`, password: 'Password123', role });
  return `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
};

describe('Circuit billing API', () => {
  it('shows circuits a vendor billed and bills the CRM does not know', async () => {
    mockCrm();
    const auth = await makeUser();
    const vendor = await Vendor.create({ companyName: 'AIRTEL', address: 'x' });
    await PurchaseLedger.create([
      { vendor: vendor._id, date: new Date(), invoiceNo: 'B1', description: 'd', credit: 3000, logicalCircuitId: 'air 001' },
      { vendor: vendor._id, date: new Date(), invoiceNo: 'B2', description: 'd', credit: 100, logicalCircuitId: 'NOPE' },
      { vendor: vendor._id, date: new Date(), invoiceNo: 'B3', description: 'd', credit: 100, logicalCircuitId: 'TCL-002', status: 'rejected' },
      { vendor: vendor._id, date: new Date(), invoiceNo: 'P1', description: 'd', debit: 500, bankInfo: { bankName: 'HDFC' } }
    ]);

    const res = await request(app).get(`/api/circuit-billing/vendor/${vendor._id}`).set('Authorization', auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.summary).toMatchObject({ billsChecked: 2, billedCircuits: 1, billsNotInCrm: 1 });
    expect(res.body.data.billedCircuits[0]).toMatchObject({ fabCircuitId: 'FAB-1', customerName: 'CUST A', telcoRatePerMb: 30 });
  });

  it('lists circuits nobody has billed (rejected bills do not count)', async () => {
    mockCrm();
    const auth = await makeUser();
    const vendor = await Vendor.create({ companyName: 'ANY', address: 'x' });
    await PurchaseLedger.create([
      { vendor: vendor._id, date: new Date(), invoiceNo: 'B1', description: 'd', credit: 3000, logicalCircuitId: 'AIR-001' },
      { vendor: vendor._id, date: new Date(), invoiceNo: 'B2', description: 'd', credit: 100, logicalCircuitId: 'TCL-002', status: 'rejected' }
    ]);

    const res = await request(app).get('/api/circuit-billing/unbilled').set('Authorization', auth);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.circuits.map((c) => c.fabCircuitId)).toEqual(['FAB-2']);
  });

  it('returns 502 when the CRM is down, 404 for an unknown vendor, 403 for employees', async () => {
    crmClient.defaults.adapter = async () => { throw new Error('down'); };
    const auth = await makeUser();
    const vendor = await Vendor.create({ companyName: 'V', address: 'x' });

    expect((await request(app).get(`/api/circuit-billing/vendor/${vendor._id}`).set('Authorization', auth)).statusCode).toBe(502);
    expect((await request(app).get('/api/circuit-billing/vendor/64b000000000000000000000').set('Authorization', auth)).statusCode).toBe(404);

    const employee = await makeUser('employee');
    expect((await request(app).get('/api/circuit-billing/unbilled').set('Authorization', employee)).statusCode).toBe(403);
  });
});
