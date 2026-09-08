import express from 'express';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import {
  addDirectEntry, deleteLedgerEntry, editLedgerEntry,
  getVendorDashboard, getPurchaseLedgerEntryDetails,
} from './purchaseLedger.controller.js';
import { exportTdsReport, downloadBulkTemplate, validateBulkUpload, commitBulkUpload } from "./purchaseLedgerExcel.controller.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

// ➕ Create a Bill (Credit) or Payment (Debit)
router.post('/entry', addDirectEntry);

// 📊 Export TDS Report
router.get('/export-tds', exportTdsReport);

// 📊 Download Bulk Upload Template
router.get('/bulk/template', downloadBulkTemplate);

// 📊 Validate Bulk Upload
router.post('/bulk/validate', validateBulkUpload);

// 📊 Download Bulk Upload Template
router.post('/bulk/commit', commitBulkUpload);

// 📊 Get Specific Vendor's AP Dashboard & Transactions
router.get('/vendor/:vendorId/dashboard', getVendorDashboard);

// GET /api/purchase-ledger/:id/details
router.get('/:id/details', getPurchaseLedgerEntryDetails);

// 🗑️ Delete/Rollback an AP Entry
router.delete('/:id', deleteLedgerEntry);

// ✏️ Edit AP Entry (Metadata only, or Unpaid Bills)
router.patch('/:id', editLedgerEntry);

export default router;