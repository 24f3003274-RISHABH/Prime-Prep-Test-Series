import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import * as questionController from '../controllers/questionController.js';
import { uploadExcel } from '../middleware/upload.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Strictly guard all administrative endpoints
router.use(requireAuth);
router.use(requireAdmin);

// 1. Dashboard statistics
router.get('/stats', adminController.getStats);

// 2. Global Test-series default settings (Part 4 & Part 5)
router.get('/test-series-settings', adminController.getGlobalTestSeriesSettings);
router.put('/test-series-settings', adminController.updateGlobalTestSeriesSettings);

// 3. Subject management
router.get('/subjects', adminController.getSubjects);
router.get('/subjects/:id', adminController.getSubject);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.patch('/subjects/:id', adminController.updateSubject);
router.patch('/subjects/:id/status', adminController.updateSubjectStatus);
router.delete('/subjects/:id', adminController.deleteSubject);

// 4. Chapter management
router.get('/subjects/:subjectId/chapters', adminController.getChaptersBySubject);
router.get('/chapters/:id', adminController.getChapter);
router.post('/subjects/:subjectId/chapters', adminController.createChapter);
router.put('/chapters/:id', adminController.updateChapter);
router.patch('/chapters/:id', adminController.updateChapter);
router.patch('/chapters/:id/status', adminController.updateChapterStatus);
router.delete('/chapters/:id', adminController.deleteChapter);

// 5. Test-series & mock tests management
router.get('/chapters/:chapterId/tests', adminController.getTestsByChapter);
router.get('/tests/:id', adminController.getTest);
router.post('/chapters/:chapterId/tests', adminController.createTest);
router.put('/tests/:id', adminController.updateTest);
router.patch('/tests/:id', adminController.updateTest);
router.patch('/tests/:id/status', adminController.updateTestStatus);
router.delete('/tests/:id', adminController.deleteTest);

// 6. Chapter quotas & test series settings
router.get('/chapters/:chapterId/settings', adminController.getChapterSettings);
router.put('/chapters/:chapterId/settings', adminController.updateChapterSettings);

// 7. Bulk Question Upload & Question Management (Phase 6)
router.post('/questions/import/preview', uploadExcel.single('file'), questionController.previewQuestionImport);
router.post('/questions/import/confirm', questionController.confirmQuestionImport);
router.get('/tests/:testId/questions', questionController.getTestQuestions);

export default router;
