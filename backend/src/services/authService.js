import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import * as userRepo from '../repositories/userRepository.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * Format a safe user object excluding sensitive password hash.
 */
export const formatSafeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

/**
 * Generate a signed JWT token containing user identity and role.
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Register a new student account.
 */
export const registerStudent = async ({ fullName, email, password }) => {
  // Check for existing user
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert student into PostgreSQL
  const newUser = await userRepo.createStudent({
    fullName,
    email,
    passwordHash,
  });

  const token = generateToken(newUser);
  return {
    user: formatSafeUser(newUser),
    token,
  };
};

/**
 * Authenticate student or administrator credentials.
 */
export const authenticateUser = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email);

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Verify password with bcrypt
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Verify active status
  if (!user.is_active) {
    const error = new Error('Your account is currently inactive. Please contact an administrator.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  const token = generateToken(user);
  return {
    user: formatSafeUser(user),
    token,
  };
};

/**
 * Bootstrap the initial administrator account.
 */
export const setupInitialAdmin = async ({ setupSecret, fullName, email, password, clientIp }) => {
  // Validate setup secret
  if (!setupSecret || setupSecret !== config.adminSetupSecret) {
    const error = new Error('Invalid administrator setup secret.');
    error.statusCode = 403;
    error.code = 'INVALID_SETUP_SECRET';
    throw error;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const adminUser = await userRepo.createInitialAdminTransactional({
    fullName,
    email,
    passwordHash,
    metadata: {
      clientIp: clientIp || 'unknown',
      source: 'api_setup_admin',
    },
  });

  const token = generateToken(adminUser);
  return {
    user: formatSafeUser(adminUser),
    token,
  };
};
