import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import app from '../src/app.js';
import { getPool, query } from '../src/config/db.js';
import { config } from '../src/config/env.js';

let server;
let baseUrl;

const timestamp = Date.now();
const testAdminEmail = `upload_admin_${timestamp}@primeprep.local`;
const testStudentEmail = `upload_student_${timestamp}@primeprep.local`;

let adminToken;
let studentToken;
let adminUserId;
let studentUserId;

let testSubjectId;
let testChapterId;
let sectionalTestId;
let fullLengthTestId;
let pyqTestId;

// Helper to generate XLSX buffer
function createExcelBuffer(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Helper to generate CSV string
function createCsvString(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // 1. Seed test admin in database
  const adminRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Upload Admin', $1, 'hashed_pw', 'admin', true)
     RETURNING id;`,
    [testAdminEmail]
  );
  adminUserId = adminRes.rows[0].id;
  adminToken = jwt.sign(
    { id: adminUserId, email: testAdminEmail, role: 'admin' },
    config.jwtSecret,
    { expiresIn: '1d' }
  );

  // 2. Seed test student in database
  const studentRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Upload Student', $1, 'hashed_pw', 'student', true)
     RETURNING id;`,
    [testStudentEmail]
  );
  studentUserId = studentRes.rows[0].id;
  studentToken = jwt.sign(
    { id: studentUserId, email: testStudentEmail, role: 'student' },
    config.jwtSecret,
    { expiresIn: '1d' }
  );

  // 3. Seed test subject
  const subRes = await query(
    `INSERT INTO subjects (name, slug, description, paper_code, display_order, publication_status, is_active)
     VALUES ($1, $2, 'Test subject for bulk upload', 'TEST01', 99, 'published', true)
     RETURNING id;`,
    [`Bulk Upload Subject ${timestamp}`, `bulk-upload-subject-${timestamp}`]
  );
  testSubjectId = subRes.rows[0].id;

  // 4. Seed test chapter
  const chapRes = await query(
    `INSERT INTO chapters (subject_id, name, title, slug, display_order, publication_status, is_active)
     VALUES ($1, 'Chapter 1: Foundations', 'Foundations', $2, 1, 'published', true)
     RETURNING id;`,
    [testSubjectId, `chapter-1-foundations-${timestamp}`]
  );
  testChapterId = chapRes.rows[0].id;

  // 5. Seed Sectional Test
  const secRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
     VALUES ($1, $2, 'Sectional Test 1: Foundations', $3, 'sectional', 1, 30, 4.00, 1.00, 'draft', false, 'draft', 1)
     RETURNING id;`,
    [testChapterId, testSubjectId, `sectional-test-1-${timestamp}`]
  );
  sectionalTestId = secRes.rows[0].id;

  // 6. Seed Full-Length Test
  const flRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
     VALUES ($1, $2, 'Full-Length Test 1: Comprehensive', $3, 'full_length', 1, 90, 4.00, 1.00, 'draft', false, 'draft', 2)
     RETURNING id;`,
    [testChapterId, testSubjectId, `full-length-test-1-${timestamp}`]
  );
  fullLengthTestId = flRes.rows[0].id;

  // 7. Seed PYQ Test
  const pyqRes = await query(
    `INSERT INTO tests (chapter_id, subject_id, title, slug, test_type, test_number, duration_minutes, positive_marks, negative_marks, publication_status, is_published, status, display_order)
     VALUES ($1, $2, 'PYQ Test 2024 Past Paper', $3, 'pyq', 2024, 60, 4.00, 1.00, 'draft', false, 'draft', 3)
     RETURNING id;`,
    [testChapterId, testSubjectId, `pyq-test-2024-${timestamp}`]
  );
  pyqTestId = pyqRes.rows[0].id;
});

