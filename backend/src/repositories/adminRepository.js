import { query } from '../config/db.js';

export const isValidUuid = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

// ==========================================
// AUDIT LOGGING HELPER
// ==========================================
export const recordAuditLog = async ({ adminUserId, action, entityType, entityId, details = {} }) => {
  try {
    await query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb);`,
      [adminUserId || null, action, entityType, entityId || null, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[Audit Log Warning]:', err.message);
  }
};

// ==========================================
// DASHBOARD STATS
// ==========================================
export const getDashboardStats = async () => {
  const [subjectsRes, chaptersRes, testsRes, questionsRes] = await Promise.all([
    query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE is_active = true)::int as active FROM subjects;`),
    query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE is_active = true)::int as active FROM chapters;`),
    query(`SELECT 
             COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE is_published = true)::int as published,
             COUNT(*) FILTER (WHERE is_published = false)::int as drafts,
             COUNT(*) FILTER (WHERE test_type = 'sectional')::int as sectional,
             COUNT(*) FILTER (WHERE test_type = 'full_length')::int as full_length,
             COUNT(*) FILTER (WHERE test_type = 'pyq')::int as pyq
           FROM tests;`),
    query(`SELECT COUNT(*)::int as total FROM questions;`),
  ]);

  return {
    subjects: {
      total: subjectsRes.rows[0]?.total || 0,
      active: subjectsRes.rows[0]?.active || 0,
    },
    chapters: {
      total: chaptersRes.rows[0]?.total || 0,
      active: chaptersRes.rows[0]?.active || 0,
    },
    tests: {
      total: testsRes.rows[0]?.total || 0,
      published: testsRes.rows[0]?.published || 0,
      drafts: testsRes.rows[0]?.drafts || 0,
      byType: {
        sectional: testsRes.rows[0]?.sectional || 0,
        full_length: testsRes.rows[0]?.full_length || 0,
        pyq: testsRes.rows[0]?.pyq || 0,
      },
    },
    questions: {
      total: questionsRes.rows[0]?.total || 0,
    },
  };
};

// ==========================================
// SUBJECTS REPOSITORY
// ==========================================
export const listSubjects = async () => {
  const res = await query(
    `SELECT 
       s.id, s.name, s.slug, s.description, s.is_active, s.display_order, s.created_at, s.updated_at,
       (SELECT COUNT(*)::int FROM chapters c WHERE c.subject_id = s.id) AS chapter_count,
       (SELECT COUNT(*)::int FROM tests t JOIN chapters c ON t.chapter_id = c.id WHERE c.subject_id = s.id) AS test_count
     FROM subjects s
     ORDER BY s.display_order ASC, s.name ASC;`
  );
  return res.rows;
};

export const getSubjectById = async (id) => {
  const res = await query(
    `SELECT 
       s.id, s.name, s.slug, s.description, s.is_active, s.display_order, s.created_at, s.updated_at,
       (SELECT COUNT(*)::int FROM chapters c WHERE c.subject_id = s.id) AS chapter_count
     FROM subjects s
     WHERE s.id = $1
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

export const getSubjectBySlug = async (slug) => {
  const res = await query(
    `SELECT id, name, slug FROM subjects WHERE LOWER(slug) = LOWER($1) LIMIT 1;`,
    [slug.trim()]
  );
  return res.rows[0] || null;
};

export const createSubject = async ({ name, slug, description, displayOrder = 0, isActive = true }) => {
  const res = await query(
    `INSERT INTO subjects (name, slug, description, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, slug, description, is_active, display_order, created_at, updated_at;`,
    [name.trim(), slug.trim().toLowerCase(), description || null, displayOrder, isActive]
  );
  return res.rows[0];
};

export const updateSubject = async (id, fields = {}) => {
  const allowed = ['name', 'slug', 'description', 'display_order', 'is_active'];
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key) && val !== undefined) {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(key === 'slug' && typeof val === 'string' ? val.trim().toLowerCase() : val);
      paramIdx++;
    }
  }

  if (setClauses.length === 0) {
    return getSubjectById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const res = await query(
    `UPDATE subjects
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, name, slug, description, is_active, display_order, created_at, updated_at;`,
    values
  );
  return res.rows[0] || null;
};

