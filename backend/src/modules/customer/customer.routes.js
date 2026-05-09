import express from 'express';
import {
  createCustomer, getMyCustomers,
  getAllCustomers, getPortfolioDashboard,
  getCustomerById, getMainDashboard,
  editCustomer, assignManager,
  downloadLedgerExcel, downloadLedgerPDF
} from './customer.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/portfolio', restrictTo('employee', 'admin'), getPortfolioDashboard);

router.get('/me', restrictTo('employee', 'admin'), getMyCustomers);
router.post('/', restrictTo('admin'), createCustomer);
router.get('/', restrictTo('admin', 'employee'), getMainDashboard);
router.get('/:customerId/pdf', restrictTo('admin', 'employee'), downloadLedgerPDF);
router.get('/:customerId/excel', restrictTo('admin', 'employee'), downloadLedgerExcel);
router.patch('/:id', restrictTo('admin'), editCustomer);
router.patch('/:customerId/assign-manager', restrictTo('admin'), assignManager);
router.get('/:id', restrictTo('admin', 'employee'), getCustomerById);


export default router;