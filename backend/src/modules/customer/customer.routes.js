import express from 'express';
import {
  getCRMProfileForCreation, createCustomer, getMyCustomers,
  getAllCustomers, getPortfolioDashboard,
  getCustomerById, getMainDashboard,
  editCustomer, assignManager,
  searchCRMCustomers, previewCRMMatch, linkCustomerWithCRM, auditCustomerNames,
  downloadLedgerExcel, downloadLedgerPDF
} from './customer.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/portfolio', restrictTo('employee', 'admin'), getPortfolioDashboard);
router.get('/me', restrictTo('employee', 'admin'), getMyCustomers);
router.post('/', restrictTo('admin'), createCustomer);
// CRM Integration Routes
router.get('/crm-search', restrictTo('admin', 'employee'), searchCRMCustomers);
router.get('/crm-audit', restrictTo('admin'), auditCustomerNames);
router.get('/crm-profile/:crmId', restrictTo('admin', 'employee'), getCRMProfileForCreation);
router.get('/:id/crm-preview', restrictTo('admin'), previewCRMMatch);
router.patch('/:id/link-crm', restrictTo('admin'), linkCustomerWithCRM);
// End of CRM Integration Routes
router.get('/:customerId/pdf', restrictTo('admin', 'employee'), downloadLedgerPDF);
router.get('/:customerId/excel', restrictTo('admin', 'employee'), downloadLedgerExcel);
router.patch('/:id', restrictTo('admin'), editCustomer);
router.patch('/:customerId/assign-manager', restrictTo('admin'), assignManager);
router.get('/:id', restrictTo('admin', 'employee'), getCustomerById);


export default router;