import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  getSubjectPackages,
  getSubjectPackageBySubjectId,
  createPaymentOrder,
  getPaymentOrderByOrderId,
  fulfillPaymentOrder,
  getStudentPurchases,
  updateSubjectPackage,
  getGlobalFreeTestsAdmin,
  setGlobalFreeTest,
  getPaymentAnalytics,
} from '../repositories/paymentRepository.js';
import { hasSubjectEntitlement } from '../services/accessService.js';

// Environment credentials with fallback for sandbox/test mode
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_cuet_primeprep').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || 'mock_secret_primeprep_cuet').trim();
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_primeprep').trim();

// Check if running in live/real Razorpay mode
const isLiveRazorpay = !RAZORPAY_KEY_ID.includes('mock') && !RAZORPAY_KEY_SECRET.includes('mock') && RAZORPAY_KEY_SECRET.length >= 10;

let razorpayClient = null;
if (isLiveRazorpay) {
  try {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  } catch (err) {
    console.warn('[Razorpay Init Warning]:', err.message);
  }
}

/**
 * GET /api/payments/packages
 * List all subject series packages with test counts and pricing.
 */
export async function listPackages(req, res, next) {
  try {
    const studentId = req.user?.id || null;
    const packages = await getSubjectPackages(studentId);
    res.json({
      success: true,
      data: packages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payments/packages/:subjectId
 * Get package details and purchase status for a specific subject.
 */
export async function getPackage(req, res, next) {
  try {
    const { subjectId } = req.params;
    const studentId = req.user?.id || null;
    const pkg = await getSubjectPackageBySubjectId(subjectId, studentId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Subject package not found.',
      });
    }
    res.json({
      success: true,
      data: pkg,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/create-order
 * Create a new Razorpay payment order for a subject test series.
 */
export async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'subjectId is required to initiate test series purchase.',
      });
    }

    // 1. Check if student already has active entitlement for this subject
    const alreadyPurchased = await hasSubjectEntitlement(userId, subjectId);
    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_PURCHASED',
        message: 'You already have active lifetime access to this subject test series.',
      });
    }

    // 2. Fetch subject package
    const pkg = await getSubjectPackageBySubjectId(subjectId, userId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Subject package not found for the requested subject.',
      });
    }

    const amountPaise = pkg.price_paise;
    const currency = 'INR';

    let razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If live Razorpay instance configured, create official order via Razorpay API
    if (razorpayClient) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amountPaise,
          currency,
          receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
          notes: {
            userId,
            subjectId,
            subjectName: pkg.subject_name,
          },
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.error('[Razorpay Order Creation Error]:', rzpErr);
        // Fall back to generated test order ID if sandbox API call fails
      }
    }

    // 3. Record order in database
    const dbOrder = await createPaymentOrder({
      orderId: razorpayOrderId,
      userId,
      subjectId,
      packageId: pkg.id,
      amountPaise,
      currency,
      metadata: {
        subjectName: pkg.subject_name,
        studentName: req.user.fullName || req.user.email,
        studentEmail: req.user.email,
      },
    });

    res.json({
      success: true,
      data: {
        orderId: dbOrder.order_id,
        amountPaise: dbOrder.amount_paise,
        amountInr: Math.round(dbOrder.amount_paise / 100),
        currency: dbOrder.currency,
        keyId: RAZORPAY_KEY_ID,
        subjectId: pkg.subject_id,
        subjectName: pkg.subject_name,
        packageName: `${pkg.subject_name} Full Test Series Package`,
        isTestMode: !isLiveRazorpay,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/verify-payment
 * Verify Razorpay payment signature and unlock subject test series.
 */
export async function verifyPayment(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId && !razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId or razorpayOrderId is required.',
      });
    }

    const targetOrderId = orderId || razorpayOrderId;
    const existingOrder = await getPaymentOrderByOrderId(targetOrderId);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Payment order record not found in system.',
      });
    }

    // Verify ownership
    if (existingOrder.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized payment verification attempt.',
      });
    }

    // Signature verification
    let isSignatureValid = false;
    if (isLiveRazorpay && razorpaySignature && razorpayPaymentId) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${targetOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      isSignatureValid = generatedSignature === razorpaySignature;
    } else {
      // In sandbox/test simulation mode: accept test signatures
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
    }

    // Fulfill order & grant atomic subject entitlement
    const fulfillment = await fulfillPaymentOrder({
      orderId: targetOrderId,
      razorpayPaymentId: razorpayPaymentId || `pay_test_${Date.now()}`,
      razorpaySignature: razorpaySignature || 'simulated_test_signature',
    });

    res.json({
      success: true,
      message: `Congratulations! ${existingOrder.subject_name} Test Series has been unlocked.`,
      data: {
        orderId: targetOrderId,
        subjectId: existingOrder.subject_id,
        subjectName: existingOrder.subject_name,
        entitlementId: fulfillment.entitlement.id,
        alreadyFulfilled: fulfillment.alreadyFulfilled,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler for automated payment fulfillment.
 */
export async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const bodyStr = JSON.stringify(req.body);

    if (RAZORPAY_WEBHOOK_SECRET && RAZORPAY_WEBHOOK_SECRET !== 'mock_webhook_secret_primeprep') {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(bodyStr)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        await fulfillPaymentOrder({
          orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature || 'webhook_captured',
        });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/payments/my-purchases
 * Return current student's purchase history and unlocked test series.
 */
export async function getMyPurchases(req, res, next) {
  try {
    const studentId = req.user.id;
    const purchases = await getStudentPurchases(studentId);
    res.json({
      success: true,
      data: purchases,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update subject package pricing.
 */
export async function adminUpdatePackage(req, res, next) {
  try {
    const { subjectId } = req.params;
    const { pricePaise, priceInr, features, isActive } = req.body;

    const targetPaise = pricePaise !== undefined ? pricePaise : (priceInr !== undefined ? priceInr * 100 : undefined);

    const updated = await updateSubjectPackage(subjectId, {
      pricePaise: targetPaise,
      features,
      isActive,
    });

    res.json({
      success: true,
      message: 'Subject package updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get global free tests configuration.
 */
export async function adminGetFreeTests(req, res, next) {
  try {
    const freeConfig = await getGlobalFreeTestsAdmin();
    res.json({
      success: true,
      data: freeConfig,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Set designated global free test (1 Sectional, 1 PYQ).
 */
export async function adminSetFreeTest(req, res, next) {
  try {
    const { testType, testId } = req.body;
    if (!['sectional', 'pyq'].includes(testType)) {
      return res.status(400).json({
        success: false,
        message: 'testType must be either "sectional" or "pyq".',
      });
    }

    const updated = await setGlobalFreeTest(testType, testId);
    res.json({
      success: true,
      message: `Global free test for ${testType} successfully designated.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Payment analytics and order log.
 */
export async function adminGetPaymentAnalytics(req, res, next) {
  try {
    const analytics = await getPaymentAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}
