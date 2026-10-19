import { query } from '../config/db.js';

export const isValidUuid = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
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
    query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE publication_status = 'published')::int as active FROM subjects;`),
    query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE publication_status = 'published')::int as active FROM chapters;`),
    query(`SELECT 
             COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE publication_status = 'published')::int as published,
             COUNT(*) FILTER (WHERE publication_status = 'draft')::int as drafts,
             COUNT(*) FILTER (WHERE publication_status = 'archived')::int as archived,
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
      archived: testsRes.rows[0]?.archived || 0,
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
export const listSubjects = async (filters = {}) => {
  const params = [];
  let whereClause = '';

  if (filters.publishedOnly) {
    whereClause = `WHERE s.publication_status = 'published' AND s.is_active = true`;
  }

  const res = await query(
    `SELECT 
       s.id, s.name, s.slug, s.description, s.code, s.paper_code,
       COALESCE(s.publication_status, CASE WHEN s.is_active THEN 'published' ELSE 'archived' END) AS publication_status,
       s.is_active, s.display_order, s.created_at, s.updated_at,
       (SELECT COUNT(*)::int FROM chapters c WHERE c.subject_id = s.id AND (NOT $1 OR c.publication_status = 'published')) AS chapter_count,
       (SELECT COUNT(*)::int FROM tests t JOIN chapters c ON t.chapter_id = c.id WHERE c.subject_id = s.id AND (NOT $1 OR t.publication_status = 'published')) AS test_count
     FROM subjects s
     ${whereClause}
     ORDER BY s.display_order ASC, s.name ASC;`,
    [Boolean(filters.publishedOnly)]
  );
  return res.rows;
};

export const getSubjectById = async (id, filters = {}) => {
  const params = [id];
  let extraCondition = '';

  if (filters.publishedOnly) {
    extraCondition = `AND s.publication_status = 'published' AND s.is_active = true`;
  }

  const res = await query(
    `SELECT 
       s.id, s.name, s.slug, s.description, s.code, s.paper_code,
       COALESCE(s.publication_status, CASE WHEN s.is_active THEN 'published' ELSE 'archived' END) AS publication_status,
       s.is_active, s.display_order, s.created_at, s.updated_at,
       (SELECT COUNT(*)::int FROM chapters c WHERE c.subject_id = s.id) AS chapter_count
     FROM subjects s
     WHERE s.id = $1 ${extraCondition}
     LIMIT 1;`,
    params
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

export const getSubjectByName = async (name) => {
  const res = await query(
    `SELECT id, name, slug FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1;`,
    [name.trim()]
  );
  return res.rows[0] || null;
};

export const createSubject = async ({
  name,
  slug,
  description,
  paperCode,
  displayOrder = 0,
  publicationStatus = 'published',
  isActive = true,
}) => {
  const status = publicationStatus || (isActive ? 'published' : 'archived');
  const active = status === 'published';

  const res = await query(
    `INSERT INTO subjects (name, slug, description, paper_code, code, display_order, publication_status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, slug, description, paper_code, code, publication_status, is_active, display_order, created_at, updated_at;`,
    [name.trim(), slug.trim().toLowerCase(), description || null, paperCode || null, paperCode || null, displayOrder, status, active]
  );
  return res.rows[0];
};

export const updateSubject = async (id, fields = {}) => {
  const allowed = ['name', 'slug', 'description', 'paper_code', 'code', 'display_order', 'publication_status', 'is_active'];
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

  // Synchronize publication_status with is_active
  if (fields.publication_status !== undefined && fields.is_active === undefined) {
    setClauses.push(`is_active = $${paramIdx}`);
    values.push(fields.publication_status === 'published');
    paramIdx++;
  } else if (fields.is_active !== undefined && fields.publication_status === undefined) {
    setClauses.push(`publication_status = $${paramIdx}`);
    values.push(fields.is_active ? 'published' : 'archived');
    paramIdx++;
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
     RETURNING id, name, slug, description, paper_code, code, publication_status, is_active, display_order, created_at, updated_at;`,
    values
  );
  return res.rows[0] || null;
};