export const deleteSubject = async (id) => {
  // Check if chapters exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM chapters WHERE subject_id = $1;`, [id]);
  const chapterCount = countRes.rows[0]?.count || 0;

  if (chapterCount > 0) {
    const error = new Error(`Cannot delete subject referencing ${chapterCount} chapter(s). Please deactivate the subject or delete its chapters first.`);
    error.statusCode = 400;
    error.code = 'SUBJECT_IN_USE';
    throw error;
  }

  const res = await query(`DELETE FROM subjects WHERE id = $1 RETURNING id, name, slug;`, [id]);
  return res.rows[0] || null;
};

// ==========================================
// CHAPTERS REPOSITORY
// ==========================================
export const listChaptersBySubject = async (subjectId) => {
  const res = await query(
    `SELECT 
       c.id, c.subject_id, c.name, c.description, c.display_order, c.is_active, c.created_at, c.updated_at,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id) AS test_count
     FROM chapters c
     WHERE c.subject_id = $1
     ORDER BY c.display_order ASC, c.name ASC;`,
    [subjectId]
  );
  return res.rows;
};

export const getChapterById = async (id) => {
  const res = await query(
    `SELECT 
       c.id, c.subject_id, c.name, c.description, c.display_order, c.is_active, c.created_at, c.updated_at,
       s.name as subject_name,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id) AS test_count
     FROM chapters c
     JOIN subjects s ON c.subject_id = s.id
     WHERE c.id = $1
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

export const createChapter = async ({ subjectId, name, description, displayOrder = 0, isActive = true }) => {
  const cleanName = name.trim();
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chapter';
  const uniqueSlug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const res = await query(
    `INSERT INTO chapters (subject_id, name, title, slug, description, display_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, subject_id, name, title, description, display_order, is_active, created_at, updated_at;`,
    [subjectId, cleanName, cleanName, uniqueSlug, description || null, displayOrder, isActive]
  );
  return res.rows[0];
};

export const updateChapter = async (id, fields = {}) => {
  const allowed = ['name', 'description', 'display_order', 'is_active', 'subject_id'];
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key) && val !== undefined) {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(val);
      paramIdx++;

      if (key === 'name') {
        setClauses.push(`title = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }
    }
  }

  if (setClauses.length === 0) {
    return getChapterById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const res = await query(
    `UPDATE chapters
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, subject_id, name, description, display_order, is_active, created_at, updated_at;`,
    values
  );
  return res.rows[0] || null;
};

export const deleteChapter = async (id) => {
  // Check if tests exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM tests WHERE chapter_id = $1;`, [id]);
  const testCount = countRes.rows[0]?.count || 0;

  if (testCount > 0) {
    const error = new Error(`Cannot delete chapter referencing ${testCount} test(s). Please deactivate the chapter or remove its tests first.`);
    error.statusCode = 400;
    error.code = 'CHAPTER_IN_USE';
    throw error;
  }

  const res = await query(`DELETE FROM chapters WHERE id = $1 RETURNING id, name;`, [id]);
  return res.rows[0] || null;
};

// ==========================================
// TESTS REPOSITORY
// ==========================================
export const listTestsByChapter = async (chapterId, filters = {}) => {
  const params = [chapterId];
  let whereExtra = '';

  if (filters.testType) {
    params.push(filters.testType);
    whereExtra += ` AND t.test_type = $${params.length}`;
  }

  if (filters.isPublished !== undefined) {
    params.push(filters.isPublished);
    whereExtra += ` AND t.is_published = $${params.length}`;
  }

  const res = await query(
    `SELECT 
       t.id, t.chapter_id, t.title, t.description, t.test_type, t.duration_minutes,
       t.positive_marks, t.negative_marks, t.access_type, t.max_attempts, t.is_published,
       t.display_order, t.created_at, t.updated_at,
       COUNT(tq.id)::int AS question_count,
       (SELECT COUNT(*)::int FROM attempts a WHERE a.test_id = t.id) AS attempt_count
     FROM tests t
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     WHERE t.chapter_id = $1 ${whereExtra}
     GROUP BY t.id
     ORDER BY t.display_order ASC, t.created_at DESC;`,
    params
  );
  return res.rows;
};

