import express from 'express';
import rateLimit from 'express-rate-limit';
import { protectSyncClients } from '../../middlewares/internalAuth.js';
import { getSyncPage } from './sync.controller.js';
import AppError from '../../utils/AppError.js';

const router = express.Router();

// Own limit: sync clients page quickly, so the global /api limiter skips this router
const syncLimiter = rateLimit({
  max: 300,
  windowMs: 60 * 1000, // 1 minute
  handler: (req, res, next) => next(new AppError('Too many sync requests. Please slow down.', 429))
});

// Limit first, so wrong-key attempts are throttled too
router.use(syncLimiter);
router.use(protectSyncClients);

// Mounted on /api/sync — read-only
router.get('/:resource', getSyncPage);

export default router;
