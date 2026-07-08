import express from 'express';
import { protectInternalApps } from '../../middlewares/internalAuth.js';
import {
  getExternalCustomerFinancials, getExternalFinancialsByName
} from '../integration/integration.controller.js';

const router = express.Router()

router.use(protectInternalApps);

router.get('/customers/financials/search', getExternalFinancialsByName);
router.get('/customers/:crmId/financials', getExternalCustomerFinancials);

export default router;