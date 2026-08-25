import PurchaseLedger from './purchaseLedger.model.js';
import Vendor from '../vendor/vendor.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

// 🛠️ HELPER: Strict truncation
const toWhole = (num) => Math.trunc(Number(num) || 0);

// ==========================================
// ⚙️ ENGINE: PROCESS AP ALLOCATIONS
// ==========================================
const processPaymentAllocations = async (paymentLog) => {
  let totalAllocated = 0;

  if (paymentLog.allocations && paymentLog.allocations.length > 0) {
    for (const alloc of paymentLog.allocations) {
      const bill = await PurchaseLedger.findById(alloc.billId);

      if (bill && bill.credit > 0) {
        const safeAmountToApply = Math.min(toWhole(alloc.amountApplied), bill.balanceDue);

        if (safeAmountToApply > 0) {
          bill.amountPaid = toWhole(bill.amountPaid + safeAmountToApply);
          bill.balanceDue = toWhole(bill.credit - bill.amountPaid);

          if (bill.balanceDue <= 0) {
            bill.balanceDue = 0;
            bill.paymentStatus = 'Paid';
          } else {
            bill.paymentStatus = 'Partially Paid';
          }

          bill.paymentsMade.push({
            paymentId: paymentLog._id,
            amountApplied: safeAmountToApply
          });

          await bill.save();
          totalAllocated = toWhole(totalAllocated + safeAmountToApply);
        }
      }
    }
  }

  const baseAmount = paymentLog.isUsingAdvance ? paymentLog.advanceAmount : paymentLog.debit;
  const unallocated = toWhole(baseAmount - totalAllocated);
  paymentLog.unallocatedAmount = Math.max(0, unallocated);

  if (unallocated > 0 && !paymentLog.isUsingAdvance) {
    const targetVendor = await Vendor.findById(paymentLog.vendor);
    if (targetVendor) {
      targetVendor.availableAdvance = toWhole(targetVendor.availableAdvance + unallocated);
      await targetVendor.save();
    }
  }

  return paymentLog;
};

// ==========================================
// ➕ CREATE AP ENTRY (BILL OR PAYMENT)
// ==========================================
export const addDirectEntry = catchAsync(async (req, res, next) => {
  const { isUsingAdvance, billId, allocations, logicalCircuitId, productType, ...entryData } = req.body;

  const hasCredit = entryData.credit !== undefined && entryData.credit !== '' && Number(entryData.credit) > 0;
  const incomingCredit = hasCredit ? toWhole(entryData.credit) : 0; // Bill Amount
  const amount = entryData.debit ? toWhole(entryData.debit) : 0;    // Payment Amount

  if (!entryData.vendor || !entryData.date) {
    return next(new AppError('Vendor and date are required.', 400));
  }

  if (hasCredit && amount > 0) {
    return next(new AppError('You can only log a bill (Credit) OR a payment (Debit) at a time, not both.', 400));
  }

  if (hasCredit) {
    if (!entryData.invoiceNo || (!entryData.description && !entryData.desc)) {
      return next(new AppError('Supplier Bill number (invoiceNo) and description are required for credit entries.', 400));
    }
  } else if (amount > 0) {
    if (!isUsingAdvance && (!entryData.bankInfo || !entryData.bankInfo.bankName)) {
      return next(new AppError('Bank name is required for payments out (Debit entries).', 400));
    }
  } else {
    return next(new AppError('Please provide either a Credit (Supplier Bill) or a Debit (Payment out).', 400));
  }

  if (isUsingAdvance && amount > 0) {
    const targetVendor = await Vendor.findById(entryData.vendor);
    if (!targetVendor || targetVendor.availableAdvance < amount) {
      return next(new AppError('Vendor advance pool does not have enough balance to cover this allocation.', 400));
    }
    targetVendor.availableAdvance = toWhole(targetVendor.availableAdvance - amount);
    await targetVendor.save();

    entryData.description = `Paid via Vendor Advance Balance - ${entryData.description || entryData.desc || ''}`;
    entryData.advanceAmount = amount;
    entryData.debit = 0;
  } else {
    entryData.debit = amount;
  }

  if (hasCredit) entryData.credit = incomingCredit;

  let preparedAllocations = [];
  let totalAllocatedRequested = 0;

  if (amount > 0) {
    const activeAllocations = Array.isArray(allocations) && allocations.length > 0
      ? allocations
      : (billId ? [{ billId, amountApplied: amount }] : []);

    if (activeAllocations.length > 0) {
      const billIds = activeAllocations.map(a => a.billId);
      const targetBills = await PurchaseLedger.find({
        _id: { $in: billIds },
        credit: { $gt: 0 },
        balanceDue: { $gt: 0 }
      });

      const billMap = new Map(targetBills.map(b => [b._id.toString(), b]));

      for (const item of activeAllocations) {
        const targetBill = billMap.get(item.billId?.toString());

        if (targetBill) {
          const safeAmountApplied = toWhole(item.amountApplied);

          if (safeAmountApplied > 0) {
            if (safeAmountApplied > targetBill.balanceDue) {
              return next(new AppError(`You cannot allocate ₹${safeAmountApplied} to Bill ${targetBill.invoiceNo}. It only has a balance due of ₹${targetBill.balanceDue}.`, 400));
            }

            preparedAllocations.push({
              billId: targetBill._id,
              amountApplied: safeAmountApplied
            });
            totalAllocatedRequested = toWhole(totalAllocatedRequested + safeAmountApplied);
          }
        }
      }

      if (totalAllocatedRequested > amount) {
        return next(new AppError('The total amount allocated to bills cannot exceed the actual payment amount.', 400));
      }
    }
  }

  const newEntry = await PurchaseLedger.create({
    ...entryData,
    logicalCircuitId: hasCredit ? logicalCircuitId : null,
    productType: hasCredit ? productType : null,
    description: entryData.description || entryData.desc,
    status: 'approved',
    addedBy: req.user.id,
    allocations: preparedAllocations,
    isUsingAdvance: isUsingAdvance || false,
    balanceDue: hasCredit ? incomingCredit : 0,
    unallocatedAmount: 0
  });

  if (newEntry.debit > 0 || newEntry.advanceAmount > 0) {
    await processPaymentAllocations(newEntry);
    await newEntry.save();
  }

  res.status(201).json({ status: 'success', data: { log: newEntry } });
});

