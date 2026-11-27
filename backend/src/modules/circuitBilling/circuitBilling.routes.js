import express from 'express';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { getVendorCircuitBilling, getUnbilledCircuits } from './circuitBilling.controller.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/vendor/:vendorId', getVendorCircuitBilling);
router.get('/unbilled', getUnbilledCircuits);

export default router;
