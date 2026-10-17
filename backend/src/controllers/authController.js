import * as authService from '../services/authService.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateAdminSetupInput,
} from '../validators/authValidator.js';

export const register = async (req, res, next) => {
  try {
    const { isValid, errors, sanitized } = validateRegisterInput(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors.join(' '),
          details: errors,
        },
      });
    }

    const result = await authService.registerStudent(sanitized);

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { isValid, errors, sanitized } = validateLoginInput(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors.join(' '),
          details: errors,
        },
      });
    }

    const result = await authService.authenticateUser(sanitized);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const setupAdmin = async (req, res, next) => {
  try {
    const { isValid, errors, sanitized } = validateAdminSetupInput(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors.join(' '),
          details: errors,
        },
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await authService.setupInitialAdmin({
      ...sanitized,
      clientIp,
    });

    return res.status(201).json({
      success: true,
      message: 'Initial administrator created successfully.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: authService.formatSafeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin check endpoint used to verify admin-only authorization.
 */
export const checkAdmin = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Administrator authorization verified.',
      user: authService.formatSafeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};
