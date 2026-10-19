import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Subject endpoints (Part 5)
router.get('/', optionalAuth, adminController.getSubjects);
router.get('/:id', optionalAuth, adminController.getSubject);
router.post('/', requireAuth, requireAdmin, adminController.createSubject);
router.put('/:id', requireAuth, requireAdmin, adminController.updateSubject);
router.patch('/:id/status', requireAuth, requireAdmin, adminController.updateSubjectStatus);
router.delete('/:id', requireAuth, requireAdmin, adminController.deleteSubject);

// Chapter sub-endpoints under a subject (Part 5)
router.get('/:subjectId/chapters', optionalAuth, adminController.getChaptersBySubject);
router.post('/:subjectId/chapters', requireAuth, requireAdmin, adminController.createChapter);

export default router;
