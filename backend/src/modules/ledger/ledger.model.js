import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: 'Customer',
    required: [true, 'AN entry must be linked to a customer'],
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required']
  },
  description: {
    type: String,
    trim: true
  },
  invoiceNo: {
    type: String,
    trim: true,
    default: null
  },
  debit: {
    type: Number,
    default: 0,
    min: [0, 'Debit cannot be a negative value']
  },
  credit: {
    type: Number,
    default: 0,
    min: [0, 'Credit cannot be a negative value']
  },
  bankInfo: {
    bankName: { type: String, trim: true },
    utrReference: { type: String, trim: true }
  },
  remarks: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    required: true
  },
  rejectedReason: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ledgerSchema.index({ customer: 1, date: -1 });
ledgerSchema.index({ status: 1 })

ledgerSchema.statics.getAgingReport = async function (customerId) {
  const transactions = await this.find({
    customer: customerId,
    status: 'approved'
  }).sort({ date: 1 });

  let totalCredits = 0;
  const unpaidDebits = [];

  transactions.forEach(transaction => {
    if (transaction.credit > 0) totalCredits += transaction.credit;
    if (transaction.debit > 0) {
      unpaidDebits.push({
        date: transaction.date,
        amount: transaction.debit
      });
    }
  });

  let remainingCredit = totalCredits;

  for (let i = 0; i < unpaidDebits.length; i++) {
    if (remainingCredit <= 0) break;

    if (remainingCredit >= unpaidDebits[i].amount) {
      remainingCredit -= unpaidDebits[i].amount;
      unpaidDebits[i].amount = 0;
    } else {
      unpaidDebits[i].amount -= remainingCredit;
      remainingCredit = 0;
    }
  }

  const now = new Date();
  const buckets = { total: 0, current: 0, thirtyPlus: 0, sixtyPlus: 0, ninetyPlus: 0 };

  unpaidDebits.forEach(invoice => {
    if (invoice.amount > 0) {
      buckets.total += invoice.amount;

      const diffTime = Math.abs(now - new Date(invoice.date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) buckets.current += invoice.amount;
      else if (diffDays <= 60) buckets.thirtyPlus += invoice.amount;
      else if (diffDays <= 90) buckets.sixtyPlus += invoice.amount;
      else buckets.ninetyPlus += invoice.amount;
    }
  })

   if (remainingCredit > 0) {
    buckets.total = -remainingCredit;
  }

  return buckets;

};

const Ledger = mongoose.model('Ledger', ledgerSchema);

export default Ledger;