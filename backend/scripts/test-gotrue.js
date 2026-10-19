import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const testId = '22222222-2222-2222-2222-222222222222';
    const email = 'gotrue_test@primeprep.local';

    // 1. Insert into auth.users with standard GoTrue instance_id
    await client.query(
      `INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        $2, 'fake_hash', NOW(),
        $3::jsonb, $4::jsonb, NOW(), NOW()
      )`,
      [
        testId,
        email,
        JSON.stringify({ provider: 'email', providers: ['email'] }),
        JSON.stringify({ full_name: 'GoTrue Test Student' }),
      ]
    );

    // 2. Insert into auth.identities (omitting generated column email)
    await client.query(
      `INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2::text,
        jsonb_build_object('sub', $2::text, 'email', $3::text),
        'email', NOW(), NOW(), NOW()
      )`,
      [testId, testId, email]
    );

    const u = await client.query('SELECT id, instance_id, email FROM auth.users WHERE id = $1', [testId]);
    const i = await client.query('SELECT id, user_id, provider, email FROM auth.identities WHERE user_id = $1', [testId]);
    const p = await client.query('SELECT id, full_name, role FROM public.profiles WHERE id = $1', [testId]);

    console.log('User created in auth.users:', u.rows);
    console.log('Identity created in auth.identities:', i.rows);
    console.log('Profile created in public.profiles (by trigger):', p.rows);

    await client.query('ROLLBACK');
    console.log('Test completed successfully and rolled back.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during test:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
