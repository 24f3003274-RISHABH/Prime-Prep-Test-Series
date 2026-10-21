import { getPool } from '../config/db.js';

/**
 * Public repository for retrieving published CUET PG catalogue data.
 * Guarantees that only published records are retrieved.
 * Never leaks correct answers, internal solution keys, or user data.
 */

export const getPublicStats = async () => {
  const pool = getPool();
  const query = `
    SELECT 
      (SELECT COUNT(*)::int FROM subjects WHERE publication_status = 'published' OR is_active = true) AS subjects_count,
      (SELECT COUNT(DISTINCT c.id)::int 
       FROM chapters c 
       JOIN subjects s ON c.subject_id = s.id 
       WHERE (c.publication_status = 'published' OR c.is_active = true) 
         AND (s.publication_status = 'published' OR s.is_active = true)
      ) AS chapters_count,
      (SELECT COUNT(DISTINCT t.id)::int 
       FROM tests t 
       JOIN subjects s ON t.subject_id = s.id 
       LEFT JOIN chapters c ON t.chapter_id = c.id 
       WHERE (t.publication_status = 'published' OR t.is_published = true) 
         AND (s.publication_status = 'published' OR s.is_active = true) 
         AND (c.id IS NULL OR c.publication_status = 'published' OR c.is_active = true)
      ) AS tests_count,
      (SELECT COUNT(DISTINCT tq.question_id)::int 
       FROM test_questions tq 
       JOIN tests t ON tq.test_id = t.id 
       JOIN subjects s ON t.subject_id = s.id 
       WHERE (t.publication_status = 'published' OR t.is_published = true) 
         AND (s.publication_status = 'published' OR s.is_active = true)
      ) AS questions_count;
  `;
  const res = await pool.query(query);
  const row = res.rows[0] || {};
  return {
    subjectsCount: parseInt(row.subjects_count, 10) || 0,
    chaptersCount: parseInt(row.chapters_count, 10) || 0,
    testsCount: parseInt(row.tests_count, 10) || 0,
    questionsCount: parseInt(row.questions_count, 10) || 0,
  };
};

