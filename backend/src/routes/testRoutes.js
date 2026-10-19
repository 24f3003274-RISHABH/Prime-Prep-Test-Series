import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Test-series endpoints (Part 5)
router.get('/:id', optionalAuth, adminController.getTest);
router.put('/:id', requireAuth, requireAdmin, adminController.updateTest);
router.patch('/:id/status', requireAuth, requireAdmin, adminController.updateTestStatus);
router.delete('/:id', requireAuth, requireAdmin, adminController.deleteTest);

export default router;
