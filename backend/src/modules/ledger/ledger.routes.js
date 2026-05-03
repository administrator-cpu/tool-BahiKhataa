import express from 'express';
import { 
  addPendingPayment, 
  reviewPendingLog, 
  addDirectEntry, 
  getCustomerDashboard, 
  getPendingQueue
} from './ledger.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/pending', restrictTo('admin'), getPendingQueue);
router.post('/payment', restrictTo('employee', 'admin'), addPendingPayment);
router.patch('/review/:id', restrictTo('admin'), reviewPendingLog);
router.post('/entry', restrictTo('admin'), addDirectEntry);
router.get('/:customerId/dashboard', restrictTo('admin', 'employee'), getCustomerDashboard);

export default router;
