import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { getPool, query } from '../src/config/db.js';
import { config } from '../src/config/env.js';

let server;
let baseUrl;

const timestamp = Date.now();
const studentEmail = `public_cat_student_${timestamp}@primeprep.local`;
const studentPassword = 'Password@1234';
let studentToken;
let studentUserId;

let freeTestId;
let paidTestId;
let unpublishedTestId;
let createdSubjectId;
let createdChapterId;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // 1. Create a published subject, chapter, and tests for testing
  const paperCode = `CQ${timestamp.toString().slice(-4)}`;
  const subjRes = await query(
    `INSERT INTO subjects (name, slug, code, paper_code, publication_status, is_active, display_order)
     VALUES ($1, $2, $3, $4, 'published', true, 99)
     RETURNING id;`,
    [`Catalogue Subject ${timestamp}`, `cat-subj-${timestamp}`, paperCode, paperCode]
  );
  createdSubjectId = subjRes.rows[0].id;

  const chapRes = await query(
    `INSERT INTO chapters (subject_id, name, title, slug, publication_status, is_active, display_order)
     VALUES ($1, 'Catalogue Chapter 1', 'Chapter 1: Theory', $2, 'published', true, 1)
     RETURNING id;`,
    [createdSubjectId, `cat-chap-${timestamp}`]
  );
  createdChapterId = chapRes.rows[0].id;

  // Insert a test question
  const qRes = await query(
    `INSERT INTO questions (subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, positive_marks, negative_marks)
     VALUES ($1, $2, 'What is the sovereign power?', 'A', 'B', 'C', 'D', 'A', 'Detailed explanation of sovereignty', 4.0, 1.0)
     RETURNING id;`,
    [createdSubjectId, createdChapterId]
  );
  const qId = qRes.rows[0].id;

  // Free published test
  const freeTestRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, access_type, publication_status, is_published, max_attempts)
     VALUES ($1, $2, 'Verified Free Sectional Test', $3, 'sectional', 1, 30, 4.0, 1.0, 'free', 'published', true, 3)
     RETURNING id;`,
    [createdChapterId, createdSubjectId, `free-test-${timestamp}`]
  );
  freeTestId = freeTestRes.rows[0].id;
  await query(`INSERT INTO test_questions (test_id, question_id, display_order) VALUES ($1, $2, 1);`, [freeTestId, qId]);

  // Paid published test (without entitlement for student)
  const paidTestRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, access_type, publication_status, is_published, max_attempts)
     VALUES ($1, $2, 'Verified Premium Paid Test', $3, 'full_length', 1, 90, 4.0, 1.0, 'paid', 'published', true, 1)
     RETURNING id;`,
    [createdChapterId, createdSubjectId, `paid-test-${timestamp}`]
  );
  paidTestId = paidTestRes.rows[0].id;
  await query(`INSERT INTO test_questions (test_id, question_id, display_order) VALUES ($1, $2, 1);`, [paidTestId, qId]);

  // Unpublished draft test
  const unpubRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, access_type, publication_status, is_published)
     VALUES ($1, $2, 'Hidden Draft Test', $3, 'sectional', 2, 45, 4.0, 1.0, 'free', 'draft', false)
     RETURNING id;`,
    [createdChapterId, createdSubjectId, `unpub-test-${timestamp}`]
  );
  unpublishedTestId = unpubRes.rows[0].id;

  // Create student user
  const bcrypt = (await import('bcrypt')).default;
  const pwHash = await bcrypt.hash(studentPassword, 10);
  const studentRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Catalogue Test Student', $1, $2, 'student', true)
     RETURNING id;`,
    [studentEmail, pwHash]
  );
  studentUserId = studentRes.rows[0].id;
  studentToken = jwt.sign({ id: studentUserId, email: studentEmail, role: 'student' }, config.jwtSecret, { expiresIn: '1d' });
});

test.after(async () => {
  if (server) server.close();
  try {
    if (freeTestId) {
      await query(`DELETE FROM attempts WHERE test_id = $1;`, [freeTestId]);
      await query(`DELETE FROM test_questions WHERE test_id = $1;`, [freeTestId]);
      await query(`DELETE FROM tests WHERE id = $1;`, [freeTestId]);
    }
    if (paidTestId) {
      await query(`DELETE FROM attempts WHERE test_id = $1;`, [paidTestId]);
      await query(`DELETE FROM test_questions WHERE test_id = $1;`, [paidTestId]);
      await query(`DELETE FROM tests WHERE id = $1;`, [paidTestId]);
    }
    if (unpublishedTestId) {
      await query(`DELETE FROM tests WHERE id = $1;`, [unpublishedTestId]);
    }
    if (createdChapterId) {
      await query(`DELETE FROM questions WHERE chapter_id = $1;`, [createdChapterId]);
      await query(`DELETE FROM chapters WHERE id = $1;`, [createdChapterId]);
    }
    if (createdSubjectId) {
      await query(`DELETE FROM subjects WHERE id = $1;`, [createdSubjectId]);
    }
    if (studentUserId) {
      await query(`DELETE FROM users WHERE id = $1;`, [studentUserId]);
    }
  } catch (err) {
    console.warn('Cleanup error:', err.message);
  }

  const pool = getPool();
  if (pool) await pool.end();
});

