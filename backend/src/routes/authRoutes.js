import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public Authentication endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected Authentication endpoints
router.get('/me', requireAuth, authController.getMe);

// Admin-only verification endpoint
router.get('/admin-check', requireAuth, requireAdmin, authController.checkAdmin);

export default router;
