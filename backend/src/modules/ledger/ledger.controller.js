import Ledger from './ledger.model.js';
import Customer from '../customer/customer.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

export const addPendingPayment = catchAsync(async (req, res, next) => {
  const { customer, paymentDate, amount, bankName, utrReference, remarks } = req.body;
  

  const targetCustomer = await Customer.findById(customer);
  if (!targetCustomer || targetCustomer.manager.toString() !== req.user.id) {
    return next(new AppError('Customer not found or not assigned to you', 404));
  }

  const log = await Ledger.create({
    customer,
    date: paymentDate,
    description: `${bankName} - ${utrReference}`,
    credit: amount,
    bankInfo: { bankName, utrReference },
    remarks,
    status: 'pending',
    addedBy: req.user.id
  });

  res.status(201).json({ status: 'success', data: { log } });
});

export const getPendingQueue = catchAsync(async (req, res, next) => {
  const { manager } = req.query;
  
  const logs = await Ledger.find({ 
    addedBy: manager, 
    status: 'pending' 
  }).populate({
    path: 'customer',
    select: 'companyName' 
  });

  res.status(200).json({ status: 'success', data: { logs } });
});

export const reviewPendingLog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;

  const log = await Ledger.findById(id);
  if (!log) return next(new AppError('Log not found', 404));
  if (log.status !== 'pending') return next(new AppError('Log is not in pending state', 400));

  if (action === 'approve') {
    log.status = 'approved';
  } else if (action === 'reject') {
    if (!rejectionReason) return next(new AppError('Rejection reason is required', 400));
    log.status = 'rejected';
    log.rejectionReason = rejectionReason;
  } else {
    return next(new AppError('Invalid action', 400));
  }

  await log.save();

  res.status(200).json({ status: 'success', data: { log } });
});

export const addDirectEntry = catchAsync(async (req, res, next) => {
  const newEntry = await Ledger.create({
    ...req.body,
    description: req.body.description || req.body.desc,
    status: 'approved',
    addedBy: req.user.id
  });

  res.status(201).json({ status: 'success', data: { log: newEntry } });
});

// export const getCustomerDashboard = catchAsync(async (req, res, next) => {
//   const { customerId } = req.params;

//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 20;
//   const skip = (page - 1) * limit;

//   const paginatedLogs = await Ledger.find({ customer: customerId }).sort({ date: -1 }).skip(skip).limit(limit);

//   const totalLogs = await Ledger.countDocuments({ customer: customerId });
//   const totalPages = Math.ceil(totalLogs / limit);

//   const agingReport = await Ledger.getAgingReport(customerId);

//   res.status(200).json({
//     status: 'success',
//     data: {
//       aging: agingReport,
//       pagination: {
//         currentPage: page,
//         totalPages: totalPages,
//         totalRecords: totalLogs,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1
//       },
//       transactions: paginatedLogs
//     }

export const getCustomerDashboard = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;

  const ledgerData = await Ledger.find({ 
    customer: customerId,
    status: { $in: ['approved', 'pending'] } 
  }).sort({ date: -1 });
  let totalDebit = 0;
  let totalCredit = 0;

  ledgerData.forEach(log => {
    if (log.status === 'approved') {
      if (log.debit) totalDebit += log.debit;
      if (log.credit) totalCredit += log.credit;
    }
  });

  const agingReport = await Ledger.getAgingReport(customerId);

  res.status(200).json({
    status: 'success',
    data: {
      transactions: ledgerData,
      totals: { 
        debit: totalDebit, 
        credit: totalCredit 
      },
      aging: agingReport
    }
  });
});

//   });
});
