import Customer from '../customer/customer.model.js';
import Ledger from '../ledger/ledger.model.js';
import AppError from '../../utils/appError.js';
import catchAsync from '../../utils/catchAsync.js';
import { syncInvoicePaymentStatus } from '../../utils/invoicingClient.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const toWhole = (num) => Math.trunc(Number(num) || 0);

// ==========================================
// 🏦 EXPORT FINANCIAL DATA TO OTHER APPS
// ==========================================
export const getExternalCustomerFinancials = catchAsync(async (req, res, next) => {
  const { crmId } = req.params;

  const customer = await Customer.findOne({ crmId }).lean();

  if (!customer) {
    return res.status(404).json({
      status: 'fail',
      message: 'This CRM customer is not linked to Bahi Khata.'
    });
  }

  const agingReport = await Ledger.getAgingReport(customer._id);

  const totalOutstanding = agingReport ?
    (agingReport.days0To30 || 0) +
    (agingReport.days31To60 || 0) +
    (agingReport.days61To90 || 0) +
    (agingReport.above90 || 0) : 0;

  return res.status(200).json({
    status: 'success',
    data: {
      bahiKhataId: customer._id,
      crmId: customer.crmId,
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    }
  });
});

// ==========================================
// 🔍 EXPORT FINANCIAL DATA BY NAME (String Match)
// ==========================================
export const getExternalFinancialsByName = catchAsync(async (req, res, next) => {
  const { name } = req.query;

  if (!name) {
    return next(new AppError('Please provide a customer name to search (e.g., ?name=Acme).', 400));
  }

  const searchName = name.trim().toUpperCase();

  const customer = await Customer.findOne({ companyName: searchName }).lean();

  if (!customer) {
    return res.status(404).json({
      status: 'fail',
      matchFound: false,
      message: `No customer matching "${searchName}" was found in Bahi Khata.`
    });
  }

  const agingReport = await Ledger.getAgingReport(customer._id);

  const totalOutstanding = agingReport?.total || 0;

  return res.status(200).json({
    status: 'success',
    matchFound: true,
    data: {
      bahiKhataId: customer._id,
      crmId: customer.crmId || null, // Will be null if it hasn't been linked yet!
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    }
  });
});

// ==========================================
// 📊 EXPORT FINANCIAL DATA (PAGINATED)
// ==========================================
export const getAllCustomersFinancials = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const customers = await Customer.find()
    .select('companyName crmId availableAdvance')
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCustomers = await Customer.countDocuments();

  const financialPromises = customers.map(async (customer) => {
    const agingReport = await Ledger.getAgingReport(customer._id);

    const totalOutstanding = agingReport?.total || 0;

    return {
      bahiKhataId: customer._id,
      crmId: customer.crmId || null,
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    };
  });

  const pageData = await Promise.all(financialPromises);

  return res.status(200).json({
    status: 'success',
    pagination: {
      totalRecords: totalCustomers,
      currentPage: page,
      totalPages: Math.ceil(totalCustomers / limit),
      pageSize: limit
    },
    data: pageData
  });
});

// ==========================================
// 🔄 ONE-TIME HISTORICAL DATA BACKFILL
// ==========================================
export const syncHistoricalInvoices = catchAsync(async (req, res, next) => {
  const allBills = await Ledger.find({
    invoiceNo: {
      $regex: /^DL\/26-27\/07/
    },
    debit: { $gt: 0 }
  }).lean();

  res.status(202).json({
    status: 'success',
    message: `Background sync started for ${allBills.length} invoices! Please check the backend console for the final success/fail report.`,
  });

  (async () => {
    console.log(`🚀 Starting background sync for ${allBills.length} invoices...`);
    let successCount = 0;
    let failCount = 0;

    for (const bill of allBills) {
      const isSuccess = await syncInvoicePaymentStatus(
        bill.invoiceNo,
        bill.paymentStatus,
        bill.balanceDue,
        bill.amountPaid,
        bill._id
      );

      if (isSuccess) {
        successCount++;
      } else {
        failCount++;
      }

      await sleep(600);
    }

    console.log(`\n======================================`);
    console.log(`✅ HISTORICAL SYNC COMPLETE!`);
    console.log(`📊 Total Processed: ${allBills.length}`);
    console.log(`🟢 Success: ${successCount}`);
    console.log(`🔴 Failed: ${failCount}`);
    console.log(`======================================\n`);
  })();
});

