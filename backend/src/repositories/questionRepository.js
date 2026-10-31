import { getPool, query } from '../config/db.js';

/**
 * Fetch a test along with its parent chapter and subject details.
 */
export const getTestWithHierarchy = async (testId) => {
  const res = await query(
    `SELECT 
       t.id, t.chapter_id, t.subject_id, t.title, t.slug, t.description, t.instructions,
       t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
       t.access_type, t.max_attempts, t.publication_status, t.is_published, t.display_order,
       c.id as chapter_id, c.name as chapter_name, c.title as chapter_title, c.display_order as chapter_order,
       s.id as subject_id, s.name as subject_name, s.code as subject_code, s.paper_code as subject_paper_code,
       COUNT(tq.id)::int as question_count
     FROM tests t
     JOIN chapters c ON t.chapter_id = c.id
     JOIN subjects s ON c.subject_id = s.id
     LEFT JOIN test_questions tq ON t.id = tq.test_id
     WHERE t.id = $1
     GROUP BY t.id, c.id, c.name, c.title, c.display_order, s.id, s.name, s.code, s.paper_code;`,
    [testId]
  );
  return res.rows[0] || null;
};

/**
 * Get existing question texts in a test to check for duplicates.
 */
export const getExistingQuestionsInTest = async (testId) => {
  const res = await query(
    `SELECT 
       q.id, 
       q.question_text,
       tq.display_order
     FROM test_questions tq
     JOIN questions q ON tq.question_id = q.id
     WHERE tq.test_id = $1
     ORDER BY tq.display_order ASC;`,
    [testId]
  );
  return res.rows;
};

/**
 * Get all questions for a specific test (admin view).
 */
export const getTestQuestionsForAdmin = async (testId) => {
  const res = await query(
    `SELECT 
       q.id,
       tq.display_order,
       tq.question_order,
       tq.question_number,
       q.question_text,
       q.option_a,
       q.option_b,
       q.option_c,
       q.option_d,
       q.correct_option,
       q.explanation,
       COALESCE(tq.positive_marks, q.positive_marks) as positive_marks,
       COALESCE(tq.negative_marks, q.negative_marks) as negative_marks,
       tq.section_name,
       q.created_at
     FROM test_questions tq
     JOIN questions q ON tq.question_id = q.id
     WHERE tq.test_id = $1
     ORDER BY tq.display_order ASC;`,
    [testId]
  );
  return res.rows;
};

/**
 * Atomically imports an array of questions into the questions and test_questions tables
 * within a single PostgreSQL transaction.
 */