export const updateSubjectStatus = async (id, status) => {
  const valid = ['draft', 'published', 'archived'];
  if (!valid.includes(status)) {
    throw new Error(`Invalid publication status: ${status}. Allowed: ${valid.join(', ')}`);
  }

  const isActive = status === 'published';
  const res = await query(
    `UPDATE subjects
     SET publication_status = $1, is_active = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, slug, publication_status, is_active, updated_at;`,
    [status, isActive, id]
  );
  return res.rows[0] || null;
};

export const deleteSubject = async (id) => {
  // Check if chapters exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM chapters WHERE subject_id = $1;`, [id]);
  const chapterCount = countRes.rows[0]?.count || 0;

  if (chapterCount > 0) {
    const error = new Error(`Cannot delete subject referencing ${chapterCount} chapter(s). Please archive the subject or delete its chapters first to preserve data integrity.`);
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
export const listChaptersBySubject = async (subjectId, filters = {}) => {
  const params = [subjectId];
  let extraWhere = '';

  if (filters.publishedOnly) {
    extraWhere = `AND c.publication_status = 'published' AND c.is_active = true AND s.publication_status = 'published'`;
  }

  const res = await query(
    `SELECT 
       c.id, c.subject_id, c.name, c.title, c.slug, c.description, c.display_order,
       COALESCE(c.publication_status, CASE WHEN c.is_active THEN 'published' ELSE 'archived' END) AS publication_status,
       c.is_active, c.created_at, c.updated_at,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND (NOT $2 OR t.publication_status = 'published')) AS test_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'sectional' AND (NOT $2 OR t.publication_status = 'published')) AS sectional_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'full_length' AND (NOT $2 OR t.publication_status = 'published')) AS full_length_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'pyq' AND (NOT $2 OR t.publication_status = 'published')) AS pyq_count
     FROM chapters c
     JOIN subjects s ON c.subject_id = s.id
     WHERE c.subject_id = $1 ${extraWhere}
     ORDER BY c.display_order ASC, c.name ASC;`,
    [subjectId, Boolean(filters.publishedOnly)]
  );
  return res.rows;
};

export const getChapterById = async (id, filters = {}) => {
  const params = [id];
  let extraWhere = '';

  if (filters.publishedOnly) {
    extraWhere = `AND c.publication_status = 'published' AND c.is_active = true AND s.publication_status = 'published'`;
  }

  const res = await query(
    `SELECT 
       c.id, c.subject_id, c.name, c.title, c.slug, c.description, c.display_order,
       COALESCE(c.publication_status, CASE WHEN c.is_active THEN 'published' ELSE 'archived' END) AS publication_status,
       c.is_active, c.created_at, c.updated_at,
       s.name as subject_name, s.publication_status as subject_publication_status,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id) AS test_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'sectional') AS sectional_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'full_length') AS full_length_count,
       (SELECT COUNT(*)::int FROM tests t WHERE t.chapter_id = c.id AND t.test_type = 'pyq') AS pyq_count
     FROM chapters c
     JOIN subjects s ON c.subject_id = s.id
     WHERE c.id = $1 ${extraWhere}
     LIMIT 1;`,
    params
  );
  return res.rows[0] || null;
};

export const getChapterByNameInSubject = async (subjectId, name) => {
  const res = await query(
    `SELECT id, name, slug FROM chapters WHERE subject_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1;`,
    [subjectId, name.trim()]
  );
  return res.rows[0] || null;
};

export const createChapter = async ({
  subjectId,
  name,
  description,
  displayOrder = 0,
  publicationStatus = 'published',
  isActive = true,
}) => {
  const cleanName = name.trim();
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chapter';
  const uniqueSlug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const status = publicationStatus || (isActive ? 'published' : 'archived');
  const active = status === 'published';

  const res = await query(
    `INSERT INTO chapters (subject_id, name, title, slug, description, display_order, publication_status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, subject_id, name, title, slug, description, display_order, publication_status, is_active, created_at, updated_at;`,
    [subjectId, cleanName, cleanName, uniqueSlug, description || null, displayOrder, status, active]
  );
  return res.rows[0];
};

export const updateChapter = async (id, fields = {}) => {
  const allowed = ['name', 'description', 'display_order', 'publication_status', 'is_active', 'subject_id'];
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

  // Synchronize publication_status with is_active
  if (fields.publication_status !== undefined && fields.is_active === undefined) {
    setClauses.push(`is_active = $${paramIdx}`);
    values.push(fields.publication_status === 'published');
    paramIdx++;
  } else if (fields.is_active !== undefined && fields.publication_status === undefined) {
    setClauses.push(`publication_status = $${paramIdx}`);
    values.push(fields.is_active ? 'published' : 'archived');
    paramIdx++;
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
     RETURNING id, subject_id, name, title, slug, description, display_order, publication_status, is_active, created_at, updated_at;`,
    values
  );
  return res.rows[0] || null;
};

export const updateChapterStatus = async (id, status) => {
  const valid = ['draft', 'published', 'archived'];
  if (!valid.includes(status)) {
    throw new Error(`Invalid publication status: ${status}. Allowed: ${valid.join(', ')}`);
  }

  const isActive = status === 'published';
  const res = await query(
    `UPDATE chapters
     SET publication_status = $1, is_active = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, publication_status, is_active, updated_at;`,
    [status, isActive, id]
  );
  return res.rows[0] || null;
};

export const deleteChapter = async (id) => {
  // Check if tests exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM tests WHERE chapter_id = $1;`, [id]);
  const testCount = countRes.rows[0]?.count || 0;

  if (testCount > 0) {
    const error = new Error(`Cannot delete chapter referencing ${testCount} test(s). Please archive the chapter or remove its tests first.`);
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
    params.push(filters.testType.toLowerCase());
    whereExtra += ` AND t.test_type = $${params.length}`;
  }

  if (filters.publishedOnly) {
    whereExtra += ` AND t.publication_status = 'published' AND c.publication_status = 'published' AND s.publication_status = 'published'`;
  } else if (filters.isPublished !== undefined) {
    params.push(Boolean(filters.isPublished));
    whereExtra += ` AND (t.publication_status = 'published' OR t.is_published = true) = $${params.length}`;
  }

  const res = await query(
    `SELECT 
       t.id, t.chapter_id, t.subject_id, t.title, t.slug, t.description, t.test_type, t.test_number,
       t.duration_minutes, t.positive_marks, t.negative_marks, t.access_type, t.max_attempts,
       COALESCE(t.publication_status, CASE WHEN t.is_published THEN 'published' ELSE 'draft' END) AS publication_status,
       t.is_published, t.display_order, t.instructions, t.created_at, t.updated_at,
       COUNT(tq.id)::int AS question_count,
       (SELECT COUNT(*)::int FROM attempts a WHERE a.test_id = t.id) AS attempt_count
     FROM tests t
     JOIN chapters c ON t.chapter_id = c.id
     JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     WHERE t.chapter_id = $1 ${whereExtra}
     GROUP BY t.id
     ORDER BY t.test_type ASC, COALESCE(t.test_number, t.display_order) ASC, t.created_at ASC;`,
    params
  );
  return res.rows;
};

export const getTestById = async (id, filters = {}) => {
  const params = [id];
  let whereExtra = '';

  if (filters.publishedOnly) {
    whereExtra = `AND t.publication_status = 'published' AND c.publication_status = 'published' AND s.publication_status = 'published'`;
  }

  const res = await query(
    `SELECT 
       t.id, t.chapter_id, t.subject_id, t.title, t.slug, t.description, t.instructions,
       t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
       t.access_type, t.max_attempts,
       COALESCE(t.publication_status, CASE WHEN t.is_published THEN 'published' ELSE 'draft' END) AS publication_status,
       t.is_published, t.display_order, t.created_at, t.updated_at,
       c.name as chapter_name, c.subject_id,
       s.name as subject_name,
       COUNT(tq.id)::int AS question_count,
       (SELECT COUNT(*)::int FROM attempts a WHERE a.test_id = t.id) AS attempt_count
     FROM tests t
     JOIN chapters c ON t.chapter_id = c.id
     JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     WHERE t.id = $1 ${whereExtra}
     GROUP BY t.id, c.name, c.subject_id, s.name
     LIMIT 1;`,
    params
  );
  return res.rows[0] || null;
};

export const getTestByNumberInChapter = async (chapterId, testType, testNumber) => {
  const res = await query(
    `SELECT id, title, test_number, test_type 
     FROM tests 
     WHERE chapter_id = $1 AND test_type = $2 AND test_number = $3 
     LIMIT 1;`,
    [chapterId, testType.toLowerCase(), parseInt(testNumber, 10)]
  );
  return res.rows[0] || null;
};

export const createTest = async (data) => {
  const {
    chapterId,
    title,
    description,
    instructions,
    testType = 'sectional',
    testNumber,
    durationMinutes = 30,
    positiveMarks = 4.0,
    negativeMarks = 1.0,
    accessType = 'paid',
    maxAttempts = 1,
    publicationStatus = 'draft',
    isPublished = false,
    displayOrder = 0,
  } = data;

  // Retrieve parent chapter to obtain subject_id
  const chapterRes = await query(`SELECT subject_id FROM chapters WHERE id = $1;`, [chapterId]);
  const subjectId = chapterRes.rows[0]?.subject_id;
  if (!subjectId) {
    const error = new Error('Parent chapter does not exist or has no subject.');
    error.statusCode = 404;
    error.code = 'CHAPTER_NOT_FOUND';
    throw error;
  }

  // Calculate test_number if omitted
  let finalTestNumber;
  if (testNumber !== undefined && testNumber !== null && !isNaN(parseInt(testNumber, 10))) {
    finalTestNumber = parseInt(testNumber, 10);
    // Pre-check for duplicate test_number
    const existingNum = await getTestByNumberInChapter(chapterId, testType, finalTestNumber);
    if (existingNum) {
      const error = new Error(`Test #${finalTestNumber} already exists in this chapter for category "${testType}".`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_TEST_NUMBER';
      throw error;
    }
  } else {
    const maxNumRes = await query(
      `SELECT COALESCE(MAX(test_number), 0)::int + 1 AS next_num 
       FROM tests 
       WHERE chapter_id = $1 AND test_type = $2;`,
      [chapterId, testType.toLowerCase()]
    );
    finalTestNumber = maxNumRes.rows[0]?.next_num || 1;
  }

  const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const uniqueSlug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const durationSeconds = durationMinutes * 60;
  const statusStr = publicationStatus || (isPublished ? 'published' : 'draft');
  const isPub = statusStr === 'published';

  const res = await query(
    `INSERT INTO tests (
       chapter_id, subject_id, title, slug, description, instructions, test_type, test_number,
       duration_minutes, duration_seconds, positive_marks, positive_marks_default,
       negative_marks, negative_marks_default, access_type, max_attempts,
       publication_status, is_published, status, display_order
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING id, chapter_id, subject_id, title, slug, description, instructions, test_type, test_number,
               duration_minutes, positive_marks, negative_marks, access_type, max_attempts,
               publication_status, is_published, status, display_order, created_at, updated_at;`,
    [
      chapterId,
      subjectId,
      title.trim(),
      uniqueSlug,
      description || null,
      instructions || null,
      testType.toLowerCase(),
      finalTestNumber,
      durationMinutes,
      durationSeconds,
      positiveMarks,
      positiveMarks,
      negativeMarks,
      negativeMarks,
      accessType.toLowerCase(),
      maxAttempts,
      statusStr,
      isPub,
      statusStr,
      displayOrder || finalTestNumber,
    ]
  );
  return { ...res.rows[0], question_count: 0 };
};

export const updateTest = async (id, fields = {}) => {
  const columnUpdates = new Map();

  if (fields.title !== undefined) {
    columnUpdates.set('title', typeof fields.title === 'string' ? fields.title.trim() : fields.title);
  }
  if (fields.description !== undefined) {
    columnUpdates.set('description', fields.description);
  }
  if (fields.instructions !== undefined) {
    columnUpdates.set('instructions', fields.instructions);
  }
  if (fields.test_type !== undefined) {
    columnUpdates.set('test_type', fields.test_type);
  }
  if (fields.test_number !== undefined) {
    columnUpdates.set('test_number', fields.test_number);
  }
  if (fields.duration_minutes !== undefined) {
    columnUpdates.set('duration_minutes', parseInt(fields.duration_minutes, 10));
    columnUpdates.set('duration_seconds', parseInt(fields.duration_minutes, 10) * 60);
  }
  if (fields.positive_marks !== undefined) {
    columnUpdates.set('positive_marks', fields.positive_marks);
  }
  if (fields.negative_marks !== undefined) {
    columnUpdates.set('negative_marks', fields.negative_marks);
  }
  if (fields.access_type !== undefined) {
    columnUpdates.set('access_type', fields.access_type);
  }
  if (fields.max_attempts !== undefined) {
    columnUpdates.set('max_attempts', fields.max_attempts);
  }
  if (fields.display_order !== undefined) {
    columnUpdates.set('display_order', fields.display_order);
  }
  if (fields.chapter_id !== undefined) {
    columnUpdates.set('chapter_id', fields.chapter_id);
  }

  // Handle publication status & is_published consistently without duplicates
  if (fields.publication_status !== undefined) {
    const isPub = fields.publication_status === 'published';
    columnUpdates.set('publication_status', fields.publication_status);
    columnUpdates.set('status', fields.publication_status);
    columnUpdates.set('is_published', isPub);
  } else if (fields.is_published !== undefined) {
    const isPub = Boolean(fields.is_published);
    const pubStatus = isPub ? 'published' : 'draft';
    columnUpdates.set('publication_status', pubStatus);
    columnUpdates.set('status', pubStatus);
    columnUpdates.set('is_published', isPub);
  }

  if (columnUpdates.size === 0) {
    return getTestById(id);
  }

  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  for (const [col, val] of columnUpdates.entries()) {
    setClauses.push(`${col} = $${paramIdx}`);
    values.push(val);
    paramIdx++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const res = await query(
    `UPDATE tests
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, chapter_id, title, description, instructions, test_type, test_number,
               duration_minutes, positive_marks, negative_marks, access_type, max_attempts,
               publication_status, is_published, display_order, created_at, updated_at;`,
    values
  );

  return getTestById(id);
};

export const updateTestStatus = async (id, status) => {
  const valid = ['draft', 'published', 'archived'];
  if (!valid.includes(status)) {
    throw new Error(`Invalid status: ${status}. Allowed: ${valid.join(', ')}`);
  }

  const isPub = status === 'published';
  const res = await query(
    `UPDATE tests
     SET publication_status = $1, status = $1, is_published = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, title, publication_status, is_published, status, updated_at;`,
    [status, isPub, id]
  );
  return res.rows[0] || null;
};

export const deleteTest = async (id) => {
  // Check if student attempts exist
  const countRes = await query(`SELECT COUNT(*)::int as count FROM attempts WHERE test_id = $1;`, [id]);
  const attemptCount = countRes.rows[0]?.count || 0;

  if (attemptCount > 0) {
    const error = new Error(`Cannot delete test referencing ${attemptCount} student attempt(s). Please archive or unpublish the test instead to protect student result records.`);
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
export const getGlobalTestSeriesSettings = async () => {
  const res = await query(
    `SELECT id, test_type, target_count, default_duration_minutes, default_positive_marks, default_negative_marks, free_test_count, updated_at
     FROM test_series_settings
     WHERE chapter_id IS NULL
     ORDER BY test_type ASC;`
  );

  // If no rows, provide standardized fallback defaults
  if (res.rows.length === 0) {
    return [
      { test_type: 'sectional', target_count: 15, default_duration_minutes: 30, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 1 },
      { test_type: 'full_length', target_count: 10, default_duration_minutes: 90, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 0 },
      { test_type: 'pyq', target_count: 5, default_duration_minutes: 90, default_positive_marks: 4.0, default_negative_marks: 1.0, free_test_count: 1 },
    ];
  }

  return res.rows.map(r => ({
    ...r,
    target_count: parseInt(r.target_count, 10),
    default_duration_minutes: parseInt(r.default_duration_minutes, 10),
    default_positive_marks: parseFloat(r.default_positive_marks),
    default_negative_marks: parseFloat(r.default_negative_marks),
    free_test_count: parseInt(r.free_test_count, 10),
  }));
};

export const updateGlobalTestSeriesSettings = async (settingsList = []) => {
  const updated = [];

  for (const item of settingsList) {
    const {
      test_type,
      target_count,
      default_duration_minutes,
      default_positive_marks = 4.0,
      default_negative_marks = 1.0,
      free_test_count = 0,
    } = item;

    const res = await query(
      `INSERT INTO test_series_settings (
         chapter_id, test_type, target_count, default_duration_minutes,
         default_positive_marks, default_negative_marks, free_test_count, updated_at
       )
       VALUES (NULL, $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (test_type) WHERE chapter_id IS NULL DO UPDATE
       SET target_count = EXCLUDED.target_count,
           default_duration_minutes = EXCLUDED.default_duration_minutes,
           default_positive_marks = EXCLUDED.default_positive_marks,
           default_negative_marks = EXCLUDED.default_negative_marks,
           free_test_count = EXCLUDED.free_test_count,
           updated_at = NOW()
       RETURNING id, test_type, target_count, default_duration_minutes,
                 default_positive_marks, default_negative_marks, free_test_count, updated_at;`,
      [
        test_type.toLowerCase(),
        parseInt(target_count, 10),
        parseInt(default_duration_minutes, 10),
        parseFloat(default_positive_marks),
        parseFloat(default_negative_marks),
        parseInt(free_test_count, 10),
      ]
    );
    updated.push({
      ...res.rows[0],
      target_count: parseInt(res.rows[0].target_count, 10),
      default_duration_minutes: parseInt(res.rows[0].default_duration_minutes, 10),
      default_positive_marks: parseFloat(res.rows[0].default_positive_marks),
      default_negative_marks: parseFloat(res.rows[0].default_negative_marks),
      free_test_count: parseInt(res.rows[0].free_test_count, 10),
    });
  }

  return updated;
};

export const getChapterSettingsWithActuals = async (chapterId) => {
  // Query global defaults first
  const globalDefaults = await getGlobalTestSeriesSettings();
  const defaultsMap = new Map(globalDefaults.map(d => [d.test_type, d]));

  // Query custom settings saved in database for this chapter
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
            COUNT(*) FILTER (WHERE publication_status = 'published' OR is_published = true)::int as published_count,
            COUNT(*) FILTER (WHERE access_type = 'free')::int as free_count
     FROM tests
     WHERE chapter_id = $1
     GROUP BY test_type;`,
    [chapterId]
  );
  const actualsMap = new Map(actualsRes.rows.map(r => [r.test_type, r]));

  const validTypes = ['sectional', 'full_length', 'pyq'];

  return validTypes.map(type => {
    const def = defaultsMap.get(type) || {
      target_count: type === 'sectional' ? 15 : (type === 'full_length' ? 10 : 5),
      default_duration_minutes: type === 'sectional' ? 30 : 90,
      default_positive_marks: 4.0,
      default_negative_marks: 1.0,
      free_test_count: type === 'sectional' || type === 'pyq' ? 1 : 0,
    };
    const custom = settingsMap.get(type);
    const actual = actualsMap.get(type) || { existing_count: 0, published_count: 0, free_count: 0 };

    const target_count = custom ? parseInt(custom.target_count, 10) : def.target_count;
    const default_duration_minutes = custom ? parseInt(custom.default_duration_minutes, 10) : def.default_duration_minutes;
    const default_positive_marks = custom ? parseFloat(custom.default_positive_marks) : def.default_positive_marks;
    const default_negative_marks = custom ? parseFloat(custom.default_negative_marks) : def.default_negative_marks;
    const free_test_count = custom ? parseInt(custom.free_test_count, 10) : def.free_test_count;

    return {
      test_type: type,
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
      testType.toLowerCase(),
      parseInt(targetCount, 10),
      parseInt(defaultDurationMinutes, 10),
      parseFloat(defaultPositiveMarks),
      parseFloat(defaultNegativeMarks),
      parseInt(freeTestCount, 10),
    ]
  );
  return res.rows[0];
};