// ==========================================
//  LEDGER RECONCILIATION CONTROLLER
// ==========================================
export const reconcileCustomerLedger = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  const customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found', 404));

  const allLogs = await Ledger.find({
    customer: customerId,
    status: 'approved'
  }).sort({ date: 1, createdAt: 1 });

  const bills = allLogs.filter(log => log.debit > 0);
  const payments = allLogs.filter(log => log.credit > 0 || log.advanceAmount > 0);

  const billMap = new Map();
  bills.forEach(bill => {
    bill.debit = toWhole(bill.debit);
    bill.amountPaid = 0;
    bill.balanceDue = bill.debit;
    bill.paymentStatus = 'Unpaid';
    bill.paymentsReceived = [];
    billMap.set(bill._id.toString(), bill);
  });

  payments.forEach(pay => {
    pay.credit = toWhole(pay.credit);
    pay.advanceAmount = toWhole(pay.advanceAmount);

    let totalAllocatedThisPayment = 0;
    const maxAvailableToApply = pay.isUsingAdvance ? pay.advanceAmount : pay.credit;

    if (pay.allocations && pay.allocations.length > 0) {
      const validAllocations = [];

      for (const alloc of pay.allocations) {
        const targetBill = billMap.get(alloc.billId?.toString());

        // 🚨 STRICT CHECK: Only proceed if the bill exists AND still has a balance due
        if (targetBill && targetBill.balanceDue > 0) {

          const remainingInPayment = maxAvailableToApply - totalAllocatedThisPayment;
          const requestedAllocation = toWhole(alloc.amountApplied);

          // 🚨 THE FIX: Never apply more than the payment has left, AND never apply more than the bill needs!
          let amountToApply = Math.min(requestedAllocation, targetBill.balanceDue, remainingInPayment);

          if (amountToApply > 0) {
            // Update Bill Math
            targetBill.amountPaid = toWhole(targetBill.amountPaid + amountToApply);
            targetBill.balanceDue = toWhole(targetBill.debit - targetBill.amountPaid);

            targetBill.paymentStatus = targetBill.balanceDue <= 0 ? 'Paid' : 'Partially Paid';

            targetBill.paymentsReceived.push({
              paymentId: pay._id,
              amountApplied: amountToApply,
              date: pay.date
            });

            // Keep a clean record of this valid allocation
            validAllocations.push({
              billId: targetBill._id,
              amountApplied: amountToApply
            });

            totalAllocatedThisPayment = toWhole(totalAllocatedThisPayment + amountToApply);
          }
        }
      }
      // Overwrite the corrupted allocations with only the strictly valid ones
      pay.allocations = validAllocations;
    }

    // Calculate unallocated leftovers (Advance generated)
    pay.unallocatedAmount = toWhole(maxAvailableToApply - totalAllocatedThisPayment);
  });

  // 6. RECALCULATE CUSTOMER'S ACTUAL ADVANCE BALANCE
  let trueAdvanceBalance = 0;

  payments.forEach(pay => {
    if (pay.isUsingAdvance) {
      // Deduct the requested advance
      trueAdvanceBalance = toWhole(trueAdvanceBalance - pay.advanceAmount);
      // Refund any portion of the advance they didn't actually allocate to a bill
      trueAdvanceBalance = toWhole(trueAdvanceBalance + pay.unallocatedAmount);
    } else {
      // Normal payments add their unallocated leftovers to the advance pool
      trueAdvanceBalance = toWhole(trueAdvanceBalance + pay.unallocatedAmount);
    }
  });

  // Safety floor
  customer.availableAdvance = trueAdvanceBalance < 0 ? 0 : trueAdvanceBalance;

  // 7. SAVE EVERYTHING BACK TO DATABASE
  // We use sequential saves to prevent MongoDB Versioning Conflicts (ParallelSaveError)
  for (const bill of bills) {
    await bill.save({ validateBeforeSave: false });
  }
  for (const pay of payments) {
    await pay.save({ validateBeforeSave: false });
  }
  await customer.save({ validateBeforeSave: false });

  // 8. GENERATE SUCCESS REPORT
  return res.status(200).json({
    status: 'success',
    message: `Ledger successfully reconciled and rounded for ${customer.companyName || 'Customer'}!`,
    report: {
      totalBillsProcessed: bills.length,
      totalPaymentsProcessed: payments.length,
      correctedAdvanceBalance: customer.availableAdvance
    }
  });
});

