import express from 'express';
import { getCollectionsOverview, getWeeklyCollectionsReport } from './report.controller.js';
import { protectInternalApps } from '../../middlewares/internalAuth.js';

const router = express.Router()

router.use(protectInternalApps);

router.get('/', getCollectionsOverview);
router.get('/weekly-collections', getWeeklyCollectionsReport);

export default router;