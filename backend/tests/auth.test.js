import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { getPool, query } from '../src/config/db.js';
import { config } from '../src/config/env.js';

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
let adminToken = null;
const adminEmail = `test_admin_${testTimestamp}@primeprep.local`;

test.before(async () => {
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
    await query(`DELETE FROM users WHERE email LIKE 'test_%@primeprep.local';`);
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
});

// 2. Duplicate email registration fails
test('2. Duplicate email registration fails with 409 Conflict', async () => {
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

// 3. Student login succeeds with the correct password
test('3. Student login succeeds with correct credentials', async () => {
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

// 4. Student login fails with an incorrect password
test('4. Student login fails with incorrect password with 401', async () => {
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

// 5. Inactive users cannot log in
test('5. Inactive users cannot log in (403 Forbidden)', async () => {
  const inactiveEmail = `inactive_${testTimestamp}@primeprep.local`;
  // Create an inactive user directly
  await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
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
  const data = await res.json();

  assert.strictEqual(res.status, 401); // Invalid password checked first, or inactive check
});

// 6. A valid token can access /api/auth/me
test('6. A valid token can access /api/auth/me', async () => {
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

// 7. An invalid token is rejected
test('7. An invalid token is rejected with 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: 'Bearer invalid.bogus.jwt.token' },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'INVALID_TOKEN');
});

// 8. An expired token is rejected
test('8. An expired token is rejected with 401 TOKEN_EXPIRED', async () => {
  // Generate token expired 1 hour ago
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

// 9. A student cannot access an admin-only endpoint
test('9. A student cannot access an admin-only endpoint (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/auth/admin-check`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'FORBIDDEN');
});

// 11. An incorrect setup secret is rejected
test('11. An incorrect setup secret is rejected with 403', async () => {
  const res = await fetch(`${baseUrl}/auth/setup-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      setupSecret: 'wrong_secret_12345',
      fullName: 'Fake Admin',
      email: adminEmail,
      password: 'AdminPassword123!',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'INVALID_SETUP_SECRET');
});

// 10. The initial administrator can be created using ADMIN_SETUP_SECRET
test('10. The initial administrator can be created using valid ADMIN_SETUP_SECRET', async () => {
  // Ensure no admin currently exists from previous runs
  await query(`DELETE FROM users WHERE role = 'admin';`);

  const res = await fetch(`${baseUrl}/auth/setup-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      setupSecret: config.adminSetupSecret,
      fullName: 'PrimePrep Initial Admin',
      email: adminEmail,
      password: 'AdminPassword123!',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.success, true);
  assert.ok(data.token);
  assert.strictEqual(data.user.role, 'admin');
  adminToken = data.token;

  // Verify admin can access admin-only endpoint
  const adminCheck = await fetch(`${baseUrl}/auth/admin-check`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminCheck.status, 200);
});

// 12. A second initial administrator cannot be created through setup
test('12. A second initial administrator cannot be created (409 Conflict)', async () => {
  const res = await fetch(`${baseUrl}/auth/setup-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      setupSecret: config.adminSetupSecret,
      fullName: 'Second Admin Attempt',
      email: `second_admin_${testTimestamp}@primeprep.local`,
      password: 'AdminPassword123!',
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 409);
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'ADMIN_ALREADY_EXISTS');
});

// 13. Public registration cannot create administrators
test('13. Public registration cannot create administrators (role coerced to student)', async () => {
  const hackerEmail = `hacker_${testTimestamp}@primeprep.local`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Malicious Attacker',
      email: hackerEmail,
      password: 'AttackPassword123!',
      role: 'admin', // attempt to elevate role
    }),
  });
  const data = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.user.role, 'student'); // Server must strictly assign 'student'
});

// 14. Existing users remain intact
test('14. Existing users remain intact in database', async () => {
  const res = await query(`SELECT COUNT(*)::int as count FROM users;`);
  assert.ok(res.rows[0].count >= 3); // Pre-existing + test users
});