// ================================================
//  LEDGER RECONCILIATION CONTROLLER (CHECKING)
// ================================================
export const auditCustomerLedger = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;

  const customer = await Customer.findById(customerId).lean();
  if (!customer) return next(new AppError('Customer not found', 404));

  // 1. Fetch all approved logs, oldest to newest
  const allLogs = await Ledger.find({
    customer: customerId,
    status: 'approved'
  }).sort({ date: 1, createdAt: 1 }).lean();

  const bills = allLogs.filter(log => log.debit > 0);
  const payments = allLogs.filter(log => log.credit > 0 || log.advanceAmount > 0);

  // 2. CAPTURE THE CURRENT (BROKEN) STATE
  const currentState = {
    advanceBalance: customer.availableAdvance || 0,
    bills: new Map(bills.map(b => [b._id.toString(), { ...b }])),
    payments: new Map(payments.map(p => [p._id.toString(), { ...p }]))
  };

  // 3. SET UP THE EXPECTED (SIMULATED) STATE
  const simulatedBills = new Map();
  bills.forEach(bill => {
    simulatedBills.set(bill._id.toString(), {
      _id: bill._id,
      invoiceNo: bill.invoiceNo,
      debit: toWhole(bill.debit),
      amountPaid: 0,
      balanceDue: toWhole(bill.debit),
      paymentStatus: 'Unpaid'
    });
  });

  let simulatedAdvanceBalance = 0;

  // 4. REPLAY THE LEDGER WITH STRICT MATH
  payments.forEach(pay => {
    const maxAvailable = toWhole(pay.isUsingAdvance ? pay.advanceAmount : pay.credit);
    let totalAllocated = 0;

    if (pay.allocations && pay.allocations.length > 0) {
      for (const alloc of pay.allocations) {
        const targetBill = simulatedBills.get(alloc.billId?.toString());

        if (targetBill && targetBill.balanceDue > 0) {
          const remainingInPayment = maxAvailable - totalAllocated;
          const requestedAllocation = toWhole(alloc.amountApplied);

          // The strict constraint:
          const amountToApply = Math.min(requestedAllocation, targetBill.balanceDue, remainingInPayment);

          if (amountToApply > 0) {
            targetBill.amountPaid = toWhole(targetBill.amountPaid + amountToApply);
            targetBill.balanceDue = toWhole(targetBill.debit - targetBill.amountPaid);
            targetBill.paymentStatus = targetBill.balanceDue <= 0 ? 'Paid' : 'Partially Paid';

            totalAllocated = toWhole(totalAllocated + amountToApply);
          }
        }
      }
    }

    const unallocated = toWhole(maxAvailable - totalAllocated);

    if (pay.isUsingAdvance) {
      simulatedAdvanceBalance = toWhole(simulatedAdvanceBalance - toWhole(pay.advanceAmount));
      simulatedAdvanceBalance = toWhole(simulatedAdvanceBalance + unallocated);
    } else {
      simulatedAdvanceBalance = toWhole(simulatedAdvanceBalance + unallocated);
    }
  });

  simulatedAdvanceBalance = simulatedAdvanceBalance < 0 ? 0 : simulatedAdvanceBalance;

  // 5. GENERATE THE DISCREPANCY REPORT
  const discrepancies = {
    customerAdvance: null,
    corruptedBills: [],
    perfectBillsCount: 0
  };

  // Check Advance Balance
  if (toWhole(currentState.advanceBalance) !== simulatedAdvanceBalance) {
    discrepancies.customerAdvance = {
      issue: "Advance Balance Mismatch",
      currentDatabaseValue: currentState.advanceBalance,
      trueCalculatedValue: simulatedAdvanceBalance,
      difference: simulatedAdvanceBalance - currentState.advanceBalance
    };
  }

  // Check Every Bill
  simulatedBills.forEach((simBill, id) => {
    const currBill = currentState.bills.get(id);

    const isAmountPaidCorrupted = toWhole(currBill.amountPaid) !== simBill.amountPaid;
    const isBalanceDueCorrupted = toWhole(currBill.balanceDue) !== simBill.balanceDue;
    const isDecimalIssue = currBill.balanceDue !== toWhole(currBill.balanceDue) || currBill.amountPaid !== toWhole(currBill.amountPaid);

    if (isAmountPaidCorrupted || isBalanceDueCorrupted || isDecimalIssue) {
      discrepancies.corruptedBills.push({
        billId: id,
        invoiceNo: simBill.invoiceNo,
        issue: isDecimalIssue ? "Floating Point/Decimal Error" : "Ghost Payment / Over-allocation",
        currentDatabaseState: {
          debit: currBill.debit,
          amountPaid: currBill.amountPaid,
          balanceDue: currBill.balanceDue,
          status: currBill.paymentStatus
        },
        trueCalculatedState: {
          debit: simBill.debit,
          amountPaid: simBill.amountPaid,
          balanceDue: simBill.balanceDue,
          status: simBill.paymentStatus
        }
      });
    } else {
      discrepancies.perfectBillsCount++;
    }
  });

  // 6. RETURN THE AUDIT RESULTS (READ-ONLY)
  return res.status(200).json({
    status: 'success',
    message: discrepancies.corruptedBills.length > 0 || discrepancies.customerAdvance
      ? 'WARNING: Ledger discrepancies detected.'
      : 'SUCCESS: Ledger is perfectly mathematically sound.',
    auditReport: discrepancies
  });
});