// ==========================================
// 🗑️ DELETE AP ENTRY (ROLLBACKS)
// ==========================================
export const deleteLedgerEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const log = await PurchaseLedger.findById(id);

  if (!log) return next(new AppError('Log not found', 404));

  // 1. Rollback a Payment (Debit)
  if (log.debit > 0 || log.advanceAmount > 0) {
    if (log.debit > 0 && log.unallocatedAmount > 0) {
      const targetVendor = await Vendor.findById(log.vendor);
      if (targetVendor && targetVendor.availableAdvance < log.unallocatedAmount) {
        return next(new AppError('Cannot delete this payment. The unallocated advance has already been consumed by another transaction.', 400));
      }
    }

    if (log.allocations && log.allocations.length > 0) {
      for (const alloc of log.allocations) {
        const bill = await PurchaseLedger.findById(alloc.billId);
        if (bill) {
          bill.amountPaid = toWhole(bill.amountPaid - alloc.amountApplied);
          bill.balanceDue = toWhole(bill.balanceDue + alloc.amountApplied);
          bill.paymentStatus = bill.balanceDue === bill.credit ? 'Unpaid' : 'Partially Paid';
          bill.paymentsMade = bill.paymentsMade.filter(p => p.paymentId?.toString() !== log._id.toString());
          await bill.save();
        }
      }
    }

    if (log.debit > 0 && log.unallocatedAmount > 0) {
      const targetVendor = await Vendor.findById(log.vendor);
      if (targetVendor) {
        targetVendor.availableAdvance = toWhole(targetVendor.availableAdvance - log.unallocatedAmount);
        if (targetVendor.availableAdvance < 0) targetVendor.availableAdvance = 0;
        await targetVendor.save();
      }
    } else if (log.advanceAmount > 0) {
      const netAdvancedDeducted = toWhole(log.advanceAmount - log.unallocatedAmount);
      const targetVendor = await Vendor.findById(log.vendor);
      if (targetVendor) {
        targetVendor.availableAdvance = toWhole(targetVendor.availableAdvance + netAdvancedDeducted);
        await targetVendor.save();
      }
    }
  }

  // 2. Reject Deletion of a Bill (Credit) if payments are attached
  if (log.credit > 0) {
    if (log.paymentStatus !== 'Unpaid' || log.amountPaid > 0) {
      return next(new AppError('You cannot delete a supplier bill that already has payments attached. Delete the payments first.', 400));
    }
  }

  await PurchaseLedger.findByIdAndDelete(id);
  return res.status(200).json({ status: 'success', message: 'Log deleted successfully' });
});