export const getPublicSubjects = async () => {
  const pool = getPool();
  const query = `
    SELECT s.id, s.name, s.slug, s.description, s.code, s.paper_code,
           s.display_order,
           COUNT(DISTINCT c.id)::int AS chapter_count,
           COUNT(DISTINCT t.id)::int AS test_count
    FROM subjects s
    LEFT JOIN chapters c ON s.id = c.subject_id AND (c.publication_status = 'published' OR c.is_active = true)
    LEFT JOIN tests t ON s.id = t.subject_id AND (t.publication_status = 'published' OR t.is_published = true)
    WHERE (s.publication_status = 'published' OR s.is_active = true)
    GROUP BY s.id
    ORDER BY s.display_order ASC, s.name ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

export const getPublicChapters = async (subjectId) => {
  const pool = getPool();
  const query = `
    SELECT c.id, c.subject_id, c.name, c.title, c.slug, c.description, c.display_order,
           s.name AS subject_name,
           COUNT(DISTINCT t.id)::int AS test_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'sectional' THEN t.id END)::int AS sectional_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'full_length' THEN t.id END)::int AS full_length_count,
           COUNT(DISTINCT CASE WHEN t.test_type = 'pyq' THEN t.id END)::int AS pyq_count
    FROM chapters c
    JOIN subjects s ON c.subject_id = s.id
    LEFT JOIN tests t ON c.id = t.chapter_id AND (t.publication_status = 'published' OR t.is_published = true)
    WHERE c.subject_id = $1 
      AND (c.publication_status = 'published' OR c.is_active = true)
      AND (s.publication_status = 'published' OR s.is_active = true)
    GROUP BY c.id, s.name
    ORDER BY c.display_order ASC, c.name ASC;
  `;
  const res = await pool.query(query, [subjectId]);
  return res.rows;
};

export const getPublicTests = async ({
  subjectId,
  chapterId,
  category,
  accessType,
  search,
  page = 1,
  limit = 20,
}) => {
  const pool = getPool();
  const params = [];
  let paramIdx = 1;

  let whereClauses = [
    `(t.publication_status = 'published' OR t.is_published = true)`,
    `(s.publication_status = 'published' OR s.is_active = true)`,
    `(c.id IS NULL OR c.publication_status = 'published' OR c.is_active = true)`,
  ];

  if (subjectId) {
    whereClauses.push(`t.subject_id = $${paramIdx++}`);
    params.push(subjectId);
  }

  if (chapterId) {
    whereClauses.push(`t.chapter_id = $${paramIdx++}`);
    params.push(chapterId);
  }

  if (category && category !== 'ALL') {
    whereClauses.push(`t.test_type = $${paramIdx++}`);
    params.push(category.toLowerCase());
  }

  if (accessType && accessType !== 'ALL') {
    whereClauses.push(`t.access_type = $${paramIdx++}`);
    params.push(accessType.toLowerCase());
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    whereClauses.push(`(LOWER(t.title) LIKE $${paramIdx} OR LOWER(s.name) LIKE $${paramIdx} OR LOWER(COALESCE(c.name, c.title, '')) LIKE $${paramIdx})`);
    params.push(term);
    paramIdx++;
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  // Total count query
  const countSql = `
    SELECT COUNT(DISTINCT t.id)::int AS total
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    ${whereSql};
  `;
  const countRes = await pool.query(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  // Pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  params.push(limitNum);
  const limitIdx = paramIdx++;
  params.push(offset);
  const offsetIdx = paramIdx++;

  const listSql = `
    SELECT t.id, t.subject_id, t.chapter_id, t.title, t.slug, t.description,
           t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
           t.access_type, t.max_attempts, t.publication_status, t.is_published, t.display_order,
           s.name AS subject_name, s.code AS subject_code, s.paper_code AS subject_paper_code,
           c.name AS chapter_name, c.title AS chapter_title,
           COUNT(tq.id)::int AS question_count,
           ROUND(COUNT(tq.id) * COALESCE(t.positive_marks, 4.0), 2) AS total_marks
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    LEFT JOIN test_questions tq ON t.id = tq.test_id
    ${whereSql}
    GROUP BY t.id, s.id, s.name, s.code, s.paper_code, c.id, c.name, c.title
    ORDER BY s.display_order ASC, s.name ASC, t.test_type ASC, COALESCE(t.test_number, t.display_order) ASC, t.title ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const listRes = await pool.query(listSql, params);

  return {
    tests: listRes.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getPublicTestById = async (testId) => {
  const pool = getPool();
  const query = `
    SELECT t.id, t.subject_id, t.chapter_id, t.title, t.slug, t.description, t.instructions,
           t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
           t.access_type, t.max_attempts, t.publication_status, t.is_published,
           s.name AS subject_name, s.code AS subject_code, s.paper_code AS subject_paper_code,
           c.name AS chapter_name, c.title AS chapter_title,
           COUNT(tq.id)::int AS question_count
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    LEFT JOIN test_questions tq ON t.id = tq.test_id
    WHERE t.id = $1 
      AND (t.publication_status = 'published' OR t.is_published = true)
      AND (s.publication_status = 'published' OR s.is_active = true)
      AND (c.id IS NULL OR c.publication_status = 'published' OR c.is_active = true)
    GROUP BY t.id, s.id, s.name, s.code, s.paper_code, c.id, c.name, c.title;
  `;
  const res = await pool.query(query, [testId]);
  if (res.rowCount === 0) return null;

  const test = res.rows[0];
  const qCount = parseInt(test.question_count, 10) || 0;
  const posMarks = parseFloat(test.positive_marks) || 4.0;
  const negMarks = parseFloat(test.negative_marks) || 1.0;

  return {
    ...test,
    total_marks: (qCount * posMarks).toFixed(2),
    positive_marks: posMarks,
    negative_marks: negMarks,
  };
};

export const getFeaturedFreeTest = async () => {
  const pool = getPool();
  const query = `
    SELECT t.id, t.subject_id, t.chapter_id, t.title, t.slug, t.description,
           t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
           t.access_type,
           s.name AS subject_name, c.name AS chapter_name,
           COUNT(tq.id)::int AS question_count
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    LEFT JOIN test_questions tq ON t.id = tq.test_id
    WHERE (t.publication_status = 'published' OR t.is_published = true)
      AND t.access_type = 'free'
      AND (s.publication_status = 'published' OR s.is_active = true)
      AND (c.id IS NULL OR c.publication_status = 'published' OR c.is_active = true)
    GROUP BY t.id, s.id, s.name, c.id, c.name
    HAVING COUNT(tq.id) > 0
    ORDER BY s.display_order ASC, t.test_type ASC, t.test_number ASC
    LIMIT 1;
  `;
  const res = await pool.query(query);
  return res.rows[0] || null;
};
