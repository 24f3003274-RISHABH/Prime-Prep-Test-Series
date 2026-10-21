import { Router } from 'express';
import * as publicController from '../controllers/publicController.js';

const router = Router();

// Publicly accessible catalogue routes (no authentication required)
router.get('/stats', publicController.getStats);
router.get('/subjects', publicController.getSubjects);
router.get('/subjects/:subjectId/chapters', publicController.getChapters);
router.get('/tests', publicController.getTests);
router.get('/tests/featured-free', publicController.getFeaturedFreeTest);
router.get('/tests/:testId', publicController.getTestDetails);

export default router;
