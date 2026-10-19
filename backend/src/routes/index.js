import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import chapterRoutes from './chapterRoutes.js';
import testRoutes from './testRoutes.js';

const router = Router();

// Mount health check at /api/health
router.use('/', healthRoutes);

// Mount authentication routes at /api/auth
router.use('/auth', authRoutes);

// Mount academic hierarchy routes
router.use('/subjects', subjectRoutes);
router.use('/chapters', chapterRoutes);
router.use('/tests', testRoutes);

// Mount administrative routes at /api/admin
router.use('/admin', adminRoutes);

export default router;
