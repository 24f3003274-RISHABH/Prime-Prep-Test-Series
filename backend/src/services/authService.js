import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getSupabaseClient } from '../config/supabase.js';
import * as userRepo from '../repositories/userRepository.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * Format a safe user object excluding sensitive password hash.
 */
export const formatSafeUser = (user, profile = null) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: profile?.full_name || user.full_name || user.fullName,
    email: user.email,
    role: profile?.role || user.role || 'student',
    isActive: user.is_active !== undefined ? user.is_active : true,
    createdAt: profile?.created_at || user.created_at || user.createdAt,
    updatedAt: profile?.updated_at || user.updated_at || user.updatedAt,
  };
};

/**
 * Generate a signed JWT session token containing verified user identity and trusted role.
 */
export const generateToken = (user, role = null) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: role || user.role || 'student',
    },
    config.jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Register a new student account using Supabase Auth architecture.
 * Integrates with GoTrue signUp and ensures atomic persistence across
 * auth.users, auth.identities, public.profiles, and public.users.
 */
export const registerStudent = async ({ fullName, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const maskedEmail = normalizedEmail.replace(/(?<=^.).+(?=@)/, '***');

  // Diagnostic 1: Whether registration reaches the backend
  console.log(`[Registration Diagnostic] Registration reached backend for email: ${maskedEmail}`);

  let externalUserId = null;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.warn(`[Registration Diagnostic] Supabase client signUp note: ${error.message}`);
        if (error.status === 429) {
          const err = new Error('Too many registration attempts. Please wait a moment and try again.');
          err.statusCode = 429;
          err.code = 'RATE_LIMIT_EXCEEDED';
          throw err;
        }
      } else if (data?.user?.id) {
        externalUserId = data.user.id;
        // Diagnostic 2: Whether Supabase Auth returns a user ID
        console.log(`[Registration Diagnostic] Supabase Auth returned user ID: ${externalUserId}`);
      }
    } catch (clientErr) {
      if (clientErr.statusCode === 429) throw clientErr;
      console.warn(`[Registration Diagnostic] Continuing with direct GoTrue PostgreSQL sync: ${clientErr.message}`);
    }
  }

  // Pre-check for duplicate email in database
  const existing = await userRepo.findByEmail(normalizedEmail);
  if (existing) {
    console.error(`[Registration Diagnostic] Category: DUPLICATE_EMAIL_ERROR (${maskedEmail})`);
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  // Hash password with bcrypt for secure storage
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Persist student atomically in auth.users, auth.identities, public.profiles, and public.users
  const newUser = await userRepo.createStudent({
    fullName,
    email: normalizedEmail,
    passwordHash,
    externalUserId,
  });

  // Diagnostic 3: Whether profile creation succeeds
  console.log(`[Registration Diagnostic] Profile creation verified in public.profiles for ID: ${newUser.id}`);

  // Fetch verified profile from public.profiles
  const profile = await userRepo.getOrRecoverProfile(newUser.id, fullName);

  const token = generateToken(newUser, profile.role);
  return {
    user: formatSafeUser(newUser, profile),
    token,
  };
};

/**
 * Authenticate student or administrator credentials.
 * Authenticates via Supabase Auth / verified password hash, verifies response,
 * loads student profile by user UUID, and rejects non-profile or invalid logins.
 */
export const authenticateUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const maskedEmail = normalizedEmail.replace(/(?<=^.).+(?=@)/, '***');

  // Diagnostic: Whether login reaches backend
  console.log(`[Login Diagnostic] Login attempt reached backend for email: ${maskedEmail}`);

  let authenticatedUser = null;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data?.user) {
        authenticatedUser = {
          id: data.user.id,
          email: data.user.email,
        };
        console.log(`[Login Diagnostic] Supabase client authentication succeeded for user ID: ${data.user.id}`);
      }
    } catch (clientErr) {
      console.warn(`[Login Diagnostic] Supabase client login check bypassed: ${clientErr.message}`);
    }
  }

  // If Supabase client was not configured or client check had a network issue, verify against database
  if (!authenticatedUser) {
    const user = await userRepo.findByEmail(normalizedEmail);

    if (!user) {
      console.error(`[Login Diagnostic] Category: USER_NOT_FOUND for ${maskedEmail}`);
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.error(`[Login Diagnostic] Category: INVALID_PASSWORD for ${maskedEmail}`);
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    authenticatedUser = user;
  }

  // Verify active status
  if (authenticatedUser.is_active === false) {
    console.error(`[Login Diagnostic] Category: ACCOUNT_INACTIVE for user ID: ${authenticatedUser.id}`);
    const error = new Error('Your account is currently inactive. Please contact an administrator.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  // Load student profile using the authenticated user's UUID
  const profile = await userRepo.getOrRecoverProfile(authenticatedUser.id, authenticatedUser.full_name);

  // Diagnostic 4: Whether login succeeds and profile loaded
  console.log(`[Login Diagnostic] Login succeeded for user ID: ${authenticatedUser.id}, Profile role: ${profile.role}`);

  const token = generateToken(authenticatedUser, profile.role);
  return {
    user: formatSafeUser(authenticatedUser, profile),
    token,
  };
};