test.after(async () => {
  if (server) {
    server.close();
  }

  try {
    // Clean up all data created in test
    await query(`DELETE FROM test_questions WHERE test_id IN ($1, $2, $3);`, [sectionalTestId, fullLengthTestId, pyqTestId]);
    await query(`DELETE FROM tests WHERE id IN ($1, $2, $3);`, [sectionalTestId, fullLengthTestId, pyqTestId]);
    await query(`DELETE FROM questions WHERE subject_id = $1;`, [testSubjectId]);
    await query(`DELETE FROM chapters WHERE id = $1;`, [testChapterId]);
    await query(`DELETE FROM subjects WHERE id = $1;`, [testSubjectId]);
    await query(`DELETE FROM users WHERE email IN ($1, $2);`, [testAdminEmail, testStudentEmail]);
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  const pool = getPool();
  if (pool) {
    await pool.end();
  }
});

// ==========================================
// TEST CASES
// ==========================================

// 1. Upload exact Excel format with all columns
test('1. Upload exact Excel format with all columns preview succeeds', async () => {
  const excelRows = [
    {
      Subject: `Bulk Upload Subject ${timestamp}`,
      Chapter: 'Chapter 1: Foundations',
      'Test Type': 'SECTIONAL',
      'Test Number': 1,
      Question: 'Who founded the Bolshevik Communist Party?',
      'Option A': 'Vladimir Lenin',
      'Option B': 'Joseph Stalin',
      'Option C': 'Nikita Khrushchev',
      'Option D': 'Leonid Brezhnev',
      Answer: 'A',
      Solution: 'Vladimir Lenin founded the Bolshevik faction in 1903.',
    },
    {
      Subject: `Bulk Upload Subject ${timestamp}`,
      Chapter: 'Chapter 1: Foundations',
      'Test Type': 'SECTIONAL',
      'Test Number': 1,
      Question: 'Which philosopher is renowned for the allegory of the cave?',
      'Option A': 'Aristotle',
      'Option B': 'Plato',
      'Option C': 'Socrates',
      'Option D': 'Descartes',
      Answer: 'B',
      Solution: 'Plato introduced the allegory in Republic Book VII.',
    },
  ];

  const buffer = createExcelBuffer(excelRows);
  const fileBase64 = buffer.toString('base64');

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      fileBase64,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.totalRows, 2);
  assert.strictEqual(json.data.validCount, 2);
  assert.strictEqual(json.data.invalidCount, 0);
  assert.strictEqual(json.data.preview.length, 2);
  assert.strictEqual(json.data.preview[0].questionText, 'Who founded the Bolshevik Communist Party?');
  assert.strictEqual(json.data.preview[0].correctOption, 'A');
  assert.strictEqual(json.data.preview[0].explanation, 'Vladimir Lenin founded the Bolshevik faction in 1903.');
});

// 2. Upload CSV file with the same columns
test('2. Upload a CSV file with the same columns succeeds', async () => {
  const csvRows = [
    {
      Question: 'What is the primary function of the judiciary?',
      'Option A': 'Make laws',
      'Option B': 'Enforce laws',
      'Option C': 'Interpret laws',
      'Option D': 'Collect taxes',
      Answer: 'C',
      Solution: 'The judiciary interprets the law and settles legal disputes.',
    },
  ];

  const csvText = createCsvString(csvRows);

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.totalRows, 1);
  assert.strictEqual(json.data.validCount, 1);
  assert.strictEqual(json.data.preview[0].questionText, 'What is the primary function of the judiciary?');
  assert.strictEqual(json.data.preview[0].correctOption, 'C');
});

// 3. Import questions into a selected sectional test
test('3. Import questions into a selected sectional test commits to database', async () => {
  const questionsToImport = [
    {
      questionText: 'Which treaty established the European Union?',
      optionA: 'Treaty of Versailles',
      optionB: 'Maastricht Treaty',
      optionC: 'Treaty of Rome',
      optionD: 'Lisbon Treaty',
      correctOption: 'B',
      explanation: 'The Maastricht Treaty signed in 1992 created the European Union.',
    },
    {
      questionText: 'What form of government did Jean-Jacques Rousseau advocate?',
      optionA: 'Constitutional Monarchy',
      optionB: 'Direct Democracy',
      optionC: 'Representative Oligarchy',
      optionD: 'Military Dictatorship',
      correctOption: 'B',
      explanation: 'Rousseau advocated for direct participation of citizens under the General Will.',
    },
  ];

  const res = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      questions: questionsToImport,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.questionsImported, 2);
  assert.strictEqual(json.data.totalQuestionsInTest, 2);
  assert.strictEqual(json.data.testCategory, 'sectional');
  assert.strictEqual(json.data.testNumber, 1);
  assert.strictEqual(json.data.importStatus, 'completed');
});

// 4. Import questions into a selected full-length test
test('4. Import questions into a selected full-length test', async () => {
  const questionsToImport = [
    {
      questionText: 'Which economic model assumes rational expectations and market clearing?',
      optionA: 'Keynesian Economics',
      optionB: 'New Classical Macroeconomics',
      optionC: 'Mercantilism',
      optionD: 'Physiocracy',
      correctOption: 'B',
      explanation: 'New Classical Macroeconomics emphasizes rational expectations.',
    },
  ];

  const res = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: fullLengthTestId,
      questions: questionsToImport,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.questionsImported, 1);
  assert.strictEqual(json.data.testCategory, 'full_length');
});

