import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

export async function seedAdminAccount(options = {}) {
  const email = (options.email || 'rishabhmyp@gmail.com').trim().toLowerCase();
  const password = options.password || 'Admin@8218';
  const fullName = options.fullName || 'Rishabh Keshari';

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Generate secure bcrypt hash (10 rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Check if user already exists in public.users
    const userRes = await client.query(
      `SELECT id, role FROM public.users WHERE LOWER(email) = $1 LIMIT 1;`,
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
      console.log(`Updated existing user ${userId} in public.users to admin.`);
    } else {
      const ins = await client.query(
        `INSERT INTO public.users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id;`,
        [fullName, email, passwordHash]
      );
      userId = ins.rows[0].id;
      console.log(`Created new admin user ${userId} in public.users.`);
    }

    // 3. Upsert into auth.users (Supabase Auth table)
    const authCheck = await client.query(
      `SELECT id FROM auth.users WHERE LOWER(email) = $1 LIMIT 1;`,
      [email]
    );

    if (authCheck.rows.length > 0) {
      await client.query(
        `UPDATE auth.users
         SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
             encrypted_password = $1,
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             raw_user_meta_data = $2::jsonb,
             updated_at = NOW()
         WHERE LOWER(email) = $3;`,
        [passwordHash, JSON.stringify({ full_name: fullName }), email]
      );
      console.log(`Updated auth.users credentials for ${email}.`);
    } else {
      await client.query(
        `INSERT INTO auth.users (
           id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at
         )
         VALUES (
           $1, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', $2, $3, NOW(),
           $4::jsonb, $5::jsonb, NOW(), NOW()
         );`,
        [
          userId,
          email,
          passwordHash,
          JSON.stringify({ provider: 'email', providers: ['email'] }),
          JSON.stringify({ full_name: fullName }),
        ]
      );
      console.log(`Created auth.users record for ${email}.`);
    }

    // 4. Ensure auth.identities has record for admin
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

    // 5. Upsert into public.profiles
    await client.query(
      `INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
       VALUES ($1, $2, 'admin', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           role = 'admin',
           updated_at = NOW();`,
      [userId, fullName]
    );
    console.log(`Synchronized public.profiles role to admin for ${userId}.`);

    // 5. Audit log
    await client.query(
      `INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'ADMIN_ACCOUNT_CONFIGURED', 'users', $1, $2::jsonb);`,
      [userId, JSON.stringify({ email, fullName, configuredAt: new Date().toISOString() })]
    );

    await client.query('COMMIT');
    console.log(`\n✅ Administrator account ${email} is ready with role 'admin'.`);
    return { userId, email };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed administrator account:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed-admin.js')) {
  seedAdminAccount()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