// ==========================================
// 📊 GET VENDOR LEDGER & DASHBOARD
// ==========================================
export const getVendorDashboard = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;
  const vendorDoc = await Vendor.findById(vendorId).lean();
  if (!vendorDoc) return next(new AppError('Vendor not found', 404));

  const ledgerData = await PurchaseLedger.find({
    vendor: vendorId,
    status: 'approved',
    isUsingAdvance: { $ne: true }
  }).sort({ date: -1 });

  const agingReport = await PurchaseLedger.getAgingReport(vendorId);

  res.status(200).json({
    status: 'success',
    data: {
      vendorProfile: vendorDoc,
      transactions: ledgerData,
      totals: {
        outstanding: toWhole(agingReport.total),
        availableAdvance: toWhole(vendorDoc.availableAdvance)
      },
      aging: agingReport
    }
  });
});

// ==========================================
// ✏️ EDIT AP ENTRY (STRICT IMMUTABILITY)
// ==========================================
export const editLedgerEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { debit, credit, date, description, remarks, bankInfo, invoiceNo, allocations, isUsingAdvance, vendor, logicalCircuitId, productType } = req.body;
  const log = await PurchaseLedger.findById(id);
  if (!log) return next(new AppError('Log not found', 404));

  // 1. Capture Current State
  const existingCredit = log.credit || 0;
  const existingDebit = log.debit || 0;

  const incomingCredit = (credit !== undefined && credit !== '') ? toWhole(credit) : existingCredit;
  const incomingDebit = (debit !== undefined && debit !== '') ? toWhole(debit) : existingDebit;

  // 2. Detect what is being changed
  const isChangingCredit = incomingCredit !== existingCredit;
  const isChangingDebit = incomingDebit !== existingDebit;
  const isChangingAllocations = allocations !== undefined && JSON.stringify(allocations) !== JSON.stringify(log.allocations || []);
  const isChangingAdvance = isUsingAdvance !== undefined && Boolean(isUsingAdvance) !== Boolean(log.isUsingAdvance);
  const isChangingVendor = vendor !== undefined && vendor !== log.vendor.toString();

  // 3. AP FLIP: A Bill is an entry with credit > 0.
  const isEditingUnpaidBill = isChangingCredit && (log.amountPaid === 0 || log.amountPaid === undefined) && existingDebit === 0;

  const isAttemptingFinancialEdit =
    isChangingDebit ||
    (!isEditingUnpaidBill && isChangingCredit) ||
    isChangingAllocations ||
    isChangingAdvance ||
    isChangingVendor;

  // 4. Strict Block for Financial Alterations
  if (isAttemptingFinancialEdit) {
    if (isChangingCredit && log.amountPaid > 0) {
      return next(new AppError('You cannot change the amount of a supplier bill that already has payments applied to it. Please delete the attached payments first.', 400));
    }

    return next(new AppError(
      'Immutable Record: Approved financial transactions cannot be altered. To change payment amounts or allocations, please delete this entry to safely roll back all balances, then create a new corrected entry.',
      400
    ));
  }

  // 5. Safe Metadata Updates
  if (date) log.date = date;
  if (description) log.description = description;
  if (remarks) log.remarks = remarks;
  if (bankInfo) log.bankInfo = { ...log.bankInfo, ...bankInfo };
  if (invoiceNo !== undefined) log.invoiceNo = invoiceNo;
  if (logicalCircuitId !== undefined) log.logicalCircuitId = logicalCircuitId;
  if (productType !== undefined) log.productType = productType;

  // 6. Safe Bill Amount Update
  if (isEditingUnpaidBill) {
    log.credit = incomingCredit;
    log.balanceDue = incomingCredit;
  }

  await log.save();
  return res.status(200).json({ status: 'success', data: { log } });
});

// ==========================================
// 🔍 GET AP ENTRY DETAILS (FOR EXPANDED ROW)
// ==========================================
export const getPurchaseLedgerEntryDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const log = await PurchaseLedger.findById(id)
    .populate({
      path: 'allocations.billId',
      select: 'invoiceNo date balanceDue credit'
    })
    .populate({
      path: 'paymentsMade.paymentId',
      select: 'date bankInfo debit advanceAmount isUsingAdvance'
    })
    .lean();

  if (!log) {
    return next(new AppError('Purchase ledger entry not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { log }
  });
});