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
  description: { type: String, trim: true },
  invoiceNo: { type: String, trim: true, default: null },
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
  addedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  rejectedReason: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
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
    default: function() { return this.debit; } 
  },
  paymentsReceived: [{
    paymentId: { type: mongoose.Schema.ObjectId, ref: 'Ledger' },
    amountApplied: { type: Number },
    date: { type: Date, default: Date.now }
  }],
  unallocatedAmount: { 
    type: Number,
    default: function() { return this.credit; } 
  },
  isUsingAdvance: { type: Boolean, default: false },
  allocations: [{
    billId: { type: mongoose.Schema.ObjectId, ref: 'Ledger' },
    amountApplied: { type: Number }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ledgerSchema.index({ customer: 1, date: -1 });
ledgerSchema.index({ status: 1 });
ledgerSchema.index({ paymentStatus: 1 });

ledgerSchema.statics.getAgingReport = async function (customerId) {
  const unpaidBills = await this.find({
    customer: customerId,
    status: 'approved',
    debit: { $gt: 0 }, // It must be a bill
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
    if (due > 0) {
      buckets.total += due;

      const diffTime = Math.abs(now - new Date(bill.date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) buckets.current += due;
      else if (diffDays <= 60) buckets.thirtyPlus += due;
      else if (diffDays <= 90) buckets.sixtyPlus += due;
      else buckets.ninetyPlus += due;
    }
  });

  const Customer = mongoose.model('Customer');
  const customer = await Customer.findById(customerId).select('availableAdvance');
  
  if (customer && customer.availableAdvance > 0) {
    buckets.availableAdvance = customer.availableAdvance;
    buckets.total -= customer.availableAdvance; 
  }

  return buckets;
};


const Ledger = mongoose.model('Ledger', ledgerSchema);

export default Ledger;