// 5. Import questions into a selected PYQ test
test('5. Import questions into a selected PYQ test', async () => {
  const questionsToImport = [
    {
      questionText: 'In which year was the Universal Declaration of Human Rights adopted?',
      optionA: '1945',
      optionB: '1948',
      optionC: '1950',
      optionD: '1966',
      correctOption: 'B',
      explanation: 'The UN General Assembly adopted the UDHR on 10 December 1948.',
    },
  ];

  const res = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: pyqTestId,
      questions: questionsToImport,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.questionsImported, 1);
  assert.strictEqual(json.data.testCategory, 'pyq');
  assert.strictEqual(json.data.testNumber, 2024);
});

// 6. Reject a spreadsheet with missing Question column (400 Bad Request)
test('6. Reject a spreadsheet with a missing Question column (400 Bad Request)', async () => {
  const invalidRows = [
    {
      'Option A': 'Alpha',
      'Option B': 'Beta',
      'Option C': 'Gamma',
      'Option D': 'Delta',
      Answer: 'A',
    },
  ];

  const csvText = createCsvString(invalidRows);

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);
  assert.ok(json.message.toLowerCase().includes('question'));
});

// 7. Reject questions missing any of the four options
test('7. Reject questions missing any of the four options', async () => {
  const invalidRows = [
    {
      Question: 'What is photosynthesis?',
      'Option A': 'Light to chemical energy conversion',
      'Option B': 'Water breakdown',
      'Option C': '', // Missing Option C!
      'Option D': 'Heat emission',
      Answer: 'A',
    },
  ];

  const csvText = createCsvString(invalidRows);

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200); // Preview returns 200 with invalidCount > 0 and error details
  assert.strictEqual(json.data.validCount, 0);
  assert.strictEqual(json.data.invalidCount, 1);
  assert.strictEqual(json.data.validationErrors.length, 1);
  assert.strictEqual(json.data.validationErrors[0].row, 2);
  assert.ok(json.data.validationErrors[0].errors.some((e) => e.includes('Option C')));
});

// 8. Reject answers other than A, B, C, or D
test('8. Reject answers other than A, B, C, or D', async () => {
  const invalidRows = [
    {
      Question: 'What is absolute zero in Celsius?',
      'Option A': '-273.15 C',
      'Option B': '0 C',
      'Option C': '100 C',
      'Option D': '-100 C',
      Answer: 'E', // Invalid answer letter!
    },
  ];

  const csvText = createCsvString(invalidRows);

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.invalidCount, 1);
  assert.ok(json.data.validationErrors[0].errors.some((e) => e.includes('A, B, C, or D')));
});

// 9. Reject spreadsheet metadata that conflicts with the selected test
test('9. Reject spreadsheet metadata that conflicts with the selected test', async () => {
  const conflictingRows = [
    {
      Subject: 'Completely Wrong Subject Name',
      Chapter: 'Chapter 99',
      'Test Type': 'PYQ', // Destination is Sectional!
      'Test Number': 99,
      Question: 'What is civic virtue?',
      'Option A': 'Active citizenship',
      'Option B': 'Passive loyalty',
      'Option C': 'Tax evasion',
      'Option D': 'Anarchy',
      Answer: 'A',
    },
  ];

  const csvText = createCsvString(conflictingRows);

  const res = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.invalidCount, 1);
  const rowErrors = json.data.validationErrors[0].errors;
  assert.ok(rowErrors.some((e) => e.toLowerCase().includes('subject')));
  assert.ok(rowErrors.some((e) => e.toLowerCase().includes('chapter')));
  assert.ok(rowErrors.some((e) => e.toLowerCase().includes('test type') || e.toLowerCase().includes('category')));
});

// 10. Reject an unauthorized import request (401 / 403)
test('10. Reject an unauthorized import request (401 / 403)', async () => {
  // A. No token (401)
  const noTokenRes = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId: sectionalTestId, csvText: 'Question\nTest' }),
  });
  assert.strictEqual(noTokenRes.status, 401);

  // B. Student token (403 Forbidden)
  const studentRes = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ testId: sectionalTestId, csvText: 'Question\nTest' }),
  });
  assert.strictEqual(studentRes.status, 403);
});

