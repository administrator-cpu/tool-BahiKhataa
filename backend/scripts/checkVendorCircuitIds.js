// Read-only check: for one vendor, which bills have a Logical Circuit ID and which don't.
//
// Usage (from backend/):
//   npm run check:vendor-circuits -- --vendor "ACME TELECOM"   → by company name (case-insensitive)
//   npm run check:vendor-circuits -- --vendor 64ab...ef        → by vendor _id
//   npm run check:vendor-circuits -- --vendor "ACME" --csv     → also writes vendor-circuits-<name>.csv
//   npm run check:vendor-circuits                              → no vendor: summary for every vendor
//
// "Bill" = any vendor ledger row on the credit side (credit != 0), so credit notes (negative) are included.
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import Vendor from '../src/modules/Vendor/vendor.model.js';
import PurchaseLedger from '../src/modules/PurchaseLedger/purchaseLedger.model.js';

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};
const vendorArg = argValue('--vendor');
const writeCsv = args.includes('--csv');

const hasCircuit = (b) => typeof b.logicalCircuitId === 'string' && b.logicalCircuitId.trim() !== '';
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findVendor = async (value) => {
  if (mongoose.isValidObjectId(value)) {
    const byId = await Vendor.findById(value).lean();
    if (byId) return byId;
  }
  const matches = await Vendor.find({ companyName: new RegExp(escapeRegex(value.trim()), 'i') }).lean();
  const exact = matches.find((v) => v.companyName.toLowerCase() === value.trim().toLowerCase());
  if (exact) return exact;
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.log(`"${value}" matches ${matches.length} vendors, please be more specific:`);
    matches.forEach((v) => console.log(`  - ${v.companyName}  (${v._id})`));
    return null;
  }
  console.log(`No vendor found matching "${value}".`);
  return null;
};

const singleVendor = async (vendor) => {
  const bills = await PurchaseLedger.find({ vendor: vendor._id, credit: { $ne: 0 } })
    .sort({ date: 1 })
    .lean();

  const rows = bills.map((b) => ({
    date: fmtDate(b.date),
    invoiceNo: b.invoiceNo || '',
    type: b.credit < 0 ? 'Credit Note' : 'Bill',
    amount: b.credit,
    status: b.status,
    productType: b.productType || '',
    logicalCircuitId: hasCircuit(b) ? b.logicalCircuitId.trim() : ''
  }));
  const withId = rows.filter((r) => r.logicalCircuitId);
  const withoutId = rows.filter((r) => !r.logicalCircuitId);

  console.log(`Vendor: ${vendor.companyName}  (${vendor._id})`);
  console.log(`Total bills:                    ${rows.length}`);
  console.log(`With Logical Circuit ID:        ${withId.length}`);
  console.log(`WITHOUT Logical Circuit ID:     ${withoutId.length}\n`);

  if (withoutId.length) {
    console.log('--- Bills WITHOUT Logical Circuit ID ---');
    console.table(withoutId.map(({ logicalCircuitId, ...r }) => r));
  }
  if (withId.length) {
    console.log('--- Bills WITH Logical Circuit ID ---');
    console.table(withId);
  }

  if (writeCsv) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ['Has Circuit ID,Date,Invoice No,Type,Amount,Status,Product Type,Logical Circuit ID']
      .concat(rows.map((r) => [r.logicalCircuitId ? 'Yes' : 'No', r.date, r.invoiceNo, r.type, r.amount, r.status, r.productType, r.logicalCircuitId].map(esc).join(',')));
    const file = `vendor-circuits-${vendor.companyName.replace(/[^a-z0-9]+/gi, '_')}.csv`;
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`\nWrote ${file}`);
  }
};

const allVendors = async () => {
  const vendors = await Vendor.find().sort({ companyName: 1 }).lean();
  const bills = await PurchaseLedger.find({ credit: { $ne: 0 } }).select('vendor logicalCircuitId').lean();
  const stats = new Map();
  bills.forEach((b) => {
    const id = String(b.vendor);
    if (!stats.has(id)) stats.set(id, { withId: 0, withoutId: 0 });
    stats.get(id)[hasCircuit(b) ? 'withId' : 'withoutId']++;
  });
  const table = vendors.map((v) => {
    const s = stats.get(String(v._id)) || { withId: 0, withoutId: 0 };
    return { vendor: v.companyName, totalBills: s.withId + s.withoutId, withCircuitId: s.withId, withoutCircuitId: s.withoutId };
  });
  console.log('No --vendor given: summary for all vendors. Use --vendor "<name or id>" for the bill-by-bill list.\n');
  console.table(table);
};

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in .env');
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name}\n`);

  if (!vendorArg) return allVendors();
  const vendor = await findVendor(vendorArg);
  if (vendor) await singleVendor(vendor);
  else process.exitCode = 1;
};

run()
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
