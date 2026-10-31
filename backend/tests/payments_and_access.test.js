import test from 'node:test';
import assert from 'node:assert/strict';
import { getPool } from '../src/config/db.js';
import app from '../src/app.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';

let server;
let baseUrl;
const pool = getPool();

let testStudentId;
let testStudentToken;
let testSubjectId;
let testPaidTestId;

test.before(async () => {
  // Start ephemeral HTTP server
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Seed test student
  const studentEmail = `pay_test_${Date.now()}@example.com`;
  const userRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Payment Test Student', $1, 'hashed_pw', 'student', true)
     RETURNING id;`,
    [studentEmail]
  );
  testStudentId = userRes.rows[0].id;
  testStudentToken = jwt.sign({ id: testStudentId, email: studentEmail, role: 'student' }, config.jwtSecret, { expiresIn: '1h' });

  // Fetch a subject
  const subjRes = await pool.query(`SELECT id FROM subjects ORDER BY display_order ASC LIMIT 1;`);
  testSubjectId = subjRes.rows[0].id;

  // Create a paid test in this subject
  const testRes = await pool.query(
    `INSERT INTO tests (subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, access_type, publication_status, is_published)
     VALUES ($1, 'Paid Test For Entitlement Check', $2, 'sectional', 99, 30, 4.0, 1.0, 'paid', 'published', true)
     RETURNING id;`,
    [testSubjectId, `paid-test-${Date.now()}`]
  );
  testPaidTestId = testRes.rows[0].id;

  // Insert question for this test
  const qRes = await pool.query(
    `INSERT INTO questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks)
     VALUES ($1, 'Test entitlement Q', 'A', 'B', 'C', 'D', 'A', 'Explanation', 4.0, 1.0)
     RETURNING id;`,
    [testSubjectId]
  );
  await pool.query(
    `INSERT INTO test_questions (test_id, question_id, display_order) VALUES ($1, $2, 1);`,
    [testPaidTestId, qRes.rows[0].id]
  );
});

test.after(async () => {
  // Cleanup test records
  if (testPaidTestId) {
    await pool.query(`DELETE FROM attempts WHERE test_id = $1;`, [testPaidTestId]);
    await pool.query(`DELETE FROM test_questions WHERE test_id = $1;`, [testPaidTestId]);
    await pool.query(`DELETE FROM tests WHERE id = $1;`, [testPaidTestId]);
  }
  if (testStudentId) {
    await pool.query(`DELETE FROM subject_entitlements WHERE user_id = $1;`, [testStudentId]);
    await pool.query(`DELETE FROM payment_orders WHERE user_id = $1;`, [testStudentId]);
    await pool.query(`DELETE FROM users WHERE id = $1;`, [testStudentId]);
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('TEST P1: GET /api/payments/packages returns subject packages with test counts and INR prices', async () => {
  const res = await fetch(`${baseUrl}/payments/packages`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 7);

  const first = json.data[0];
  assert.ok(first.subject_name);
  assert.ok(first.price_paise > 0);
  assert.strictEqual(first.price_inr, Math.round(first.price_paise / 100));
  assert.strictEqual(first.currency, 'INR');
});

test('TEST P2: GET /api/payments/packages/:subjectId returns subject details and is_purchased status', async () => {
  const res = await fetch(`${baseUrl}/payments/packages/${testSubjectId}`, {
    headers: { Authorization: `Bearer ${testStudentToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.subject_id, testSubjectId);
  assert.strictEqual(json.data.is_purchased, false);
});

test('TEST P3: Attempting paid test before purchase returns 403 with subject purchase details', async () => {
  const res = await fetch(`${baseUrl}/student/tests/${testPaidTestId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testStudentToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.error.code, 'PAID_TEST_RESTRICTED');
  assert.ok(json.error.details.subjectId);
  assert.ok(json.error.details.pricePaise > 0);
});

let createdOrderId;

test('TEST P4: POST /api/payments/create-order creates order for subject series', async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testStudentToken}`,
    },
    body: JSON.stringify({ subjectId: testSubjectId }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.orderId);
  assert.ok(json.data.amountPaise > 0);
  assert.strictEqual(json.data.currency, 'INR');
  assert.strictEqual(json.data.subjectId, testSubjectId);

  createdOrderId = json.data.orderId;
});

test('TEST P5: POST /api/payments/verify-payment fulfills order and grants subject entitlement', async () => {
  const res = await fetch(`${baseUrl}/payments/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testStudentToken}`,
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      razorpaySignature: 'test_signature_valid',
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.subjectId, testSubjectId);
  assert.ok(json.data.entitlementId);
});

test('TEST P6: Student can now start paid test in the unlocked subject', async () => {
  const res = await fetch(`${baseUrl}/student/tests/${testPaidTestId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testStudentToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.attemptId);
  assert.strictEqual(json.data.totalQuestions, 1);
});

test('TEST P7: GET /api/payments/my-purchases returns the unlocked subject package in student history', async () => {
  const res = await fetch(`${baseUrl}/payments/my-purchases`, {
    headers: { Authorization: `Bearer ${testStudentToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.length >= 1);
  assert.strictEqual(json.data[0].subject_id, testSubjectId);
  assert.strictEqual(json.data[0].order_status, 'paid');
});

test('TEST P8: Duplicate purchase attempt returns ALREADY_PURCHASED (400)', async () => {
  const res = await fetch(`${baseUrl}/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testStudentToken}`,
    },
    body: JSON.stringify({ subjectId: testSubjectId }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.code, 'ALREADY_PURCHASED');
});
