import express from 'express';
import { protectInternalApps } from '../../middlewares/internalAuth.js';
import {
  getExternalCustomerFinancials, getExternalFinancialsByName,
  getAllCustomersFinancials, syncHistoricalInvoices, reconcileCustomerLedger, auditCustomerLedger
} from '../integration/integration.controller.js';

const router = express.Router()

router.use(protectInternalApps);

// Mounted on /api/integration
router.get('/customers/financials/all', getAllCustomersFinancials);
router.get('/customers/financials/search', getExternalFinancialsByName);
router.get('/ledger/audit/:customerId', auditCustomerLedger);
router.post('/ledger/fix/:customerId', reconcileCustomerLedger);
router.get('/customers/:crmId/financials', getExternalCustomerFinancials);
router.get('/invoices/backfill', syncHistoricalInvoices);

export default router;