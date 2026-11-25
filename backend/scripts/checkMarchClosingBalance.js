// Read-only check: which customers have NO closing-balance (previous year) row dated 31 March 2026.
//
// Usage (from backend/):
//   npm run check:march-closing              → summary + list in the terminal
//   npm run check:march-closing -- --csv     → also writes march-closing-missing.csv
//   npm run check:march-closing -- --active  → only active customers
//
// A customer "has" the closing balance if any ledger row (debit > 0) is dated 31-03-2026.
// Dates saved from the UI are midnight UTC, but IST-midnight values are also covered.
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import Customer from '../src/modules/customer/customer.model.js';
import Ledger from '../src/modules/ledger/ledger.model.js';
import '../src/modules/auth/user.model.js'; // for manager populate

const args = process.argv.slice(2);
const writeCsv = args.includes('--csv');
const activeOnly = args.includes('--active');

const DAY_START = new Date('2026-03-31T00:00:00+05:30'); // 30-03 18:30 UTC (IST midnight)
const DAY_END = new Date('2026-04-01T00:00:00Z');        // end of 31-03 UTC
const CLOSING_TEXT = /opening|closing\s*bal/i;

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in .env');
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Database: ${mongoose.connection.name}\n`);

  const customers = await Customer.find(activeOnly ? { isActive: { $ne: false } } : {})
    .populate('manager', 'name')
    .sort({ companyName: 1 })
    .lean();

  // Rows dated 31 March 2026 (debit side = closing balance carried over)
  const marchRows = await Ledger.find({ date: { $gte: DAY_START, $lt: DAY_END }, debit: { $gt: 0 } })
    .select('customer debit status description invoiceNo')
    .lean();
  const marchByCustomer = new Map();
  marchRows.forEach((r) => {
    const id = String(r.customer);
    if (!marchByCustomer.has(id)) marchByCustomer.set(id, []);
    marchByCustomer.get(id).push(r);
  });

  // Closing/opening-balance looking rows on some OTHER date (likely entered with the wrong date)
  const misdated = await Ledger.find({
    debit: { $gt: 0 },
    description: CLOSING_TEXT,
    $or: [{ date: { $lt: DAY_START } }, { date: { $gte: DAY_END } }]
  }).select('customer date debit description').lean();
  const misdatedByCustomer = new Map();
  misdated.forEach((r) => misdatedByCustomer.set(String(r.customer), r));

  const missing = [];
  let withRow = 0;
  let withPendingOnly = 0;

  customers.forEach((c) => {
    const rows = marchByCustomer.get(String(c._id)) || [];
    if (rows.length > 0) {
      withRow++;
      if (!rows.some((r) => r.status === 'approved')) withPendingOnly++;
      return;
    }
    const other = misdatedByCustomer.get(String(c._id));
    missing.push({
      companyName: c.companyName,
      manager: c.manager?.name || 'Unassigned',
      isActive: c.isActive !== false,
      closingRowOnOtherDate: other ? `${fmtDate(other.date)} (${other.debit})` : ''
    });
  });

  console.log(`Customers checked:                         ${customers.length}${activeOnly ? ' (active only)' : ''}`);
  console.log(`With a row dated 31-03-2026:               ${withRow}`);
  console.log(`  ...of which none approved (pending/rej):  ${withPendingOnly}`);
  console.log(`WITHOUT a row dated 31-03-2026:            ${missing.length}`);
  console.log(`  ...of which have a closing/opening row on another date: ${missing.filter((m) => m.closingRowOnOtherDate).length}\n`);

  if (missing.length > 0) console.table(missing);

  if (writeCsv) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ['Company Name,Manager,Active,Closing Row On Other Date']
      .concat(missing.map((m) => [m.companyName, m.manager, m.isActive ? 'Yes' : 'No', m.closingRowOnOtherDate].map(esc).join(',')));
    fs.writeFileSync('march-closing-missing.csv', lines.join('\n'));
    console.log('\nWrote march-closing-missing.csv');
  }
};

run()
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
