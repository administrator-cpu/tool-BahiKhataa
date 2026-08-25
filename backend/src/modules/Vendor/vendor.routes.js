import express from 'express';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import { createVendor, getAllVendors, editVendor, getVendorsDashboard } from './vendor.controller.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

// 🏢 Vendor Management
router.post('/', createVendor);
router.get('/', getAllVendors);

// 📊 Vendor AP Dashboard (Aggregated)
router.get('/dashboard', getVendorsDashboard);

// ✏️ Edit Vendor
router.patch('/:id', editVendor);

export default router;