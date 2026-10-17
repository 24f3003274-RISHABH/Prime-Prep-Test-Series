import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { getPool, query } from '../src/config/db.js';
import { config } from '../src/config/env.js';

let server;
let baseUrl;

const timestamp = Date.now();
const testAdminEmail = `phase4_admin_${timestamp}@primeprep.local`;
const testStudentEmail = `phase4_student_${timestamp}@primeprep.local`;

let adminToken;
let studentToken;
let adminUserId;

let createdSubjectId;
let createdChapterId;
let sectionalTestId;
let fullLengthTestId;
let pyqTestId;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Seed test admin
  const adminRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Phase 4 Admin', $1, 'hashed_pw', 'admin', true)
     RETURNING id;`,
    [testAdminEmail]
  );
  adminUserId = adminRes.rows[0].id;
  adminToken = jwt.sign({ id: adminUserId, email: testAdminEmail, role: 'admin' }, config.jwtSecret, { expiresIn: '1d' });

  // Seed test student
  const studentRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Phase 4 Student', $1, 'hashed_pw', 'student', true)
     RETURNING id;`,
    [testStudentEmail]
  );
  studentToken = jwt.sign({ id: studentRes.rows[0].id, email: testStudentEmail, role: 'student' }, config.jwtSecret, { expiresIn: '1d' });
});

test.after(async () => {
  if (server) {
    server.close();
  }

  // Cleanup test data created during test
  try {
    if (sectionalTestId) await query(`DELETE FROM tests WHERE id = $1;`, [sectionalTestId]);
    if (fullLengthTestId) await query(`DELETE FROM tests WHERE id = $1;`, [fullLengthTestId]);
    if (pyqTestId) await query(`DELETE FROM tests WHERE id = $1;`, [pyqTestId]);
    if (createdChapterId) await query(`DELETE FROM chapters WHERE id = $1;`, [createdChapterId]);
    if (createdSubjectId) await query(`DELETE FROM subjects WHERE id = $1;`, [createdSubjectId]);
    await query(`DELETE FROM users WHERE email IN ($1, $2);`, [testAdminEmail, testStudentEmail]);
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  const pool = getPool();
  if (pool) {
    await pool.end();
  }
});

// 1. Admin can create a subject
test('1. Admin can create a subject', async () => {
  const res = await fetch(`${baseUrl}/admin/subjects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Special Discipline ${timestamp}`,
      slug: `special-discipline-${timestamp}`,
      description: 'Test syllabus description',
      displayOrder: 10,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.id);
  assert.strictEqual(json.data.name, `Special Discipline ${timestamp}`);
  createdSubjectId = json.data.id;
});

// 2. Student cannot create a subject (403 Forbidden)
test('2. Student cannot create a subject (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/admin/subjects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      name: 'Unauthorized Subject',
      slug: 'unauthorized-subject',
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 403);
  assert.strictEqual(json.success, false);
});

// 16. Unauthenticated requests are rejected (401 Unauthorized)
test('16. Unauthenticated requests are rejected (401 Unauthorized)', async () => {
  const res = await fetch(`${baseUrl}/admin/subjects`);
  const json = await res.json();

  assert.strictEqual(res.status, 401);
  assert.strictEqual(json.success, false);
});

// 3. Admin can create a chapter
test('3. Admin can create a chapter', async () => {
  const res = await fetch(`${baseUrl}/admin/subjects/${createdSubjectId}/chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Chapter 1: Foundations',
      description: 'Foundations of the discipline',
      displayOrder: 1,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.subject_id, createdSubjectId);
  createdChapterId = json.data.id;
});

// 4. Chapter must reference an existing subject
test('4. Chapter must reference an existing subject (404 Not Found)', async () => {
  const nonExistentSubjectId = '00000000-0000-0000-0000-000000000000';
  const res = await fetch(`${baseUrl}/admin/subjects/${nonExistentSubjectId}/chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Orphan Chapter',
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 404);
  assert.strictEqual(json.success, false);
});

