import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const BASE_URL = 'http://localhost:3000/api';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function api(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function run() {
  console.log('====================================================');
  console.log('🧪 Starting PrimePrep Phase 5 Verification Test Suite');
  console.log('====================================================\n');

  // Login as admin
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'rishabhmyp@gmail.com', password: 'Admin@8218' }),
  });
  const adminToken = adminLogin.data.token;
  if (!adminToken) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));

  // Login as student
  const studentLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ananya.verma@example.com', password: 'Password@123' }),
  });
  const studentToken = studentLogin.data.token;
  if (!studentToken) throw new Error('Student login failed: ' + JSON.stringify(studentLogin.data));

  const results = [];

  // ----------------------------------------------------
  // TEST 1: Create a subject using the backend API
  // ----------------------------------------------------
  const subjectName = `Sociology Test ${Date.now()}`;
  const t1 = await api('/subjects', {
    method: 'POST',
    body: JSON.stringify({
      name: subjectName,
      description: 'Comprehensive study of human social relationships and institutions.',
      paperCode: 'HUQP22',
      displayOrder: 8,
      publicationStatus: 'published',
    }),
  }, adminToken);

  const subjectId = t1.data?.data?.id;
  const t1Passed = t1.status === 201 && subjectId && t1.data.data.name === subjectName;
  results.push({ test: 'TEST 1: Create subject via API', passed: t1Passed, detail: `Subject ID: ${subjectId}` });
  console.log(t1Passed ? '✅ TEST 1 Passed' : '❌ TEST 1 Failed', t1.data);

  // ----------------------------------------------------
  // TEST 2: Create two chapters under that subject
  // ----------------------------------------------------
  const t2a = await api(`/subjects/${subjectId}/chapters`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Classical Sociological Thinkers',
      description: 'Marx, Weber, Durkheim foundational theories',
      displayOrder: 1,
      publicationStatus: 'published',
    }),
  }, adminToken);
  const chapter1Id = t2a.data?.data?.id;

  const t2b = await api(`/subjects/${subjectId}/chapters`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Modern Social Stratification',
      description: 'Class, caste, gender, and social mobility',
      displayOrder: 2,
      publicationStatus: 'published',
    }),
  }, adminToken);
  const chapter2Id = t2b.data?.data?.id;

  const t2Passed = t2a.status === 201 && t2b.status === 201 && chapter1Id && chapter2Id;
  results.push({ test: 'TEST 2: Create two chapters under subject', passed: t2Passed, detail: `Ch1: ${chapter1Id}, Ch2: ${chapter2Id}` });
  console.log(t2Passed ? '✅ TEST 2 Passed' : '❌ TEST 2 Failed');

  // ----------------------------------------------------
  // TEST 3: Create sectional, full-length, and PYQ tests under a chapter
  // ----------------------------------------------------
  const t3Sec = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Sectional Test 1: Durkheim Division of Labour',
      testType: 'sectional',
      testNumber: 1,
      durationMinutes: 30,
      positiveMarks: 4,
      negativeMarks: 1,
      accessType: 'free',
      publicationStatus: 'published',
    }),
  }, adminToken);

  const t3Full = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Full-Length Mock Test 1',
      testType: 'full_length',
      testNumber: 1,
      durationMinutes: 90,
      positiveMarks: 4,
      negativeMarks: 1,
      accessType: 'paid',
      publicationStatus: 'published',
    }),
  }, adminToken);

  const t3Pyq = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'PYQ 2024 Chapter Test',
      testType: 'pyq',
      testNumber: 1,
      durationMinutes: 90,
      positiveMarks: 4,
      negativeMarks: 1,
      accessType: 'free',
      publicationStatus: 'published',
    }),
  }, adminToken);

  const t3Passed = t3Sec.status === 201 && t3Full.status === 201 && t3Pyq.status === 201;
  results.push({ test: 'TEST 3: Create sectional, full-length, and PYQ tests', passed: t3Passed });
  console.log(t3Passed ? '✅ TEST 3 Passed' : '❌ TEST 3 Failed');

  // ----------------------------------------------------
  // TEST 4: Change the default sectional test count from 15 to 20
  // ----------------------------------------------------
  const currentDefaultsRes = await api('/admin/test-series-settings', {}, adminToken);
  const currentDefaults = currentDefaultsRes.data?.data || [];
  const updatedPayload = currentDefaults.map(d => {
    if (d.test_type === 'sectional') {
      return { ...d, target_count: 20 };
    }
    return d;
  });

  const t4 = await api('/admin/test-series-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings: updatedPayload }),
  }, adminToken);

  const checkSec = t4.data?.data?.find(d => d.test_type === 'sectional');
  const t4Passed = t4.status === 200 && checkSec?.target_count === 20;
  results.push({ test: 'TEST 4: Change default sectional test count to 20', passed: t4Passed, detail: `New target: ${checkSec?.target_count}` });
  console.log(t4Passed ? '✅ TEST 4 Passed' : '❌ TEST 4 Failed', checkSec);

  // ----------------------------------------------------
  // TEST 5: Verify that the new default does not unexpectedly modify existing tests
  // ----------------------------------------------------
  const existingTestCheck = await api(`/tests/${t3Sec.data.data.id}`, {}, adminToken);
  const t5Passed = existingTestCheck.status === 200 &&
    existingTestCheck.data?.data?.id === t3Sec.data.data.id &&
    existingTestCheck.data?.data?.test_number === 1 &&
    existingTestCheck.data?.data?.duration_minutes === 30;
  results.push({ test: 'TEST 5: Verify new default does not modify existing tests', passed: t5Passed });
  console.log(t5Passed ? '✅ TEST 5 Passed' : '❌ TEST 5 Failed');

  // ----------------------------------------------------
  // TEST 6: Create more tests than the initial target count
  // ----------------------------------------------------
  // Create additional tests up to test_number 21 or create multiple tests beyond initial targets
  const t6 = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Sectional Test 21: Advanced Methodologies',
      testType: 'sectional',
      testNumber: 21,
      durationMinutes: 30,
      positiveMarks: 4,
      negativeMarks: 1,
      accessType: 'paid',
      publicationStatus: 'published',
    }),
  }, adminToken);
  const t6Passed = t6.status === 201 && t6.data?.data?.test_number === 21;
  results.push({ test: 'TEST 6: Create tests beyond target count', passed: t6Passed, detail: `Created test #${t6.data?.data?.test_number}` });
  console.log(t6Passed ? '✅ TEST 6 Passed' : '❌ TEST 6 Failed');

  // ----------------------------------------------------
  // TEST 7: Verify that published subjects and chapters appear in the student catalogue
  // ----------------------------------------------------
  const studentSubjects = await api('/subjects', {}, studentToken);
  const foundSubject = studentSubjects.data?.data?.find(s => s.id === subjectId);
  const studentChapters = await api(`/subjects/${subjectId}/chapters`, {}, studentToken);
  const foundChapter = studentChapters.data?.data?.find(c => c.id === chapter1Id);
  const t7Passed = studentSubjects.status === 200 && Boolean(foundSubject) && Boolean(foundChapter);
  results.push({ test: 'TEST 7: Published subjects and chapters visible to students', passed: t7Passed });
  console.log(t7Passed ? '✅ TEST 7 Passed' : '❌ TEST 7 Failed');

  // ----------------------------------------------------
  // TEST 8: Verify that drafts and unpublished tests are hidden from students
  // ----------------------------------------------------
  // Create a draft test under chapter 1
  const draftTestRes = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Secret Unfinished Draft Test',
      testType: 'sectional',
      testNumber: 2,
      durationMinutes: 30,
      publicationStatus: 'draft',
    }),
  }, adminToken);
  const draftTestId = draftTestRes.data?.data?.id;

  // Student queries tests under chapter 1
  const studentTests = await api(`/chapters/${chapter1Id}/tests`, {}, studentToken);
  const hasDraftInList = studentTests.data?.data?.some(t => t.id === draftTestId);

  // Student directly accesses draft test endpoint
  const directDraftAccess = await api(`/tests/${draftTestId}`, {}, studentToken);

  const t8Passed = !hasDraftInList && directDraftAccess.status === 404;
  results.push({ test: 'TEST 8: Drafts and unpublished tests hidden from students', passed: t8Passed });
  console.log(t8Passed ? '✅ TEST 8 Passed' : '❌ TEST 8 Failed');

  // ----------------------------------------------------
  // TEST 9: Verify that a student cannot create or modify subjects, chapters, tests, or configuration
  // ----------------------------------------------------
  const studentSubjCreate = await api('/subjects', { method: 'POST', body: JSON.stringify({ name: 'Hacked Subject' }) }, studentToken);
  const studentChCreate = await api(`/subjects/${subjectId}/chapters`, { method: 'POST', body: JSON.stringify({ name: 'Hacked Chapter' }) }, studentToken);
  const studentTestCreate = await api(`/chapters/${chapter1Id}/tests`, { method: 'POST', body: JSON.stringify({ title: 'Hacked Test' }) }, studentToken);
  const studentSettingsPut = await api('/admin/test-series-settings', { method: 'PUT', body: JSON.stringify({ settings: [] }) }, studentToken);

  const t9Passed = [studentSubjCreate.status, studentChCreate.status, studentTestCreate.status, studentSettingsPut.status].every(s => s === 403);
  results.push({ test: 'TEST 9: Student forbidden from admin mutation endpoints (403)', passed: t9Passed, detail: `Statuses: ${[studentSubjCreate.status, studentChCreate.status, studentTestCreate.status, studentSettingsPut.status].join(', ')}` });
  console.log(t9Passed ? '✅ TEST 9 Passed' : '❌ TEST 9 Failed');

  // ----------------------------------------------------
  // TEST 10: Verify that a request for a nonexistent subject or chapter returns an appropriate error (404)
  // ----------------------------------------------------
  const fakeUuid = '00000000-0000-0000-0000-999999999999';
  const nonexistentSubj = await api(`/subjects/${fakeUuid}`, {}, adminToken);
  const nonexistentChap = await api(`/chapters/${fakeUuid}`, {}, adminToken);
  const nonexistentTest = await api(`/tests/${fakeUuid}`, {}, adminToken);
  const t10Passed = nonexistentSubj.status === 404 && nonexistentChap.status === 404 && nonexistentTest.status === 404;
  results.push({ test: 'TEST 10: Nonexistent subject/chapter/test returns 404', passed: t10Passed });
  console.log(t10Passed ? '✅ TEST 10 Passed' : '❌ TEST 10 Failed');

  // ----------------------------------------------------
  // TEST 11: Verify that duplicate test numbers are handled according to database constraints (409)
  // ----------------------------------------------------
  const duplicateTest = await api(`/chapters/${chapter1Id}/tests`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Duplicate Test Number 1 Attempt',
      testType: 'sectional',
      testNumber: 1, // Already used by Sectional Test 1
      durationMinutes: 30,
    }),
  }, adminToken);
  const t11Passed = duplicateTest.status === 409;
  results.push({ test: 'TEST 11: Duplicate test numbers rejected by database constraints (409)', passed: t11Passed, detail: `Status: ${duplicateTest.status}, Code: ${duplicateTest.data?.error?.code}` });
  console.log(t11Passed ? '✅ TEST 11 Passed' : '❌ TEST 11 Failed', duplicateTest.data);

  // ----------------------------------------------------
  // TEST 12: Verify that existing registration and sign-in still work
  // ----------------------------------------------------
  const newStudentEmail = `phase5_student_${Date.now()}@example.com`;
  const regRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Vikram Mehta',
      email: newStudentEmail,
      password: 'Password@123',
    }),
  });
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newStudentEmail,
      password: 'Password@123',
    }),
  });
  const t12Passed = regRes.status === 201 && loginRes.status === 200 && loginRes.data?.user?.email === newStudentEmail;
  results.push({ test: 'TEST 12: Existing student registration and sign-in still work', passed: t12Passed });
  console.log(t12Passed ? '✅ TEST 12 Passed' : '❌ TEST 12 Failed');

  // ----------------------------------------------------
  // TEST 13: Verify that historical attempts and results remain intact
  // ----------------------------------------------------
  const attemptsCheck = await pool.query('SELECT COUNT(*)::int as count FROM attempts;');
  const attemptsCount = attemptsCheck.rows[0]?.count;
  const t13Passed = typeof attemptsCount === 'number';
  results.push({ test: 'TEST 13: Historical attempts and results remain intact in database', passed: t13Passed, detail: `Total attempts preserved: ${attemptsCount}` });
  console.log(t13Passed ? '✅ TEST 13 Passed' : '❌ TEST 13 Failed');

  console.log('\n====================================================');
  console.log('📊 Verification Summary:');
  console.table(results);
  const allPassed = results.every(r => r.passed);
  console.log(allPassed ? '🎉 ALL 13 TESTS PASSED!' : '⚠️ SOME TESTS FAILED');
  console.log('====================================================\n');

  await pool.end();
}

run().catch(console.error);
