import mongoose from 'mongoose';

const purchaseLedgerSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Vendor',
    required: [true, 'An entry must be linked to a vendor'],
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required']
  },
  description: { type: String },
  invoiceNo: { type: String, trim: true, default: null },
  logicalCircuitId: {
    type: String,
    trim: true,
    default: null
  },
  productType: {
    type: String,
    trim: true,
    default: null
  },

  baseAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  tdsHead: { type: String, trim: true, default: null },
  tdsPercentage: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  payableAmount: { type: Number, default: 0 },

  credit: {
    type: Number,
    default: 0,
  },
  debit: {
    type: Number,
    default: 0,
  },
  advanceAmount: {
    type: Number,
    default: 0
  },
  bankInfo: {
    bankName: { type: String },
    utrReference: { type: String, trim: true }
  },
  remarks: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  rejectedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedReason: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid'
  },
  amountPaid: { type: Number, default: 0 },

  balanceDue: {
    type: Number,
    default: function () { return this.credit; }
  },

  paymentsMade: [{
    paymentId: { type: mongoose.Schema.ObjectId, ref: 'PurchaseLedger' },
    amountApplied: { type: Number },
    date: { type: Date, default: Date.now }
  }],

  unallocatedAmount: {
    type: Number,
    default: function () { return this.debit; }
  },
  isUsingAdvance: { type: Boolean, default: false },

  allocations: [{
    billId: { type: mongoose.Schema.ObjectId, ref: 'PurchaseLedger' },
    amountApplied: { type: Number }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

purchaseLedgerSchema.index({ vendor: 1, date: -1 });
purchaseLedgerSchema.index({ status: 1 });
purchaseLedgerSchema.index({ paymentStatus: 1 });
purchaseLedgerSchema.index({ status: 1, paymentStatus: 1, credit: 1 });


purchaseLedgerSchema.statics.getAgingReport = async function (vendorId) {
  const unpaidBills = await this.find({
    vendor: vendorId,
    status: 'approved',
    credit: { $ne: 0 },
    paymentStatus: { $ne: 'Paid' }
  });

  const now = new Date();
  const buckets = {
    total: 0,
    current: 0,
    thirtyPlus: 0,
    sixtyPlus: 0,
    ninetyPlus: 0,
    availableAdvance: 0
  };

  unpaidBills.forEach(bill => {
    const due = bill.balanceDue;
    if (due !== 0) {
      buckets.total += due;
      const diffTime = Math.abs(now - new Date(bill.date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (due < 0 || diffDays <= 30) buckets.current += due;
      else if (diffDays <= 60) buckets.thirtyPlus += due;
      else if (diffDays <= 90) buckets.sixtyPlus += due;
      else buckets.ninetyPlus += due;
    }
  });

  const Vendor = mongoose.model('Vendor');
  const vendor = await Vendor.findById(vendorId).select('availableAdvance');

  if (vendor && vendor.availableAdvance > 0) {
    buckets.availableAdvance = vendor.availableAdvance;
    buckets.total -= vendor.availableAdvance;
  }

  return buckets;
};

const PurchaseLedger = mongoose.models.PurchaseLedger || mongoose.model('PurchaseLedger', purchaseLedgerSchema);

export default PurchaseLedger;