// TEST 1: Public catalogue statistics API (No authentication required)
test('TEST 1: GET /api/public/stats returns real PostgreSQL counts without auth', async () => {
  const res = await fetch(`${baseUrl}/public/stats`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.subjectsCount >= 1);
  assert.ok(json.data.chaptersCount >= 1);
  assert.ok(json.data.testsCount >= 1);
  assert.ok(json.data.questionsCount >= 1);
});

// TEST 2: Public subjects endpoint returns published subjects dynamically
test('TEST 2: GET /api/public/subjects returns published subjects with chapter & test counts', async () => {
  const res = await fetch(`${baseUrl}/public/subjects`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data));
  const createdSubj = json.data.find((s) => s.id === createdSubjectId);
  assert.ok(createdSubj);
  assert.strictEqual(createdSubj.chapter_count, 1);
  assert.strictEqual(createdSubj.test_count, 2); // 2 published tests
});

// TEST 3: Filter tests by Subject
test('TEST 3: GET /api/public/tests?subjectId=... filters tests by subject', async () => {
  const res = await fetch(`${baseUrl}/public/tests?subjectId=${createdSubjectId}`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.length, 2);
  assert.ok(json.data.every((t) => t.subject_id === createdSubjectId));
});

// TEST 4: Filter tests by Category (sectional vs full_length)
test('TEST 4: GET /api/public/tests?category=sectional filters tests by category', async () => {
  const res = await fetch(`${baseUrl}/public/tests?subjectId=${createdSubjectId}&category=sectional`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.length, 1);
  assert.strictEqual(json.data[0].id, freeTestId);
  assert.strictEqual(json.data[0].test_type, 'sectional');
});

// TEST 5: Public test details endpoint returns test specs without auth
test('TEST 5: GET /api/public/tests/:testId returns public test specifications', async () => {
  const res = await fetch(`${baseUrl}/public/tests/${freeTestId}`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.id, freeTestId);
  assert.strictEqual(json.data.title, 'Verified Free Sectional Test');
  assert.strictEqual(json.data.question_count, 1);
  assert.strictEqual(json.data.access_type, 'free');
  assert.strictEqual(json.data.duration_minutes, 30);
  // Security check: questions and answers are NOT leaked in public details
  assert.strictEqual(json.data.questions, undefined);
  assert.strictEqual(json.data.correct_option, undefined);
});

// TEST 6: Unauthenticated user cannot start test attempt (401 Unauthorized)
test('TEST 6: POST /api/student/tests/:testId/start rejects unauthenticated visitor', async () => {
  const res = await fetch(`${baseUrl}/student/tests/${freeTestId}/start`, {
    method: 'POST',
  });
  assert.strictEqual(res.status, 401);
});

// TEST 7: Authenticated student can start an authorized free test
test('TEST 7: POST /api/student/tests/:testId/start succeeds for authorized student on free test', async () => {
  const res = await fetch(`${baseUrl}/student/tests/${freeTestId}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.attemptId);
  assert.strictEqual(json.data.totalQuestions, 1);
  assert.ok(json.data.questions[0].question_text);
  // Answers are stripped during active exam
  assert.strictEqual(json.data.questions[0].correct_option, undefined);
});

// TEST 8: Student without entitlement is rejected from starting a paid test (403 Forbidden)
test('TEST 8: POST /api/student/tests/:testId/start rejects paid test without entitlement (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/student/tests/${paidTestId}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(json.success, false);
  assert.ok(json.message.includes('paid test'));
});

// TEST 9: Unpublished test is NOT exposed through public APIs (404 Not Found)
test('TEST 9: GET /api/public/tests/:testId returns 404 for unpublished draft test', async () => {
  const res = await fetch(`${baseUrl}/public/tests/${unpublishedTestId}`);
  const json = await res.json();

  assert.strictEqual(res.status, 404);
  assert.strictEqual(json.success, false);
});

// TEST 10: Registration of a new student works smoothly
test('TEST 10: POST /api/auth/register successfully registers a new student with role=student', async () => {
  const newEmail = `reg_verify_${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'New Verified Student',
      email: newEmail,
      password: 'StrongPassword@123',
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.user.role, 'student');
  assert.ok(json.data.token);

  // Cleanup
  await query(`DELETE FROM users WHERE email = $1;`, [newEmail]);
});

// TEST 11: Featured free test endpoint returns an available free test
test('TEST 11: GET /api/public/tests/featured-free returns an available free test', async () => {
  const res = await fetch(`${baseUrl}/public/tests/featured-free`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data);
  assert.strictEqual(json.data.access_type, 'free');
  assert.ok(json.data.question_count > 0);
});

// TEST 12: Search query filter in public tests
test('TEST 12: GET /api/public/tests?search=... searches by test title or subject', async () => {
  const res = await fetch(`${baseUrl}/public/tests?search=Verified+Free`);
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.some((t) => t.id === freeTestId));
});
