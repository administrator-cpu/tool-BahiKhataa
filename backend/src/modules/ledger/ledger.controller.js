import mongoose from 'mongoose';
import Ledger from './ledger.model.js';
import Customer from '../customer/customer.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

const processPaymentAllocations = async (paymentLog) => {
  let totalAllocated = 0;

  if (paymentLog.allocations && paymentLog.allocations.length > 0) {
    for (const alloc of paymentLog.allocations) {
      const bill = await Ledger.findById(alloc.billId);

      if (bill && bill.debit > 0) {
        bill.amountPaid += alloc.amountApplied;
        bill.balanceDue -= alloc.amountApplied;

        if (bill.balanceDue <= 0) {
          bill.balanceDue = 0;
          bill.paymentStatus = 'Paid';
        } else {
          bill.paymentStatus = 'Partially Paid';
        }

        bill.paymentsReceived.push({
          paymentId: paymentLog._id,
          amountApplied: alloc.amountApplied
        });

        await bill.save();
        totalAllocated += alloc.amountApplied;
      }
    }
  }

  const unallocated = paymentLog.credit - totalAllocated;
  paymentLog.unallocatedAmount = unallocated;

  if (unallocated > 0) {
    const targetCustomer = await Customer.findById(paymentLog.customer);
    if (targetCustomer) {
      targetCustomer.availableAdvance += unallocated;
      await targetCustomer.save();
    }
  }

  return paymentLog;
};

export const addPendingPayment = catchAsync(async (req, res, next) => {
  const { customer, paymentDate, amount, bankName, utrReference, remarks, billId, isUsingAdvance } = req.body;

  const targetCustomer = await Customer.findById(customer);
  if (!targetCustomer || targetCustomer.manager.toString() !== req.user.id) {
    return next(new AppError('Customer not found or not assigned to you', 404));
  }
  const bill = await Ledger.findById(billId);
  if (!bill) {
    return next(new AppError('Bill not found', 404));
  }

  if (isUsingAdvance && targetCustomer.availableAdvance < amount) {
    return next(new AppError('Customer does not have enough advance balance for this request.', 400));
  }

  let preparedAllocations = [];

  if (billId) {
    const targetBill = await Ledger.findById(billId);
    if (targetBill && targetBill.debit > 0) {
      const amountToApply = Math.min(amount, targetBill.balanceDue);

      preparedAllocations.push({
        billId: targetBill._id,
        amountApplied: amountToApply
      });
    }
  }

  const log = await Ledger.create({
    customer,
    date: paymentDate,
    description: isUsingAdvance ? `Pending Request: Use Advance` : `${bankName} - ${utrReference}`,
    credit: amount,
    bankInfo: isUsingAdvance ? { bankName: 'Advance', utrReference: 'N/A' } : { bankName, utrReference },
    remarks,
    status: 'pending',
    addedBy: req.user.id,
    allocations: preparedAllocations,
    isUsingAdvance: isUsingAdvance || false
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

export const editLedgerEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { debit, credit, date, description, remarks, bankInfo } = req.body;

  const log = await Ledger.findById(id);
  if (!log) return next(new AppError('Log not found', 404));

  if (req.user.role !== 'admin') {
    if (log.status !== 'pending') {
      return next(new AppError('You can only edit pending entries. Once approved, the entry is locked.', 403));
    }
    if (log.addedBy?.toString() !== req.user.id) {
      return next(new AppError('You can only edit your own entries.', 403));
    }

    Object.assign(log, req.body);
    await log.save();

    return res.status(200).json({ status: 'success', data: { log } });
  }

  if (req.user.role === 'admin') {

    if (date) log.date = date;
    if (description) log.description = description;
    if (remarks) log.remarks = remarks;
    if (bankInfo) log.bankInfo = { ...log.bankInfo, ...bankInfo };

    if (debit !== undefined && debit !== log.debit) {
      if (log.paymentStatus !== 'Unpaid' || log.amountPaid > 0) {
        return next(new AppError('You cannot change the amount of a bill that has payments applied to it.', 400));
      }
      log.debit = debit;
      log.balanceDue = debit;
    }

    if (credit !== undefined && credit !== log.credit) {
      if (log.status === 'approved') {
        return next(new AppError('Industry Standard: To change the amount of a processed payment, please delete the entry and re-enter it. This ensures advance balances calculate correctly.', 400));
      }
      log.credit = credit;
    }

    await log.save();
    return res.status(200).json({ status: 'success', data: { log } });
  }
});

export const deleteLedgerEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const log = await Ledger.findById(id);
  if (!log) return next(new AppError('Log not found', 404));

  if (req.user.role !== 'admin') {
    if (log.status !== 'pending' || log.addedBy?.toString() !== req.user.id) {
      return next(new AppError('You can only delete your own pending requests.', 403));
    }
    await Ledger.findByIdAndDelete(id);
    return res.status(200).json({ status: 'success', message: 'Entry deleted successfully' });
  }

  if (req.user.role === 'admin') {
    if (log.status === 'approved') {

      if (log.credit > 0) {
        if (log.allocations && log.allocations.length > 0) {
          for (const alloc of log.allocations) {
            const bill = await Ledger.findById(alloc.billId);
            if (bill) {
              bill.amountPaid -= alloc.amountApplied;
              bill.balanceDue += alloc.amountApplied;

              if (bill.balanceDue === bill.debit) {
                bill.paymentStatus = 'Unpaid';
              } else {
                bill.paymentStatus = 'Partially Paid';
              }

              bill.paymentsReceived = bill.paymentsReceived.filter(
                (p) => p.paymentId?.toString() !== log._id.toString()
              );

              await bill.save();
            }
          }
        }

        if (log.unallocatedAmount > 0) {
          const targetCustomer = await Customer.findById(log.customer);
          if (targetCustomer) {
            targetCustomer.availableAdvance -= log.unallocatedAmount;
            if (targetCustomer.availableAdvance < 0) targetCustomer.availableAdvance = 0;
            await targetCustomer.save();
          }
        }
      }

      if (log.debit > 0) {
        if (log.paymentStatus !== 'Unpaid' || log.amountPaid > 0) {
          return next(new AppError('You cannot delete a bill that has payments attached.', 400));
        }
      }
    }

    await Ledger.findByIdAndDelete(id);
    return res.status(200).json({ status: 'success', message: 'Log deleted successfully' });
  }
});

