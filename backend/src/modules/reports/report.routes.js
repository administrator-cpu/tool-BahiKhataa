import express from 'express';
import { getCollectionsOverview } from './report.controller.js';
import { protectInternalApps } from '../../middlewares/internalAuth.js';

const router = express.Router()

router.use(protectInternalApps);

router.get('/', getCollectionsOverview);

export default router;