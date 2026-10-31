import { getPool } from '../config/db.js';


/**
 * Access Control Service for PrimePrep Test Platform.
 * Enforces subject-wise purchase scope and platform-wide free test designations.
 */

/**
 * Get the two platform-wide designated free tests (1 Sectional, 1 PYQ).
 */
export async function getGlobalFreeTestIds(dbClient = null) {
  const db = dbClient || getPool();
  const query = `
    SELECT test_type, test_id 
    FROM global_free_tests
    WHERE test_id IS NOT NULL;
  `;
  const { rows } = await db.query(query);
  const freeMap = {
    sectional: null,
    pyq: null,
  };
  rows.forEach((r) => {
    if (r.test_type === 'sectional') freeMap.sectional = r.test_id;
    if (r.test_type === 'pyq') freeMap.pyq = r.test_id;
  });
  return freeMap;
}

/**
 * Check whether a user has purchased/has an active entitlement for a subject series.
 */
export async function hasSubjectEntitlement(userId, subjectId, dbClient = null) {
  if (!userId || !subjectId) return false;
  const db = dbClient || getPool();

  // Check if user is an administrator (full platform access)
  const userRes = await db.query('SELECT role FROM users WHERE id = $1 LIMIT 1;', [userId]);
  if (userRes.rows[0]?.role === 'admin') {
    return true;
  }

  const query = `
    SELECT id, status, starts_at, expires_at
    FROM subject_entitlements
    WHERE user_id = $1
      AND subject_id = $2
      AND status = 'active'
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [userId, subjectId]);
  return rows.length > 0;
}

/**
 * Check if a student or visitor can access/attempt a specific test.
 * Returns comprehensive access diagnostics and redirect/purchase metadata.
 */
export async function checkTestAccess(userId, testId, dbClient = null) {
  const db = dbClient || getPool();

  // Fetch test and subject details
  const testRes = await db.query(
    `SELECT t.id, t.subject_id, t.title, t.test_type, t.access_type,
            t.publication_status, t.is_published,
            s.name AS subject_name,
            sp.price_paise, sp.is_active AS package_active
     FROM tests t
     JOIN subjects s ON t.subject_id = s.id
     LEFT JOIN subject_packages sp ON sp.subject_id = s.id
     WHERE t.id = $1
     LIMIT 1;`,
    [testId]
  );

  if (testRes.rows.length === 0) {
    const err = new Error('Test not found.');
    err.statusCode = 404;
    throw err;
  }

  const test = testRes.rows[0];
  const isPublished = test.publication_status === 'published' || test.is_published === true;
  const defaultPricePaise = test.price_paise || 49900;

  // Check global free tests
  const freeMap = await getGlobalFreeTestIds(db);
  const isGloballyFree = freeMap.sectional === test.id || freeMap.pyq === test.id;
  const isFreeTest = isGloballyFree || test.access_type === 'free';

  // If test is free:
  if (isFreeTest) {
    return {
      canAttempt: true,
      isFree: true,
      isUnlocked: true,
      status: 'free',
      testId: test.id,
      title: test.title,
      subjectId: test.subject_id,
      subjectName: test.subject_name,
      pricePaise: defaultPricePaise,
    };
  }

  // Test is PREMIUM (Locked by default unless purchased or admin)
  if (!userId) {
    return {
      canAttempt: false,
      isFree: false,
      isUnlocked: false,
      status: 'locked',
      reason: 'AUTHENTICATION_REQUIRED',
      message: 'Please sign in to access premium test series.',
      testId: test.id,
      title: test.title,
      subjectId: test.subject_id,
      subjectName: test.subject_name,
      pricePaise: defaultPricePaise,
    };
  }

  // Check admin override
  const userRes = await db.query('SELECT role FROM users WHERE id = $1 LIMIT 1;', [userId]);
  if (userRes.rows[0]?.role === 'admin') {
    return {
      canAttempt: true,
      isFree: false,
      isUnlocked: true,
      status: 'admin_override',
      testId: test.id,
      title: test.title,
      subjectId: test.subject_id,
      subjectName: test.subject_name,
      pricePaise: defaultPricePaise,
    };
  }

  // Check student's active subject entitlement
  const hasEntitlement = await hasSubjectEntitlement(userId, test.subject_id, db);

  if (hasEntitlement) {
    return {
      canAttempt: true,
      isFree: false,
      isUnlocked: true,
      status: 'unlocked',
      testId: test.id,
      title: test.title,
      subjectId: test.subject_id,
      subjectName: test.subject_name,
      pricePaise: defaultPricePaise,
    };
  }

  // User does NOT have active subject entitlement
  return {
    canAttempt: false,
    isFree: false,
    isUnlocked: false,
    status: 'locked',
    reason: 'SUBJECT_SERIES_PURCHASE_REQUIRED',
    message: `To attempt this test, unlock the complete ${test.subject_name} Test Series.`,
    testId: test.id,
    title: test.title,
    subjectId: test.subject_id,
    subjectName: test.subject_name,
    pricePaise: defaultPricePaise,
  };
}