export const reviewPendingLog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;

  const log = await Ledger.findById(id);
  if (!log) return next(new AppError('Log not found', 404));
  if (log.status !== 'pending') return next(new AppError('Log is not in pending state', 400));

  if (action === 'approve') {
    if (log.isUsingAdvance) {
      const targetCustomer = await Customer.findById(log.customer);
      if (!targetCustomer || targetCustomer.availableAdvance < log.credit) {
        return next(new AppError('Customer advance balance has dropped since the Agent requested this. Cannot approve.', 400));
      }

      targetCustomer.availableAdvance -= log.credit;
      await targetCustomer.save();

      log.description = `Paid via Customer Advance (Approved)`;
    }
    log.status = 'approved';
    await processPaymentAllocations(log);
  } else if (action === 'reject') {
    if (!rejectionReason) return next(new AppError('Rejection reason is required', 400));
    log.status = 'rejected';
    log.rejectedReason = rejectionReason;
  } else {
    return next(new AppError('Invalid action', 400));
  }

  await log.save();

  res.status(200).json({ status: 'success', data: { log } });
});

export const addDirectEntry = catchAsync(async (req, res, next) => {
  const { isUsingAdvance, billId, ...entryData } = req.body;

  if (isUsingAdvance && entryData.credit > 0) {
    const targetCustomer = await Customer.findById(entryData.customer);
    if (!targetCustomer || targetCustomer.availableAdvance < entryData.credit) {
      return next(new AppError('Customer does not have enough advance balance for this payment.', 400));
    }
    targetCustomer.availableAdvance -= entryData.credit;
    await targetCustomer.save();
    entryData.description = `Paid via Customer Advance - ${entryData.description || ''}`;
  }

  let preparedAllocations = [];

  if (billId && entryData.credit > 0) {
    const targetBill = await Ledger.findById(billId);
    if (targetBill && targetBill.debit > 0) {
      const amountToApply = Math.min(entryData.credit, targetBill.balanceDue);
      preparedAllocations.push({
        billId: targetBill._id,
        amountApplied: amountToApply
      });
    }
  }

  const newEntry = await Ledger.create({
    ...entryData,
    description: entryData.description || entryData.desc,
    status: 'approved',
    addedBy: req.user.id,
    allocations: preparedAllocations
  });

  if (newEntry.credit > 0) {
    await processPaymentAllocations(newEntry);
    await newEntry.save();
  }

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
//   });
// });

export const getCustomerDashboard = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  if (!customerId) return next(new AppError('Customer ID is required', 400));

  const customerDoc = await Customer.findById(customerId).select('availableAdvance');

  const ledgerData = await Ledger.find({
    customer: customerId,
    status: { $in: ['approved', 'pending'] }
  }).sort({ date: -1 });

  const agingReport = await Ledger.getAgingReport(customerId);

  res.status(200).json({
    status: 'success',
    data: {
      transactions: ledgerData,
      totals: {
        outstanding: agingReport.total,
        availableAdvance: customerDoc ? customerDoc.availableAdvance : 0
      },
      aging: agingReport
    }
  });
});
