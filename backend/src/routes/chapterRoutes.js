import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Chapter endpoints (Part 5)
router.get('/:id', optionalAuth, adminController.getChapter);
router.put('/:id', requireAuth, requireAdmin, adminController.updateChapter);
router.patch('/:id/status', requireAuth, requireAdmin, adminController.updateChapterStatus);
router.delete('/:id', requireAuth, requireAdmin, adminController.deleteChapter);

// Test-series sub-endpoints under a chapter (Part 5)
router.get('/:chapterId/tests', optionalAuth, adminController.getTestsByChapter);
router.post('/:chapterId/tests', requireAuth, requireAdmin, adminController.createTest);

// Chapter settings / quota endpoints
router.get('/:chapterId/settings', requireAuth, requireAdmin, adminController.getChapterSettings);
router.put('/:chapterId/settings', requireAuth, requireAdmin, adminController.updateChapterSettings);

export default router;
