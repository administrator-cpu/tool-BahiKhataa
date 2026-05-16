import mongoose from 'mongoose';
import Ledger from './ledger.model.js';
import Customer from '../customer/customer.model.js';
import { sendPaymentAdjustmentEmail } from '../../utils/emailService.js';
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
        bill.balanceDue = Math.round(bill.balanceDue * 100) / 100;

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

  if (paymentLog.isUsingAdvance) {
    const unallocated = paymentLog.advanceAmount - totalAllocated;
    paymentLog.unallocatedAmount = unallocated;

    if (unallocated > 0) {
      const targetCustomer = await Customer.findById(paymentLog.customer);
      if (targetCustomer) {
        targetCustomer.availableAdvance += unallocated;
        await targetCustomer.save();
      }
    }
  } else {
    const unallocated = paymentLog.credit - totalAllocated;
    paymentLog.unallocatedAmount = unallocated;

    if (unallocated > 0) {
      const targetCustomer = await Customer.findById(paymentLog.customer);
      if (targetCustomer) {
        targetCustomer.availableAdvance += unallocated;
        await targetCustomer.save();
      }
    }
  }

  return paymentLog;
};
/* Asynchronous Save Risk(For Future) */
/* MongoDB Transactions (session.startTransaction()). */
/* This ensures that if any save fails, the entire batch rolls back. */

export const addPendingPayment = catchAsync(async (req, res, next) => {
  const { customer, paymentDate, amount, bankName, utrReference, remarks, billId, isUsingAdvance, allocations } = req.body;

  if (!customer || !paymentDate || !amount || (!isUsingAdvance && !bankName)) {
    return next(new AppError('Please provide customer, paymentDate, amount, and bankName.', 400));
  }
  if (!billId && (!allocations || !allocations.length)) {
    return next(new AppError('Please provide a bill against which the payment is to be settled.', 400));
  }

  const targetCustomer = await Customer.findById(customer).select('availableAdvance manager');
  if (!targetCustomer || targetCustomer.manager.toString() !== req.user.id) {
    return next(new AppError('Customer not found or not assigned to you', 404));
  }

  if (isUsingAdvance && targetCustomer.availableAdvance < amount) {
    return next(new AppError('Customer does not have enough advance balance for this request.', 400));
  }

  const activeAllocations = allocations?.length > 0 ? allocations : [{ billId, amountApplied: amount }];
  const billIds = activeAllocations.map(a => a.billId);
  const targetBills = await Ledger.find({
    _id: { $in: billIds },
    debit: { $gt: 0 },
    balanceDue: { $gt: 0 }
  });
  const billMap = new Map(targetBills.map(b => [b._id.toString(), b]));

  let preparedAllocations = [];
  let totalAllocatedRequested = 0;

  for (const item of activeAllocations) {
    const targetBill = billMap.get(item.billId.toString());

    if (targetBill) {
      const amountToApply = Math.min(item.amountApplied, targetBill.balanceDue);

      preparedAllocations.push({
        billId: targetBill._id,
        amountApplied: amountToApply
      });

      totalAllocatedRequested += amountToApply;
    }
  }
  if (totalAllocatedRequested > amount) {
    return next(new AppError('The total amount allocated to bills cannot exceed the actual payment amount.', 400));
  }

  // const targetBill = await Ledger.findById(billId);
  // if (targetBill && targetBill.debit > 0) {
  //   const amountToApply = Math.min(amount, targetBill.balanceDue);

  //   preparedAllocations.push({
  //     billId: targetBill._id,
  //     amountApplied: amountToApply
  //   });
  // }


  const log = await Ledger.create({
    customer,
    date: paymentDate,
    description: isUsingAdvance ? `Pending Request: Use Advance` : `${bankName} - ${utrReference}`,
    credit: isUsingAdvance ? 0 : amount,
    advanceAmount: isUsingAdvance ? amount : 0,
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
    // addedBy: manager,
    status: 'pending'
  }).populate({
    path: 'customer',
    select: 'companyName'
  });

  res.status(200).json({ status: 'success', data: { logs } });
});