// 11. Verify solutions are saved correctly in database
test('11. Verify solutions are saved correctly in the explanation column', async () => {
  const res = await fetch(`${baseUrl}/admin/tests/${sectionalTestId}/questions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const json = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.questions.length >= 2);

  const rousseauQ = json.data.questions.find((q) => q.question_text.includes('Rousseau'));
  assert.ok(rousseauQ);
  assert.strictEqual(rousseauQ.correct_option, 'B');
  assert.ok(rousseauQ.explanation.includes('General Will'));
});

// 12. Verify all imported questions are linked to the correct test
test('12. Verify all imported questions are linked to the correct test in test_questions', async () => {
  const dbCheck = await query(
    `SELECT tq.test_id, tq.display_order, q.question_text
     FROM test_questions tq
     JOIN questions q ON tq.question_id = q.id
     WHERE tq.test_id = $1
     ORDER BY tq.display_order ASC;`,
    [sectionalTestId]
  );

  assert.strictEqual(dbCheck.rowCount, 2);
  assert.strictEqual(dbCheck.rows[0].display_order, 1);
  assert.strictEqual(dbCheck.rows[1].display_order, 2);
  assert.strictEqual(dbCheck.rows[0].test_id, sectionalTestId);
  assert.strictEqual(dbCheck.rows[1].test_id, sectionalTestId);
});

// 13. Verify a failed import does not leave partial data (atomic transaction rollback)
test('13. Verify a failed import does not leave partial data (atomic rollback)', async () => {
  const countBefore = await query(
    `SELECT COUNT(*)::int as count FROM test_questions WHERE test_id = $1;`,
    [sectionalTestId]
  );
  const initialCount = countBefore.rows[0].count;

  // Batch containing 1 valid question and 1 invalid question (missing option D)
  const invalidBatch = [
    {
      questionText: 'Valid Question In Rollback Test',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
      explanation: 'Explanation',
    },
    {
      questionText: 'Invalid Question In Rollback Test',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: '', // Invalid!
      correctOption: 'A',
      explanation: 'Explanation',
    },
  ];

  const res = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      questions: invalidBatch,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(json.success, false);

  // Check database: the valid question must NOT have been inserted
  const countAfter = await query(
    `SELECT COUNT(*)::int as count FROM test_questions WHERE test_id = $1;`,
    [sectionalTestId]
  );
  assert.strictEqual(countAfter.rows[0].count, initialCount);

  const qCheck = await query(
    `SELECT COUNT(*)::int as count FROM questions WHERE question_text = 'Valid Question In Rollback Test';`
  );
  assert.strictEqual(qCheck.rows[0].count, 0);
});

// 14. Verify existing questions and test records remain intact
test('14. Verify existing questions remain intact and order continues sequentially', async () => {
  // Add a 3rd question to sectionalTestId
  const thirdQuestion = [
    {
      questionText: 'Third question appended sequentially',
      optionA: 'Alpha',
      optionB: 'Beta',
      optionC: 'Gamma',
      optionD: 'Delta',
      correctOption: 'C',
      explanation: 'Sequential explanation',
    },
  ];

  const res = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      questions: thirdQuestion,
    }),
  });

  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.totalQuestionsInTest, 3);
  assert.strictEqual(json.data.displayOrderRange, '3 to 3');

  // Verify all 3 questions exist
  const allQ = await query(
    `SELECT tq.display_order, q.question_text
     FROM test_questions tq
     JOIN questions q ON tq.question_id = q.id
     WHERE tq.test_id = $1
     ORDER BY tq.display_order ASC;`,
    [sectionalTestId]
  );
  assert.strictEqual(allQ.rowCount, 3);
  assert.strictEqual(allQ.rows[0].display_order, 1);
  assert.strictEqual(allQ.rows[1].display_order, 2);
  assert.strictEqual(allQ.rows[2].display_order, 3);
});

// 15. Verify duplicate uploads are detected and warned about
test('15. Verify duplicate uploads are detected or explicitly warned about', async () => {
  // Re-uploading a question that already exists in this test:
  const duplicateRows = [
    {
      Question: 'Third question appended sequentially', // already imported in test 14!
      'Option A': 'Alpha',
      'Option B': 'Beta',
      'Option C': 'Gamma',
      'Option D': 'Delta',
      Answer: 'C',
    },
  ];

  const csvText = createCsvString(duplicateRows);

  const previewRes = await fetch(`${baseUrl}/admin/questions/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      csvText,
    }),
  });

  const previewJson = await previewRes.json();
  assert.strictEqual(previewRes.status, 200);
  assert.strictEqual(previewJson.data.isDuplicateWarning, true);
  assert.strictEqual(previewJson.data.duplicateCount, 1);
  assert.strictEqual(previewJson.data.duplicatesInTest.length, 1);

  // Attempting to confirm without allowDuplicates should be prevented (409 Conflict)
  const confirmRes = await fetch(`${baseUrl}/admin/questions/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      testId: sectionalTestId,
      questions: [
        {
          questionText: 'Third question appended sequentially',
          optionA: 'Alpha',
          optionB: 'Beta',
          optionC: 'Gamma',
          optionD: 'Delta',
          correctOption: 'C',
        },
      ],
      allowDuplicates: false,
    }),
  });

  const confirmJson = await confirmRes.json();
  assert.strictEqual(confirmRes.status, 409);
  assert.strictEqual(confirmJson.success, false);
  assert.strictEqual(confirmJson.code, 'ALL_QUESTIONS_DUPLICATE');
});
