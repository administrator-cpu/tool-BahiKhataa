import mongoose from 'mongoose';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import Vendor from '../Vendor/vendor.model.js';
import PurchaseLedger from '../PurchaseLedger/purchaseLedger.model.js';
import { getCrmConnections } from './crmConnections.js';
import { buildVendorCircuitReport, buildUnbilledReport } from './circuitMatching.js';

// "Billed" = any vendor bill (credit > 0, not rejected) carrying that circuit ID
const BILL_FILTER = { credit: { $gt: 0 }, status: { $ne: 'rejected' } };

// GET /api/circuit-billing/vendor/:vendorId  → circuits this vendor has billed + its bills the CRM doesn't know
export const getVendorCircuitBilling = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;
  if (!mongoose.isValidObjectId(vendorId)) return next(new AppError('Invalid vendor ID.', 400));

  const vendor = await Vendor.findById(vendorId).select('companyName').lean();
  if (!vendor) return next(new AppError('Vendor not found.', 404));

  const [bills, { connections, fetchedAt }] = await Promise.all([
    PurchaseLedger.find({ vendor: vendorId, ...BILL_FILTER })
      .select('date invoiceNo logicalCircuitId credit status')
      .sort({ date: 1 })
      .lean(),
    getCrmConnections({ refresh: req.query.refresh === 'true' })
  ]);

  res.status(200).json({
    status: 'success',
    data: { vendor, crmFetchedAt: fetchedAt, ...buildVendorCircuitReport(bills, connections) }
  });
});

// GET /api/circuit-billing/unbilled  → activated CRM connections no vendor has billed
export const getUnbilledCircuits = catchAsync(async (req, res) => {
  const [bills, { connections, fetchedAt }] = await Promise.all([
    PurchaseLedger.find(BILL_FILTER).select('logicalCircuitId').lean(),
    getCrmConnections({ refresh: req.query.refresh === 'true' })
  ]);

  res.status(200).json({
    status: 'success',
    data: { crmFetchedAt: fetchedAt, ...buildUnbilledReport(bills, connections) }
  });
});
