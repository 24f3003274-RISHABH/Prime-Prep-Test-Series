import { Router } from 'express';
import * as studentController from '../controllers/studentController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public / student catalogue
router.get('/subjects', optionalAuth, studentController.getPublishedSubjects);
router.get('/subjects/:subjectId/chapters', optionalAuth, studentController.getPublishedChapters);
router.get('/tests', optionalAuth, studentController.getPublishedTests);
router.get('/tests/:testId/instructions', optionalAuth, studentController.getTestInstructions);

// Authenticated student actions
router.post('/tests/:testId/start', requireAuth, studentController.startTest);
router.get('/attempts/:attemptId', requireAuth, studentController.getAttempt);
router.put('/attempts/:attemptId/responses/:questionId', requireAuth, studentController.saveResponse);
router.post('/attempts/:attemptId/submit', requireAuth, studentController.submitAttempt);
router.get('/attempts/:attemptId/result', requireAuth, studentController.getAttemptResult);
router.get('/attempts', requireAuth, studentController.getStudentAttempts);

export default router;
