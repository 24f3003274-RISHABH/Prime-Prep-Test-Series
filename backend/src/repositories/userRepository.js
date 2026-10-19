import bcrypt from 'bcrypt';
import { query, getPool } from '../config/db.js';

export const findByEmail = async (email) => {
  const normalized = email.trim().toLowerCase();
  const res = await query(
    `SELECT u.id, u.full_name, u.email, u.password_hash, 
            COALESCE(p.role, u.role, 'student') AS role,
            u.is_active, u.created_at, u.updated_at
     FROM public.users u
     LEFT JOIN public.profiles p ON u.id = p.id
     WHERE LOWER(u.email) = $1
     LIMIT 1;`,
    [normalized]
  );
  return res.rows[0] || null;
};

export const findById = async (id) => {
  const res = await query(
    `SELECT u.id, u.full_name, u.email,
            COALESCE(p.role, u.role, 'student') AS role,
            u.is_active, u.created_at, u.updated_at
     FROM public.users u
     LEFT JOIN public.profiles p ON u.id = p.id
     WHERE u.id = $1
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

/**
 * Loads a profile from public.profiles by UUID.
 * If missing, safely recovers/re-creates it from auth.users metadata.
 */
export const getOrRecoverProfile = async (userId, fallbackName = 'PrimePrep Student') => {
  const res = await query(
    `SELECT id, full_name, role, target_subject_code, phone, avatar_url, created_at, updated_at
     FROM public.profiles
     WHERE id = $1
     LIMIT 1;`,
    [userId]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // Safe recovery if profile record is missing:
  console.log(`[Diagnostic] Recovering missing profile for user ID: ${userId}`);
  const authUserRes = await query(
    `SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  const metaName = authUserRes.rows[0]?.raw_user_meta_data?.full_name || fallbackName;

  const recoveryRes = await query(
    `INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
     VALUES ($1, $2, 'student', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id, full_name, role, target_subject_code, phone, avatar_url, created_at, updated_at;`,
    [userId, metaName]
  );

  return recoveryRes.rows[0];
};

/**
 * Creates a student account across Supabase auth.users, auth.identities, public.profiles, and public.users.
 * Guarantees transactional consistency, populates standard GoTrue instance_id and identity records,
 * and ensures the user appears in Supabase Dashboard -> Authentication -> Users.
 */
export const createStudent = async ({ fullName, email, passwordHash, externalUserId = null }) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool is not initialized.');
  }

  const client = await pool.connect();
  const normalized = email.trim().toLowerCase();

  try {
    await client.query('BEGIN');

    // 1. Check if email already exists in public.users or auth.users
    const existingAuth = await client.query(
      `SELECT id FROM auth.users WHERE LOWER(email) = $1 LIMIT 1;`,
      [normalized]
    );

    const existingPublic = await client.query(
      `SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1;`,
      [normalized]
    );

    if (existingAuth.rows.length > 0 || existingPublic.rows.length > 0) {
      await client.query('ROLLBACK');
      const err = new Error('An account with this email already exists.');
      err.code = 'EMAIL_ALREADY_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    const userId = externalUserId || (await client.query('SELECT gen_random_uuid() as id')).rows[0].id;

    // 2. Insert into auth.users (Supabase Auth table with pre-confirmed email & standard GoTrue instance_id)
    await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at
       )
       VALUES (
         $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         $2, $3, NOW(),
         $4::jsonb, $5::jsonb, NOW(), NOW()
       )
       ON CONFLICT (id) DO NOTHING;`,
      [
        userId,
        normalized,
        passwordHash,
        JSON.stringify({ provider: 'email', providers: ['email'] }),
        JSON.stringify({ full_name: fullName }),
      ]
    );

    // 3. Insert into auth.identities (Required for GoTrue / Supabase Dashboard visibility)
    await client.query(
      `INSERT INTO auth.identities (
         id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1, $2::text,
         jsonb_build_object('sub', $2::text, 'email', $3::text),
         'email', NOW(), NOW(), NOW()
       )
       ON CONFLICT (provider_id, provider) DO NOTHING;`,
      [userId, userId, normalized]
    );

    // 4. Ensure public.profiles is populated with matching UUID, full_name, and role
    await client.query(
      `INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
       VALUES ($1, $2, 'student', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           role = 'student',
           updated_at = NOW();`,
      [userId, fullName]
    );

    // 5. Insert into public.users for backward compatibility with existing foreign keys
    const userRes = await client.query(
      `INSERT INTO public.users (id, full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'student', true)
       ON CONFLICT (id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()
       RETURNING id, full_name, email, role, is_active, created_at, updated_at;`,
      [userId, fullName, normalized, passwordHash]
    );

    await client.query('COMMIT');
    return userRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Idempotently provision the administrator account for rishabhmyp@gmail.com
 * Ensures presence across auth.users (with instance_id), auth.identities, public.profiles, and public.users.
 */
export const ensureAdminAccount = async () => {
  const email = 'rishabhmyp@gmail.com';
  const password = 'Admin@8218';
  const fullName = 'Rishabh Keshari';

  const pool = getPool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Get or create user id in public.users
    const userRes = await client.query(
      `SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1;`,
      [email]
    );

    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      await client.query(
        `UPDATE public.users
         SET full_name = $1, password_hash = $2, role = 'admin', is_active = true, updated_at = NOW()
         WHERE id = $3;`,
        [fullName, passwordHash, userId]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO public.users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id;`,
        [fullName, email, passwordHash]
      );
      userId = ins.rows[0].id;
    }

    // 2. Upsert into auth.users with standard GoTrue instance_id
    const authCheck = await client.query(
      `SELECT id FROM auth.users WHERE LOWER(email) = $1 LIMIT 1;`,
      [email]
    );

    if (authCheck.rows.length > 0) {
      await client.query(
        `UPDATE auth.users
         SET instance_id = '00000000-0000-0000-0000-000000000000',
             encrypted_password = $1,
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             raw_user_meta_data = $2::jsonb,
             updated_at = NOW()
         WHERE LOWER(email) = $3;`,
        [passwordHash, JSON.stringify({ full_name: fullName }), email]
      );
    } else {
      await client.query(
        `INSERT INTO auth.users (
           id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at
         )
         VALUES (
           $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           $2, $3, NOW(), $4::jsonb, $5::jsonb, NOW(), NOW()
         );`,
        [
          userId,
          email,
          passwordHash,
          JSON.stringify({ provider: 'email', providers: ['email'] }),
          JSON.stringify({ full_name: fullName }),
        ]
      );
    }

    // 3. Upsert into auth.identities
    await client.query(
      `INSERT INTO auth.identities (
         id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1, $2::text,
         jsonb_build_object('sub', $2::text, 'email', $3::text),
         'email', NOW(), NOW(), NOW()
       )
       ON CONFLICT (provider_id, provider) DO NOTHING;`,
      [userId, userId, email]
    );

    // 4. Upsert into public.profiles
    await client.query(
      `INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
       VALUES ($1, $2, 'admin', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           role = 'admin',
           updated_at = NOW();`,
      [userId, fullName]
    );

    await client.query('COMMIT');
    return { userId, email };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin Provisioning Warning]:', err.message);
    return null;
  } finally {
    client.release();
  }
};