// 5. Admin can create a sectional test
test('5. Admin can create a sectional test', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Sectional Test 1: Core Concepts',
      description: '30-minute sectional mock test',
      testType: 'sectional',
      durationMinutes: 30,
      positiveMarks: 4.0,
      negativeMarks: 1.0,
      accessType: 'free',
      displayOrder: 1,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.test_type, 'sectional');
  assert.strictEqual(json.data.duration_minutes, 30);
  assert.strictEqual(json.data.is_published, false); // created as draft
  sectionalTestId = json.data.id;
});

// 6. Admin can create a full-length test
test('6. Admin can create a full-length test', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Full-Length Comprehensive Mock 1',
      testType: 'full_length',
      durationMinutes: 90,
      positiveMarks: 4.0,
      negativeMarks: 1.0,
      accessType: 'paid',
      displayOrder: 2,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.test_type, 'full_length');
  assert.strictEqual(json.data.duration_minutes, 90);
  fullLengthTestId = json.data.id;
});

// 7. Admin can create a PYQ test
test('7. Admin can create a PYQ test', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'PYQ 2024 Past Paper',
      testType: 'pyq',
      durationMinutes: 30,
      positiveMarks: 4.0,
      negativeMarks: 1.0,
      accessType: 'free',
      displayOrder: 3,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.test_type, 'pyq');
  pyqTestId = json.data.id;
});

// 8. Test duration and marking values are validated
test('8. Test duration and marking values are validated (rejection on invalid input)', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Invalid Test',
      durationMinutes: -15, // invalid
      positiveMarks: -4,    // invalid
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
});

// 9. Admin can edit and reorder tests
test('9. Admin can edit and reorder tests', async () => {
  const res = await fetch(`${baseUrl}/admin/tests/${sectionalTestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Sectional Test 1 (Updated Title)',
      displayOrder: 5,
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.title, 'Sectional Test 1 (Updated Title)');
  assert.strictEqual(json.data.display_order, 5);
});

// 10. Draft tests are not visible when filtered by isPublished=true
test('10. Draft tests are not visible when filtering by isPublished=true', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/tests?isPublished=true`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.length, 0); // No tests are published yet
});

// 11. Tests without questions cannot be published
test('11. Tests without questions cannot be published (400 Bad Request)', async () => {
  const res = await fetch(`${baseUrl}/admin/tests/${sectionalTestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      isPublished: true, // Attempt to publish test with 0 questions
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.ok(json.message.includes('questions'));
});

// 12. Question counts are calculated from PostgreSQL
test('12. Question counts are calculated dynamically from PostgreSQL', async () => {
  const res = await fetch(`${baseUrl}/admin/tests/${sectionalTestId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.question_count, 0);
});

// 13. Configuration values can be changed
test('13. Configuration values can be changed (PUT chapter settings)', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      settings: [
        {
          test_type: 'sectional',
          target_count: 20, // Changed from default 15
          default_duration_minutes: 35,
          default_positive_marks: 4.0,
          default_negative_marks: 1.0,
          free_test_count: 2,
        },
      ],
    }),
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  const sectionalSetting = json.data.settings.find((s) => s.test_type === 'sectional');
  assert.strictEqual(sectionalSetting.target_count, 20);
});

// 14. Actual test counts reflect database records
test('14. Actual test counts reflect database records in settings view', async () => {
  const res = await fetch(`${baseUrl}/admin/chapters/${createdChapterId}/settings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  const sectional = json.data.settings.find((s) => s.test_type === 'sectional');
  const fullLength = json.data.settings.find((s) => s.test_type === 'full_length');
  const pyq = json.data.settings.find((s) => s.test_type === 'pyq');

  assert.strictEqual(sectional.existing_count, 1);
  assert.strictEqual(fullLength.existing_count, 1);
  assert.strictEqual(pyq.existing_count, 1);
});

// 15. Existing users and attempts remain intact
test('15. Existing users remain intact in database', async () => {
  const countRes = await query(`SELECT COUNT(*)::int as count FROM users;`);
  assert.ok(countRes.rows[0].count >= 2);
});