export const editLedgerEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { debit, credit, date, description, remarks, bankInfo, invoiceNo } = req.body;

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
    if (invoiceNo !== undefined) log.invoiceNo = invoiceNo;

    const incomingDebit = Number(debit) || 0;
    const existingDebit = log.debit || 0;

    const incomingCredit = Number(credit) || 0;
    const existingCredit = log.credit || 0;
    if (incomingDebit !== existingDebit) {
      if (log.paymentStatus !== 'Unpaid' || log.amountPaid > 0) {
        return next(new AppError('You cannot change the amount of a bill that has payments applied to it.', 400));
      }
      log.debit = incomingDebit;
      log.balanceDue = incomingDebit;
    }

    if (incomingCredit !== existingCredit) {
      if (log.status === 'approved') {
        return next(new AppError('Industry Standard: To change the amount of a processed payment, please delete the entry and re-enter it. This ensures advance balances calculate correctly.', 400));
      }
      log.credit = incomingCredit;
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

      if (log.credit > 0 && log.unallocatedAmount > 0) {
        const targetCustomer = await Customer.findById(log.customer);
        if (targetCustomer && targetCustomer.availableAdvance < log.unallocatedAmount) {
           return next(new AppError('Cannot delete this payment. The customer has already used the advance generated from it. Please delete the advance application first.', 400));
        }
      }

      if (log.credit > 0 || log.advanceAmount > 0) {
        if (log.allocations && log.allocations.length > 0) {
          for (const alloc of log.allocations) {
            const bill = await Ledger.findById(alloc.billId);
            if (bill) {
              bill.amountPaid -= alloc.amountApplied;
              bill.balanceDue += alloc.amountApplied;
              bill.balanceDue = Math.round(bill.balanceDue * 100) / 100;

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

        if (log.credit > 0 && log.unallocatedAmount > 0) {
          const targetCustomer = await Customer.findById(log.customer);
          if (targetCustomer) {
            targetCustomer.availableAdvance -= log.unallocatedAmount;
            if (targetCustomer.availableAdvance < 0) targetCustomer.availableAdvance = 0;
            await targetCustomer.save();
          }
        } else if (log.advanceAmount > 0) {
          const netAdvancedDeducted = log.advanceAmount - log.unallocatedAmount;
          const targetCustomer = await Customer.findById(log.customer);
          if (targetCustomer) {
            targetCustomer.availableAdvance += netAdvancedDeducted;
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
      if (!targetCustomer || targetCustomer.availableAdvance < log.advanceAmount) {
        return next(new AppError('Customer advance balance has dropped since the Agent requested this. Cannot approve.', 400));
      }

      targetCustomer.availableAdvance -= log.advanceAmount;
      await targetCustomer.save();

      log.description = `Paid via Customer Advance (Approved)`;
    }
    log.status = 'approved';
    await processPaymentAllocations(log);
    await log.save();
    sendPaymentAdjustmentEmail(log);
  } else if (action === 'reject') {
    if (!rejectionReason) return next(new AppError('Rejection reason is required', 400));
    log.status = 'rejected';
    log.rejectedReason = rejectionReason;
    log.rejectedBy = req.user.id;
  } else {
    return next(new AppError('Invalid action', 400));
  }

  await log.save();

  res.status(200).json({ status: 'success', data: { log } });
});

export const addDirectEntry = catchAsync(async (req, res, next) => {
  const { isUsingAdvance, billId, allocations, ...entryData } = req.body;

  let amount = Number(entryData.credit) || 0;
  const incomingDebit = Number(entryData.debit) || 0;

  if (!entryData.customer || !entryData.date) {
    return next(new AppError('Customer and date are required.', 400));
  }

  if (incomingDebit > 0 && amount > 0) {
    return next(new AppError('You can only send a debit OR a credit amount at a time, not both.', 400));
  }

  if (incomingDebit > 0) {
    if (!entryData.invoiceNo || (!entryData.description && !entryData.desc)) {
      return next(new AppError('Invoice number and description are required for debit entries.', 400));
    }
  } else if (amount > 0) {
    if (!isUsingAdvance && (!entryData.bankInfo || !entryData.bankInfo.bankName)) {
      return next(new AppError('Bank name is required for credit entries.', 400));
    }
  } else {
    return next(new AppError('Please provide either a debit or credit amount.', 400));
  }

  if (isUsingAdvance && amount > 0) {
    const targetCustomer = await Customer.findById(entryData.customer);
    if (!targetCustomer || targetCustomer.availableAdvance < amount) {
      return next(new AppError('Customer does not have enough advance balance for this payment.', 400));
    }
    targetCustomer.availableAdvance -= amount;
    await targetCustomer.save();

    entryData.description = `Paid via Customer Advance - ${entryData.description || entryData.desc || ''}`;
    entryData.advanceAmount = amount;
    entryData.credit = 0;
  }

  let preparedAllocations = [];
  let totalAllocatedRequested = 0;

  if (amount > 0) {
    const activeAllocations = allocations?.length > 0 ? allocations : (billId ? [{ billId, amountApplied: amount }] : []);

    if (activeAllocations.length > 0) {
      const billIds = activeAllocations.map(a => a.billId);
      const targetBills = await Ledger.find({
        _id: { $in: billIds },
        debit: { $gt: 0 },
        balanceDue: { $gt: 0 }
      });

      const billMap = new Map(targetBills.map(b => [b._id.toString(), b]));

      for (const item of activeAllocations) {
        const targetBill = billMap.get(item.billId.toString());

        if (targetBill) {
          const amountToApply = Math.min(item.amountApplied, targetBill.balanceDue);

          preparedAllocations.push({
            billId: targetBill._id,
            amountApplied: amountToApply
          });

          totalAllocatedRequested += amountToApply;
        }
      }

      if (totalAllocatedRequested > amount) {
        return next(new AppError('The total amount allocated to bills cannot exceed the actual payment amount.', 400));
      }
    }
  }

  const newEntry = await Ledger.create({
    ...entryData,
    description: entryData.description || entryData.desc,
    status: 'approved',
    addedBy: req.user.id,
    allocations: preparedAllocations,
    isUsingAdvance: isUsingAdvance || false
  });

  if (newEntry.credit > 0 || newEntry.advanceAmount > 0) {
    await processPaymentAllocations(newEntry);
    await newEntry.save();
    sendPaymentAdjustmentEmail(newEntry);
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
    status: { $in: ['approved', 'pending'] },
    isUsingAdvance: { $ne: true }
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

export const getLedgerEntryDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const log = await Ledger.findById(id)
    .populate({
      path: 'customer',
      select: 'companyName email availableAdvance'
    })
    .populate({
      path: 'addedBy',
      select: 'name role'
    })
    .populate({
      path: 'allocations.billId',
      select: 'date invoiceNo description debit balanceDue status paymentStatus'
    })
    .populate({
      path: 'paymentsReceived.paymentId',
      select: 'date description credit advanceAmount bankInfo isUsingAdvance status'
    });

  if (!log) {
    return next(new AppError('No ledger entry found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      log
    }
  });
});
