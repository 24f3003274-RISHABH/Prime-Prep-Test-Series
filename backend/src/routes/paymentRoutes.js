import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  listPackages,
  getPackage,
  createOrder,
  verifyPayment,
  handleWebhook,
  getMyPurchases,
} from '../controllers/paymentController.js';

const router = Router();

// Public / optional auth catalogue routes
router.get('/packages', optionalAuth, listPackages);
router.get('/packages/:subjectId', optionalAuth, getPackage);

// Authenticated student purchase endpoints
router.post('/create-order', requireAuth, createOrder);
router.post('/verify-payment', requireAuth, verifyPayment);
router.get('/my-purchases', requireAuth, getMyPurchases);

// Webhook for Razorpay
router.post('/webhook', handleWebhook);

export default router;
