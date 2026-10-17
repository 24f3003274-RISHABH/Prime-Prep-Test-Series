import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Strictly guard all administrative endpoints
router.use(requireAuth);
router.use(requireAdmin);

// 1. Dashboard statistics
router.get('/stats', adminController.getStats);

// 2. Subject management
router.get('/subjects', adminController.getSubjects);
router.get('/subjects/:id', adminController.getSubject);
router.post('/subjects', adminController.createSubject);
router.patch('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// 3. Chapter management
router.get('/subjects/:subjectId/chapters', adminController.getChaptersBySubject);
router.get('/chapters/:id', adminController.getChapter);
router.post('/subjects/:subjectId/chapters', adminController.createChapter);
router.patch('/chapters/:id', adminController.updateChapter);
router.delete('/chapters/:id', adminController.deleteChapter);

// 4. Test-series & mock tests management
router.get('/chapters/:chapterId/tests', adminController.getTestsByChapter);
router.get('/tests/:id', adminController.getTest);
router.post('/chapters/:chapterId/tests', adminController.createTest);
router.patch('/tests/:id', adminController.updateTest);
router.delete('/tests/:id', adminController.deleteTest);

// 5. Chapter quotas & test series settings
router.get('/chapters/:chapterId/settings', adminController.getChapterSettings);
router.put('/chapters/:chapterId/settings', adminController.updateChapterSettings);

export default router;