export const getTestById = async (id) => {
  const res = await query(
    `SELECT 
       t.id, t.chapter_id, t.title, t.description, t.test_type, t.duration_minutes,
       t.positive_marks, t.negative_marks, t.access_type, t.max_attempts, t.is_published,
       t.display_order, t.created_at, t.updated_at,
       c.name as chapter_name, c.subject_id,
       s.name as subject_name,
       COUNT(tq.id)::int AS question_count,
       (SELECT COUNT(*)::int FROM attempts a WHERE a.test_id = t.id) AS attempt_count
     FROM tests t
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     JOIN chapters c ON t.chapter_id = c.id
     JOIN subjects s ON c.subject_id = s.id
     WHERE t.id = $1
     GROUP BY t.id, c.name, c.subject_id, s.name
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

export const createTest = async (data) => {
  const {
    chapterId,
    title,
    description,
    testType = 'sectional',
    durationMinutes = 30,
    positiveMarks = 4.0,
    negativeMarks = 1.0,
    accessType = 'paid',
    maxAttempts = 1,
    isPublished = false,
    displayOrder = 0,
  } = data;

  // Retrieve parent chapter to obtain subject_id
  const chapterRes = await query(`SELECT subject_id FROM chapters WHERE id = $1;`, [chapterId]);
  const subjectId = chapterRes.rows[0]?.subject_id;
  if (!subjectId) {
    throw new Error('Cannot create test: Parent chapter does not exist or has no subject.');
  }

  const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const uniqueSlug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const durationSeconds = durationMinutes * 60;
  const statusStr = isPublished ? 'published' : 'draft';

  const res = await query(
    `INSERT INTO tests (
       chapter_id, subject_id, title, slug, description, test_type,
       duration_minutes, duration_seconds, positive_marks, positive_marks_default,
       negative_marks, negative_marks_default, access_type, max_attempts,
       is_published, status, display_order
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id, chapter_id, subject_id, title, slug, description, test_type, duration_minutes,
               positive_marks, negative_marks, access_type, max_attempts,
               is_published, status, display_order, created_at, updated_at;`,
    [
      chapterId,
      subjectId,
      title.trim(),
      uniqueSlug,
      description || null,
      testType,
      durationMinutes,
      durationSeconds,
      positiveMarks,
      positiveMarks,
      negativeMarks,
      negativeMarks,
      accessType,
      maxAttempts,
      isPublished,
      statusStr,
      displayOrder,
    ]
  );
  return { ...res.rows[0], question_count: 0 };
};

export const updateTest = async (id, fields = {}) => {
  const allowed = [
    'title', 'description', 'test_type', 'duration_minutes',
    'positive_marks', 'negative_marks', 'access_type', 'max_attempts',
    'is_published', 'display_order', 'chapter_id'
  ];

  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key) && val !== undefined) {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(key === 'title' && typeof val === 'string' ? val.trim() : val);
      paramIdx++;

      if (key === 'duration_minutes') {
        setClauses.push(`duration_seconds = $${paramIdx}`);
        values.push(parseInt(val, 10) * 60);
        paramIdx++;
      }
      if (key === 'is_published') {
        setClauses.push(`status = $${paramIdx}`);
        values.push(val ? 'published' : 'draft');
        paramIdx++;
      }
    }
  }

  if (setClauses.length === 0) {
    return getTestById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const res = await query(
    `UPDATE tests
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, chapter_id, title, description, test_type, duration_minutes,
               positive_marks, negative_marks, access_type, max_attempts,
               is_published, display_order, created_at, updated_at;`,
    values
  );

  return getTestById(id);
};

export const deleteTest = async (id) => {
  // Check if attempts exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM attempts WHERE test_id = $1;`, [id]);
  const attemptCount = countRes.rows[0]?.count || 0;

  if (attemptCount > 0) {
    const error = new Error(`Cannot delete test referencing ${attemptCount} student attempt(s). Please unpublish the test instead to protect student result records.`);
    error.statusCode = 400;
    error.code = 'TEST_HAS_ATTEMPTS';
    throw error;
  }

  const res = await query(`DELETE FROM tests WHERE id = $1 RETURNING id, title;`, [id]);
  return res.rows[0] || null;
};

// ==========================================
// TEST SERIES SETTINGS / QUOTAS REPOSITORY
// ==========================================
export const getChapterSettingsWithActuals = async (chapterId) => {
  // Default business configuration
  const defaultConfigs = [
    { test_type: 'sectional', target_count: 15, default_duration_minutes: 30, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 1 },
    { test_type: 'full_length', target_count: 10, default_duration_minutes: 90, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 0 },
    { test_type: 'pyq', target_count: 5, default_duration_minutes: 30, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 1 },
  ];

  // Query custom settings saved in database
  const settingsRes = await query(
    `SELECT test_type, target_count, default_duration_minutes, default_positive_marks, default_negative_marks, free_test_count, updated_at
     FROM test_series_settings
     WHERE chapter_id = $1;`,
    [chapterId]
  );
  const settingsMap = new Map(settingsRes.rows.map(r => [r.test_type, r]));

  // Query actual tests in database for this chapter
  const actualsRes = await query(
    `SELECT test_type, 
            COUNT(*)::int as existing_count,
            COUNT(*) FILTER (WHERE is_published = true)::int as published_count,
            COUNT(*) FILTER (WHERE access_type = 'free')::int as free_count
     FROM tests
     WHERE chapter_id = $1
     GROUP BY test_type;`,
    [chapterId]
  );
  const actualsMap = new Map(actualsRes.rows.map(r => [r.test_type, r]));

  return defaultConfigs.map(def => {
    const custom = settingsMap.get(def.test_type);
    const actual = actualsMap.get(def.test_type) || { existing_count: 0, published_count: 0, free_count: 0 };

    const target_count = custom ? custom.target_count : def.target_count;
    const default_duration_minutes = custom ? custom.default_duration_minutes : def.default_duration_minutes;
    const default_positive_marks = custom ? Number(custom.default_positive_marks) : def.default_positive_marks;
    const default_negative_marks = custom ? Number(custom.default_negative_marks) : def.default_negative_marks;
    const free_test_count = custom ? custom.free_test_count : def.free_test_count;

    return {
      test_type: def.test_type,
      target_count,
      existing_count: actual.existing_count,
      published_count: actual.published_count,
      missing_count: Math.max(0, target_count - actual.existing_count),
      default_duration_minutes,
      default_positive_marks,
      default_negative_marks,
      free_test_count,
      actual_free_count: actual.free_count,
      is_customized: !!custom,
    };
  });
};

export const updateChapterSetting = async ({
  chapterId,
  testType,
  targetCount,
  defaultDurationMinutes,
  defaultPositiveMarks,
  defaultNegativeMarks,
  freeTestCount
}) => {
  const res = await query(
    `INSERT INTO test_series_settings (
       chapter_id, test_type, target_count, default_duration_minutes,
       default_positive_marks, default_negative_marks, free_test_count, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (chapter_id, test_type) DO UPDATE
     SET target_count = EXCLUDED.target_count,
         default_duration_minutes = EXCLUDED.default_duration_minutes,
         default_positive_marks = EXCLUDED.default_positive_marks,
         default_negative_marks = EXCLUDED.default_negative_marks,
         free_test_count = EXCLUDED.free_test_count,
         updated_at = NOW()
     RETURNING id, chapter_id, test_type, target_count, default_duration_minutes,
               default_positive_marks, default_negative_marks, free_test_count, updated_at;`,
    [
      chapterId,
      testType,
      targetCount,
      defaultDurationMinutes,
      defaultPositiveMarks,
      defaultNegativeMarks,
      freeTestCount,
    ]
  );
  return res.rows[0];
};
