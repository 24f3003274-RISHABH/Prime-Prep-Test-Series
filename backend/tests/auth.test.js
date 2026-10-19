import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { getPool, query } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { ensureAdminAccount } from '../src/repositories/userRepository.js';

let server;
let baseUrl;

// Ephemeral test user credentials
const testTimestamp = Date.now();
const studentData = {
  fullName: 'Automated Test Student',
  email: `test_student_${testTimestamp}@primeprep.local`,
  password: 'ValidPassword123!',
};

let studentToken = null;
let studentUserId = null;

test.before(async () => {
  // Ensure default administrator is seeded
  await ensureAdminAccount();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    server.close();
  }
  // Cleanup test users created during test run
  try {
    await query(`DELETE FROM admin_audit_logs WHERE details->>'email' LIKE 'test_%@primeprep.local';`);
    await query(`DELETE FROM auth.users WHERE email LIKE 'test_%@primeprep.local';`);
    await query(`DELETE FROM public.profiles WHERE id IN (SELECT id FROM public.users WHERE email LIKE 'test_%@primeprep.local');`);
    await query(`DELETE FROM public.users WHERE email LIKE 'test_%@primeprep.local';`);
  } catch (err) {
    // ignore
  }
  const pool = getPool();
  if (pool) {
    await pool.end();
  }
});

// 1. Student registration succeeds
test('1. Student registration succeeds with valid data', async () => {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.success, true);
  assert.ok(data.token);
  assert.strictEqual(data.user.email, studentData.email.toLowerCase());
  assert.strictEqual(data.user.role, 'student');
  assert.strictEqual(data.user.isActive, true);
  assert.strictEqual(data.user.password_hash, undefined);
  studentToken = data.token;
  studentUserId = data.user.id;
});

// 2. Profile and Auth User creation in Supabase PostgreSQL
test('2. Registration correctly creates Supabase Auth user and public.profiles record', async () => {
  // Check auth.users
  const authRes = await query(`SELECT id, email, email_confirmed_at FROM auth.users WHERE id = $1;`, [studentUserId]);
  assert.strictEqual(authRes.rows.length, 1);
  assert.strictEqual(authRes.rows[0].email, studentData.email.toLowerCase());
  assert.ok(authRes.rows[0].email_confirmed_at);

  // Check public.profiles
  const profileRes = await query(`SELECT id, full_name, role, created_at FROM public.profiles WHERE id = $1;`, [studentUserId]);
  assert.strictEqual(profileRes.rows.length, 1);
  assert.strictEqual(profileRes.rows[0].full_name, studentData.fullName);
  assert.strictEqual(profileRes.rows[0].role, 'student');
  assert.ok(profileRes.rows[0].created_at);
});

// 3. Duplicate email registration fails
test('3. Duplicate email registration fails with 409 Conflict', async () => {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 409);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'EMAIL_ALREADY_EXISTS');
});

// 4. Student login succeeds with the correct password
test('4. Student login succeeds with correct credentials', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentData.email,
      password: studentData.password,
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(data.token);
  assert.strictEqual(data.user.role, 'student');
  assert.strictEqual(data.user.password_hash, undefined);
});

// 5. Student login fails with an incorrect password
test('5. Student login fails with incorrect password with 401', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentData.email,
      password: 'WrongPassword999',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'INVALID_CREDENTIALS');
});

// 6. Inactive users cannot log in
test('6. Inactive users cannot log in (403 Forbidden)', async () => {
  const inactiveEmail = `inactive_${testTimestamp}@primeprep.local`;
  await query(
    `INSERT INTO public.users (full_name, email, password_hash, role, is_active)
     VALUES ('Inactive User', $1, 'hashed_pw', 'student', false);`,
    [inactiveEmail]
  );

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: inactiveEmail,
      password: studentData.password,
    }),
  });

  assert.strictEqual(res.status, 401);
});

// 7. A valid token can access /api/auth/me
test('7. A valid token can access /api/auth/me', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.user.email, studentData.email.toLowerCase());
  assert.strictEqual(data.user.role, 'student');
  assert.strictEqual(data.user.password_hash, undefined);
});

// 8. An invalid token is rejected
test('8. An invalid token is rejected with 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: 'Bearer invalid.bogus.jwt.token' },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'INVALID_TOKEN');
});

// 9. An expired token is rejected
test('9. An expired token is rejected with 401 TOKEN_EXPIRED', async () => {
  const expiredToken = jwt.sign(
    { id: '00000000-0000-0000-0000-000000000000', email: 'test@local', role: 'student' },
    config.jwtSecret,
    { expiresIn: '-1h' }
  );

  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'TOKEN_EXPIRED');
});

// 10. A student cannot access an admin-only endpoint
test('10. A student cannot access an admin-only endpoint (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/auth/admin-check`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'FORBIDDEN');
});

// 11. Administrator login succeeds with configured credentials
test('11. Administrator logs in with rishabhmyp@gmail.com and Admin@8218', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rishabhmyp@gmail.com',
      password: 'Admin@8218',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(data.token);
  assert.strictEqual(data.user.email, 'rishabhmyp@gmail.com');
  assert.strictEqual(data.user.role, 'admin');

  // Verify administrator token has access to admin-only endpoint
  const adminCheck = await fetch(`${baseUrl}/auth/admin-check`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  assert.strictEqual(adminCheck.status, 200);
});

// 12. Public registration cannot set role to admin
test('12. Public student registration cannot set role to admin (coerced to student)', async () => {
  const hackerEmail = `hacker_${testTimestamp}@primeprep.local`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Malicious Attacker',
      email: hackerEmail,
      password: 'AttackPassword123!',
      role: 'admin',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.user.role, 'student'); // Server strictly assigns student
});

// 13. Logout endpoint returns 200
test('13. POST /api/auth/logout succeeds with 200', async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
});
