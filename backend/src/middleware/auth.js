import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import * as userRepo from '../repositories/userRepository.js';

/**
 * Middleware: requireAuth
 * Verifies JWT signature and loads fresh user identity from PostgreSQL.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required. Format: Authorization: Bearer <token>',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Verify user exists in PostgreSQL and is active
    const user = await userRepo.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The account associated with this token no longer exists.',
        },
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive. Please contact an administrator.',
        },
      });
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired. Please log in again.',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or malformed authentication token.',
      },
    });
  }
};

/**
 * Middleware: requireAdmin
 * Verifies that the authenticated user holds the 'admin' database role.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Administrator privileges required.',
      },
    });
  }
  next();
};

/**
 * Middleware: optionalAuth
 * Optionally attaches verified user if valid Bearer token provided; proceeds without error if absent.
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await userRepo.findById(decoded.id);
    req.user = (user && user.is_active) ? user : null;
  } catch {
    req.user = null;
  }
  next();
};

