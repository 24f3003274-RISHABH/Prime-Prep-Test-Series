import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Mount health check at /api/health
router.use('/', healthRoutes);

// Future Phase Routes placeholders:
// router.use('/auth', authRoutes);
// router.use('/subjects', subjectRoutes);
// router.use('/test-categories', testCategoryRoutes);
// router.use('/test-series', testSeriesRoutes);
// router.use('/tests', testRoutes);
// router.use('/admin', adminRoutes);

export default router;
