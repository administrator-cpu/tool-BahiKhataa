import express from 'express';
import { protectInternalApps } from '../../middlewares/internalAuth.js';
import {
  getExternalCustomerFinancials, getExternalFinancialsByName,
  getAllCustomersFinancials, syncHistoricalInvoices
} from '../integration/integration.controller.js';

const router = express.Router()

router.use(protectInternalApps);

router.get('/customers/financials/all', getAllCustomersFinancials);
router.get('/customers/financials/search', getExternalFinancialsByName);
router.get('/customers/:crmId/financials', getExternalCustomerFinancials);
router.get('/invoices/backfill', syncHistoricalInvoices);

export default router;