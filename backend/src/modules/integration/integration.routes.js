import express from 'express';
import { protectInternalApps } from '../../middlewares/internalAuth.js';
import {
  getExternalCustomerFinancials, getExternalFinancialsByName, getCustomerOutstandingByCrmId,
  getAllCustomersFinancials, syncHistoricalInvoices, reconcileCustomerLedger, auditCustomerLedger,
  syncInvoiceFromInvoicingApp, cancelInvoiceFromInvoicingApp
} from '../integration/integration.controller.js';

const router = express.Router()

router.use(protectInternalApps);

// Mounted on /api/integration
router.get('/customers/financials/all', getAllCustomersFinancials);
router.get('/customers/financials/search', getExternalFinancialsByName);
router.post('/invoices/sync', syncInvoiceFromInvoicingApp);
router.get('/ledger/audit/:customerId', auditCustomerLedger);
router.delete('/invoices/sync/:invoiceNo', cancelInvoiceFromInvoicingApp);
router.post('/ledger/fix/:customerId', reconcileCustomerLedger);
router.get('/customers/:crmId/financials', getExternalCustomerFinancials);
router.get('/customers/crm/:crmId/outstanding', getCustomerOutstandingByCrmId);
router.get('/invoices/backfill', syncHistoricalInvoices);

export default router;