export const bulkImportQuestionsAtomic = async ({
  testId,
  questions,
  adminUserId,
  overridePositiveMarks,
  overrideNegativeMarks,
  filename,
  rejectedCount = 0,
}) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection pool is not available.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock destination test row
    const testRes = await client.query(
      `SELECT t.*, c.name as chapter_name, s.name as subject_name
       FROM tests t
       JOIN chapters c ON t.chapter_id = c.id
       JOIN subjects s ON c.subject_id = s.id
       WHERE t.id = $1
       FOR UPDATE;`,
      [testId]
    );

    if (testRes.rowCount === 0) {
      const error = new Error('Destination test not found.');
      error.statusCode = 404;
      throw error;
    }

    const test = testRes.rows[0];

    // 2. Fetch current maximum display_order
    const orderRes = await client.query(
      `SELECT COALESCE(MAX(display_order), 0)::int as max_order
       FROM test_questions
       WHERE test_id = $1;`,
      [testId]
    );
    let currentOrder = orderRes.rows[0].max_order;

    const posMarks = overridePositiveMarks !== undefined
      ? parseFloat(overridePositiveMarks)
      : parseFloat(test.positive_marks || 4.0);

    const negMarks = overrideNegativeMarks !== undefined
      ? parseFloat(overrideNegativeMarks)
      : parseFloat(test.negative_marks || 1.0);

    let validCreatorId = null;
    if (adminUserId) {
      const pRes = await client.query('SELECT id FROM profiles WHERE id = $1 LIMIT 1;', [adminUserId]);
      if (pRes.rowCount > 0) {
        validCreatorId = adminUserId;
      }
    }

    const insertedQuestions = [];

    // 3. Insert each question and link into test_questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      currentOrder += 1;

      // Insert into questions bank
      const qRes = await client.query(
        `INSERT INTO questions (
           subject_id, chapter_id, question_text, option_a, option_b, option_c, option_d,
           correct_option, explanation, positive_marks, negative_marks,
           question_type, difficulty, status, created_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'single_choice', 'moderate', 'published', $12, NOW(), NOW())
         RETURNING id, question_text, correct_option, explanation, positive_marks, negative_marks;`,
        [
          test.subject_id,
          test.chapter_id,
          q.questionText.trim(),
          q.optionA.trim(),
          q.optionB.trim(),
          q.optionC.trim(),
          q.optionD.trim(),
          q.correctOption.toUpperCase(),
          q.explanation ? q.explanation.trim() : null,
          posMarks,
          negMarks,
          validCreatorId,
        ]
      );

      const insertedQ = qRes.rows[0];

      // Insert into test_questions mapping
      await client.query(
        `INSERT INTO test_questions (
           test_id, question_id, display_order, question_order, question_number,
           positive_marks, negative_marks, section_name, created_at
         )
         VALUES ($1, $2, $3, $3, $3, $4, $5, 'Domain Specific', NOW());`,
        [
          testId,
          insertedQ.id,
          currentOrder,
          posMarks,
          negMarks,
        ]
      );

      insertedQuestions.push({
        ...insertedQ,
        displayOrder: currentOrder,
      });
    }

    // 4. Update test timestamp and ensure published status so students can take it
    await client.query(`UPDATE tests SET updated_at = NOW(), publication_status = 'published', is_published = true, status = 'published' WHERE id = $1;`, [testId]);

    // 5. Audit log
    const auditRes = await client.query(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'BULK_QUESTION_IMPORT', 'test', $2, $3::jsonb)
       RETURNING id, created_at;`,
      [
        adminUserId || null,
        testId,
        JSON.stringify({
          filename: filename || 'spreadsheet.xlsx',
          importedCount: insertedQuestions.length,
          rejectedCount: parseInt(rejectedCount, 10) || 0,
          startOrder: orderRes.rows[0].max_order + 1,
          endOrder: currentOrder,
          subjectName: test.subject_name,
          chapterName: test.chapter_name,
          testType: test.test_type,
          testNumber: test.test_number,
          title: test.title,
          importStatus: 'completed',
        }),
      ]
    );

    const importRecord = auditRes.rows[0];

    await client.query('COMMIT');

    // 6. Get updated total questions
    const finalCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM test_questions WHERE test_id = $1;`,
      [testId]
    );

    return {
      success: true,
      importId: importRecord?.id,
      importTimestamp: importRecord?.created_at,
      importedCount: insertedQuestions.length,
      rejectedCount: parseInt(rejectedCount, 10) || 0,
      totalQuestionsInTest: finalCountRes.rows[0].count,
      firstOrder: orderRes.rows[0].max_order + 1,
      lastOrder: currentOrder,
      test: {
        id: test.id,
        title: test.title,
        testType: test.test_type,
        testNumber: test.test_number,
        subjectName: test.subject_name,
        chapterName: test.chapter_name,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * List questions with search and multi-level filtering (subject, chapter, test, category).
 */
export const listQuestions = async ({
  subjectId,
  chapterId,
  testId,
  testType,
  search,
  limit = 50,
  offset = 0,
}) => {
  const params = [];
  const conditions = [];

  if (subjectId) {
    params.push(subjectId);
    conditions.push(`q.subject_id = $${params.length}`);
  }

  if (chapterId) {
    params.push(chapterId);
    conditions.push(`q.chapter_id = $${params.length}`);
  }

  if (testId) {
    params.push(testId);
    conditions.push(`tq.test_id = $${params.length}`);
  }

  if (testType) {
    params.push(testType.toLowerCase());
    conditions.push(`t.test_type = $${params.length}`);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(LOWER(q.question_text) LIKE ${p} OR LOWER(q.option_a) LIKE ${p} OR LOWER(q.option_b) LIKE ${p} OR LOWER(q.option_c) LIKE ${p} OR LOWER(q.option_d) LIKE ${p} OR LOWER(COALESCE(q.explanation, '')) LIKE ${p})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching questions
  const countSql = `
    SELECT COUNT(DISTINCT q.id)::int as total
    FROM questions q
    LEFT JOIN test_questions tq ON q.id = tq.question_id
    LEFT JOIN tests t ON tq.test_id = t.id
    ${whereClause};
  `;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  // Query records
  const queryParams = [...params];
  queryParams.push(parseInt(limit, 10) || 50);
  const limitParam = `$${queryParams.length}`;
  queryParams.push(parseInt(offset, 10) || 0);
  const offsetParam = `$${queryParams.length}`;

  const selectSql = `
    SELECT 
      q.id,
      q.question_text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation,
      COALESCE(tq.positive_marks, q.positive_marks) as positive_marks,
      COALESCE(tq.negative_marks, q.negative_marks) as negative_marks,
      q.created_at,
      q.updated_at,
      tq.test_id,
      tq.display_order,
      t.title as test_title,
      t.test_type,
      t.test_number,
      c.id as chapter_id,
      c.name as chapter_name,
      s.id as subject_id,
      s.name as subject_name,
      (SELECT COUNT(*)::int FROM attempt_answers aa WHERE aa.question_id = q.id) as attempt_count
    FROM questions q
    LEFT JOIN test_questions tq ON q.id = tq.question_id
    LEFT JOIN tests t ON tq.test_id = t.id
    LEFT JOIN chapters c ON q.chapter_id = c.id
    LEFT JOIN subjects s ON q.subject_id = s.id
    ${whereClause}
    ORDER BY s.name ASC, c.display_order ASC, t.test_type ASC, tq.display_order ASC, q.created_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam};
  `;

  const rowsRes = await query(selectSql, queryParams);

  return {
    questions: rowsRes.rows,
    total,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
  };
};

/**
 * Get single question by ID with attempt count.
 */
export const getQuestionById = async (id) => {
  const res = await query(
    `SELECT 
       q.id,
       q.subject_id,
       q.chapter_id,
       q.question_text,
       q.option_a,
       q.option_b,
       q.option_c,
       q.option_d,
       q.correct_option,
       q.explanation,
       q.positive_marks,
       q.negative_marks,
       q.question_type,
       q.difficulty,
       q.status,
       q.created_at,
       q.updated_at,
       tq.test_id,
       tq.display_order,
       t.title as test_title,
       t.test_type,
       t.test_number,
       s.name as subject_name,
       c.name as chapter_name,
       (SELECT COUNT(*)::int FROM attempt_answers aa WHERE aa.question_id = q.id) as attempt_count
     FROM questions q
     LEFT JOIN test_questions tq ON q.id = tq.question_id
     LEFT JOIN tests t ON tq.test_id = t.id
     LEFT JOIN subjects s ON q.subject_id = s.id
     LEFT JOIN chapters c ON q.chapter_id = c.id
     WHERE q.id = $1
     LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
};

/**
 * Update question fields (question_text, options, answer, explanation, marks).
 */
export const updateQuestion = async (id, fields = {}) => {
  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  if (fields.questionText !== undefined) {
    setClauses.push(`question_text = $${paramIdx}`);
    values.push(fields.questionText.trim());
    paramIdx++;
  }
  if (fields.optionA !== undefined) {
    setClauses.push(`option_a = $${paramIdx}`);
    values.push(fields.optionA.trim());
    paramIdx++;
  }
  if (fields.optionB !== undefined) {
    setClauses.push(`option_b = $${paramIdx}`);
    values.push(fields.optionB.trim());
    paramIdx++;
  }
  if (fields.optionC !== undefined) {
    setClauses.push(`option_c = $${paramIdx}`);
    values.push(fields.optionC.trim());
    paramIdx++;
  }
  if (fields.optionD !== undefined) {
    setClauses.push(`option_d = $${paramIdx}`);
    values.push(fields.optionD.trim());
    paramIdx++;
  }
  if (fields.correctOption !== undefined) {
    setClauses.push(`correct_option = $${paramIdx}`);
    values.push(fields.correctOption.toUpperCase());
    paramIdx++;
  }
  if (fields.explanation !== undefined) {
    setClauses.push(`explanation = $${paramIdx}`);
    values.push(fields.explanation ? fields.explanation.trim() : null);
    paramIdx++;
  }
  if (fields.positiveMarks !== undefined) {
    setClauses.push(`positive_marks = $${paramIdx}`);
    values.push(parseFloat(fields.positiveMarks));
    paramIdx++;
  }
  if (fields.negativeMarks !== undefined) {
    setClauses.push(`negative_marks = $${paramIdx}`);
    values.push(parseFloat(fields.negativeMarks));
    paramIdx++;
  }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    await query(
      `UPDATE questions
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx};`,
      values
    );

    // Also update test_questions positive/negative marks if marks changed
    if (fields.positiveMarks !== undefined || fields.negativeMarks !== undefined) {
      const markSets = [];
      const markVals = [];
      let mIdx = 1;
      if (fields.positiveMarks !== undefined) {
        markSets.push(`positive_marks = $${mIdx++}`);
        markVals.push(parseFloat(fields.positiveMarks));
      }
      if (fields.negativeMarks !== undefined) {
        markSets.push(`negative_marks = $${mIdx++}`);
        markVals.push(parseFloat(fields.negativeMarks));
      }
      markVals.push(id);
      await query(
        `UPDATE test_questions SET ${markSets.join(', ')} WHERE question_id = $${mIdx};`,
        markVals
      );
    }
  }

  return getQuestionById(id);
};

/**
 * Safe delete: verifies no student attempt records reference this question before deletion.
 */
export const deleteQuestion = async (id) => {
  // Check student attempts
  const countRes = await query(
    `SELECT COUNT(*)::int as count FROM attempt_answers WHERE question_id = $1;`,
    [id]
  );
  const attemptsCount = countRes.rows[0]?.count || 0;

  if (attemptsCount > 0) {
    const error = new Error(
      `Cannot delete question referenced by ${attemptsCount} historical student attempt record(s). Questions with existing student responses must be preserved.`
    );
    error.statusCode = 400;
    error.code = 'QUESTION_HAS_ATTEMPTS';
    throw error;
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find test_id to resequence remaining questions
    const tqRes = await client.query(
      `SELECT test_id FROM test_questions WHERE question_id = $1;`,
      [id]
    );
    const testId = tqRes.rows[0]?.test_id;

    // Delete mapping
    await client.query(`DELETE FROM test_questions WHERE question_id = $1;`, [id]);
    // Delete question
    await client.query(`DELETE FROM questions WHERE id = $1;`, [id]);

    // Resequence test_questions if attached to a test
    if (testId) {
      const remainingRes = await client.query(
        `SELECT id FROM test_questions WHERE test_id = $1 ORDER BY display_order ASC;`,
        [testId]
      );
      for (let i = 0; i < remainingRes.rows.length; i++) {
        const order = i + 1;
        await client.query(
          `UPDATE test_questions
           SET display_order = $1, question_order = $1, question_number = $1
           WHERE id = $2;`,
          [order, remainingRes.rows[i].id]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, deletedQuestionId: id, testId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Atomically reorder questions in a test.
 */
export const reorderTestQuestions = async (testId, orderedQuestionIds = []) => {
  if (!orderedQuestionIds || orderedQuestionIds.length === 0) {
    return { success: true };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Build bulk CASE statement
    const whenClauses = [];
    const params = [testId];

    for (let i = 0; i < orderedQuestionIds.length; i++) {
      const qId = orderedQuestionIds[i];
      const order = i + 1;
      params.push(qId);
      const qParam = `$${params.length}`;
      whenClauses.push(`WHEN question_id = ${qParam} THEN ${order}`);
    }

    const caseSql = `CASE ${whenClauses.join(' ')} ELSE display_order END`;

    const inPlaceholders = params.slice(1).map((_, idx) => `$${idx + 2}`).join(', ');

    const updateSql = `
      UPDATE test_questions
      SET display_order = ${caseSql},
          question_order = ${caseSql},
          question_number = ${caseSql}
      WHERE test_id = $1 AND question_id IN (${inPlaceholders});
    `;

    await client.query(updateSql, params);
    await client.query('COMMIT');

    return { success: true, updatedCount: orderedQuestionIds.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Retrieve bulk question import history recorded in admin audit logs.
 */
export const listImportHistory = async (limit = 25) => {
  const pool = getPool();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT a.id, a.admin_user_id, a.entity_id as test_id, a.details, a.created_at,
            u.full_name as admin_name, u.email as admin_email,
            t.title as test_title, t.test_type, t.test_number,
            s.name as subject_name, c.name as chapter_name
     FROM admin_audit_logs a
     LEFT JOIN users u ON a.admin_user_id = u.id
     LEFT JOIN tests t ON a.entity_id = t.id
     LEFT JOIN subjects s ON t.subject_id = s.id
     LEFT JOIN chapters c ON t.chapter_id = c.id
     WHERE a.action = 'BULK_QUESTION_IMPORT'
     ORDER BY a.created_at DESC
     LIMIT $1;`,
    [limit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    adminId: row.admin_user_id,
    adminName: row.admin_name || 'System Administrator',
    adminEmail: row.admin_email || 'admin@primeprep.local',
    testId: row.test_id,
    testTitle: row.test_title || row.details?.title || 'Practice Test',
    testType: row.test_type || row.details?.testType || 'sectional',
    testNumber: row.test_number || row.details?.testNumber || 1,
    subjectName: row.subject_name || row.details?.subjectName || 'General',
    chapterName: row.chapter_name || row.details?.chapterName || 'General',
    filename: row.details?.filename || 'spreadsheet.xlsx',
    importedCount: row.details?.importedCount || 0,
    rejectedCount: row.details?.rejectedCount || 0,
    status: row.details?.importStatus || 'completed',
    timestamp: row.created_at,
  }));
};
