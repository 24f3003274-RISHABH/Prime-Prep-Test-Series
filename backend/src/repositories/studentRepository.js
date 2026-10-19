import { getPool } from '../config/db.js';

/**
 * List all published subjects with chapter and published test counts.
 */
export const listPublishedSubjects = async () => {
  const pool = getPool();
  const query = `
    SELECT s.id, s.name, s.slug, s.description, s.code, s.paper_code,
           s.display_order, s.created_at,
           COUNT(DISTINCT c.id)::int AS chapter_count,
           COUNT(DISTINCT t.id)::int AS test_count
    FROM subjects s
    LEFT JOIN chapters c ON s.id = c.subject_id AND (c.publication_status = 'published' OR c.is_active = true)
    LEFT JOIN tests t ON s.id = t.subject_id AND (t.publication_status = 'published' OR t.is_published = true)
    WHERE s.publication_status = 'published' OR s.is_active = true
    GROUP BY s.id
    ORDER BY s.display_order ASC, s.name ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

/**
 * List published chapters for a subject.
 */
export const listPublishedChapters = async (subjectId) => {
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
    WHERE c.subject_id = $1 AND (c.publication_status = 'published' OR c.is_active = true)
    GROUP BY c.id, s.name
    ORDER BY c.display_order ASC, c.name ASC;
  `;
  const res = await pool.query(query, [subjectId]);
  return res.rows;
};

/**
 * List published tests filtered by subject, chapter, or category, with student's latest attempt status.
 */
export const listPublishedTests = async ({ subjectId, chapterId, testType, studentId }) => {
  const pool = getPool();
  const params = [];
  let paramIdx = 1;

  let whereClause = `WHERE (t.publication_status = 'published' OR t.is_published = true)`;

  if (subjectId) {
    whereClause += ` AND t.subject_id = $${paramIdx++}`;
    params.push(subjectId);
  }

  if (chapterId) {
    whereClause += ` AND t.chapter_id = $${paramIdx++}`;
    params.push(chapterId);
  }

  if (testType && testType !== 'ALL') {
    whereClause += ` AND t.test_type = $${paramIdx++}`;
    params.push(testType.toLowerCase());
  }

  let attemptSelect = '';
  let attemptJoin = '';
  if (studentId) {
    attemptSelect = `,
      latest_att.id AS latest_attempt_id,
      latest_att.status AS latest_attempt_status,
      latest_att.score AS latest_attempt_score,
      latest_att.submitted_at AS latest_attempt_submitted_at,
      latest_att.started_at AS latest_attempt_started_at,
      (SELECT COUNT(*)::int FROM attempts a_count WHERE a_count.test_id = t.id AND a_count.user_id = $${paramIdx++}) AS student_attempt_count
    `;
    params.push(studentId);

    attemptJoin = `
      LEFT JOIN LATERAL (
        SELECT id, status, score, submitted_at, started_at
        FROM attempts
        WHERE test_id = t.id AND user_id = $${paramIdx - 1}
        ORDER BY created_at DESC
        LIMIT 1
      ) latest_att ON true
    `;
  }

  const query = `
    SELECT t.id, t.subject_id, t.chapter_id, t.title, t.slug, t.description,
           t.test_type, t.test_number, t.duration_minutes, t.positive_marks, t.negative_marks,
           t.access_type, t.max_attempts, t.publication_status, t.is_published, t.display_order,
           s.name AS subject_name, s.code AS subject_code, s.paper_code AS subject_paper_code,
           c.name AS chapter_name, c.title AS chapter_title,
           COUNT(tq.id)::int AS question_count
           ${attemptSelect}
    FROM tests t
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    LEFT JOIN test_questions tq ON t.id = tq.test_id
    ${attemptJoin}
    ${whereClause}
    GROUP BY t.id, s.id, s.name, s.code, s.paper_code, c.id, c.name, c.title
             ${studentId ? ', latest_att.id, latest_att.status, latest_att.score, latest_att.submitted_at, latest_att.started_at' : ''}
    ORDER BY t.test_type ASC, COALESCE(t.test_number, t.display_order) ASC, t.title ASC;
  `;

  const res = await pool.query(query, params);
  return res.rows;
};

/**
 * Get comprehensive test instructions and metadata.
 */
export const getTestInstructions = async (testId, studentId) => {
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
    GROUP BY t.id, s.id, s.name, s.code, s.paper_code, c.id, c.name, c.title;
  `;
  const res = await pool.query(query, [testId]);
  if (res.rowCount === 0) return null;

  const test = res.rows[0];
  const qCount = parseInt(test.question_count, 10) || 0;
  const posMarks = parseFloat(test.positive_marks) || 4.0;
  const negMarks = parseFloat(test.negative_marks) || 1.0;
  const totalMarks = (qCount * posMarks).toFixed(2);

  let activeAttempt = null;
  let previousAttemptsCount = 0;

  if (studentId) {
    const attRes = await pool.query(
      `SELECT id, status, started_at, submitted_at, score,
              EXTRACT(EPOCH FROM (NOW() - started_at))::int as seconds_elapsed
       FROM attempts
       WHERE test_id = $1 AND user_id = $2
       ORDER BY created_at DESC;`,
      [testId, studentId]
    );
    previousAttemptsCount = attRes.rowCount;
    const inProgress = attRes.rows.find((a) => a.status === 'in_progress');
    if (inProgress) {
      const allowedSecs = (test.duration_minutes || 60) * 60;
      if (inProgress.seconds_elapsed < allowedSecs) {
        activeAttempt = {
          id: inProgress.id,
          status: inProgress.status,
          startedAt: inProgress.started_at,
          remainingSeconds: Math.max(0, allowedSecs - inProgress.seconds_elapsed),
        };
      }
    }
  }

  return {
    ...test,
    total_marks: totalMarks,
    positive_marks: posMarks,
    negative_marks: negMarks,
    active_attempt: activeAttempt,
    previous_attempts_count: previousAttemptsCount,
  };
};

/**
 * Start or resume a test attempt.
 */
export const startTestAttempt = async (testId, studentId) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch test
    const testRes = await client.query(
      `SELECT t.*, s.name AS subject_name, c.name AS chapter_name,
              COUNT(tq.id)::int AS question_count
       FROM tests t
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN chapters c ON t.chapter_id = c.id
       LEFT JOIN test_questions tq ON t.id = tq.test_id
       WHERE t.id = $1
       GROUP BY t.id, s.name, c.name;`,
      [testId]
    );

    if (testRes.rowCount === 0) {
      const err = new Error('Test not found in database.');
      err.statusCode = 404;
      throw err;
    }

    const test = testRes.rows[0];

    const isPublished = test.publication_status === 'published' || test.is_published === true;
    if (!isPublished) {
      const err = new Error('This test is not published yet.');
      err.statusCode = 403;
      throw err;
    }

    const qCount = parseInt(test.question_count, 10);
    if (qCount === 0) {
      const err = new Error('This test has no questions assigned yet.');
      err.statusCode = 400;
      throw err;
    }

    const durationSeconds = (test.duration_minutes || 60) * 60;

    // 2. Check for existing in_progress attempt
    const existingAtt = await client.query(
      `SELECT id, status, started_at,
              EXTRACT(EPOCH FROM (NOW() - started_at))::int AS elapsed_seconds
       FROM attempts
       WHERE test_id = $1 AND user_id = $2 AND status = 'in_progress'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE;`,
      [testId, studentId]
    );

    let attemptId;
    let startedAt;
    let remainingSeconds;

    if (existingAtt.rowCount > 0) {
      const att = existingAtt.rows[0];
      const elapsed = att.elapsed_seconds || 0;

      if (elapsed < durationSeconds) {
        // Resume existing active attempt
        attemptId = att.id;
        startedAt = att.started_at;
        remainingSeconds = Math.max(0, durationSeconds - elapsed);
      } else {
        // Auto-close expired attempt
        await client.query(
          `UPDATE attempts SET status = 'expired', submitted_at = started_at + interval '${durationSeconds} seconds' WHERE id = $1;`,
          [att.id]
        );
      }
    }

    // 3. If no active attempt, check max_attempts
    if (!attemptId) {
      const maxAttempts = test.max_attempts || 1;
      const completedAtts = await client.query(
        `SELECT COUNT(*)::int AS count FROM attempts WHERE test_id = $1 AND user_id = $2;`,
        [testId, studentId]
      );
      if (completedAtts.rows[0].count >= maxAttempts) {
        const err = new Error(`You have reached the maximum allowed attempts (${maxAttempts}) for this test.`);
        err.statusCode = 403;
        err.code = 'MAX_ATTEMPTS_EXCEEDED';
        throw err;
      }

      // Create new attempt
      const newAtt = await client.query(
        `INSERT INTO attempts (user_id, test_id, started_at, status, total_questions, created_at, updated_at)
         VALUES ($1, $2, NOW(), 'in_progress', $3, NOW(), NOW())
         RETURNING id, started_at;`,
        [studentId, testId, qCount]
      );
      attemptId = newAtt.rows[0].id;
      startedAt = newAtt.rows[0].started_at;
      remainingSeconds = durationSeconds;
    }

    // 4. Fetch questions without correct_option or explanation
    const questionsRes = await client.query(
      `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
              tq.display_order,
              COALESCE(tq.positive_marks, t.positive_marks) AS positive_marks,
              COALESCE(tq.negative_marks, t.negative_marks) AS negative_marks,
              tq.section_name
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       JOIN tests t ON tq.test_id = t.id
       WHERE tq.test_id = $1
       ORDER BY tq.display_order ASC;`,
      [testId]
    );

    // 5. Fetch any existing answers saved for this attempt
    const answersRes = await client.query(
      `SELECT question_id, selected_option, is_marked_for_review, visited
       FROM attempt_answers
       WHERE attempt_id = $1;`,
      [attemptId]
    );

    await client.query('COMMIT');

    const answersMap = {};
    for (const ans of answersRes.rows) {
      answersMap[ans.question_id] = {
        selectedOption: ans.selected_option,
        isMarkedForReview: ans.is_marked_for_review,
        visited: ans.visited,
      };
    }

    return {
      attemptId,
      test: {
        id: test.id,
        title: test.title,
        subjectName: test.subject_name,
        chapterName: test.chapter_name,
        testType: test.test_type,
        testNumber: test.test_number,
        durationMinutes: test.duration_minutes,
        positiveMarks: test.positive_marks,
        negativeMarks: test.negative_marks,
        totalQuestions: qCount,
      },
      startedAt,
      remainingSeconds,
      questions: questionsRes.rows.map((q) => ({
        id: q.id,
        displayOrder: q.display_order,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        positiveMarks: q.positive_marks,
        negativeMarks: q.negative_marks,
        sectionName: q.section_name,
      })),
      savedResponses: answersMap,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get attempt state for the active exam interface.
 */
export const getAttemptForExam = async (attemptId, studentId) => {
  const pool = getPool();

  const attRes = await pool.query(
    `SELECT a.id, a.user_id, a.test_id, a.started_at, a.submitted_at, a.status,
            a.total_questions, a.attempted_questions, a.score,
            EXTRACT(EPOCH FROM (NOW() - a.started_at))::int AS elapsed_seconds,
            t.title AS test_title, t.duration_minutes, t.positive_marks, t.negative_marks,
            t.test_type, t.test_number,
            s.name AS subject_name, c.name AS chapter_name
     FROM attempts a
     JOIN tests t ON a.test_id = t.id
     JOIN subjects s ON t.subject_id = s.id
     LEFT JOIN chapters c ON t.chapter_id = c.id
     WHERE a.id = $1;`,
    [attemptId]
  );

  if (attRes.rowCount === 0) {
    const err = new Error('Attempt not found.');
    err.statusCode = 404;
    throw err;
  }

  const attempt = attRes.rows[0];

  if (attempt.user_id !== studentId) {
    const err = new Error('Unauthorized: You cannot access another student’s attempt.');
    err.statusCode = 403;
    throw err;
  }

  const durationSeconds = (attempt.duration_minutes || 60) * 60;
  const elapsed = attempt.elapsed_seconds || 0;
  const remainingSeconds = Math.max(0, durationSeconds - elapsed);

  // If time expired while still in_progress, automatically submit
  if (attempt.status === 'in_progress' && remainingSeconds === 0) {
    return await submitTestAttempt({ attemptId, studentId, isAutoTimeout: true });
  }

  // If already submitted or expired, return with status flag
  if (attempt.status !== 'in_progress') {
    return {
      attemptId: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      score: attempt.score,
      testId: attempt.test_id,
      isCompleted: true,
    };
  }

  // Fetch questions without answers or explanations
  const questionsRes = await pool.query(
    `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
            tq.display_order,
            COALESCE(tq.positive_marks, t.positive_marks) AS positive_marks,
            COALESCE(tq.negative_marks, t.negative_marks) AS negative_marks,
            tq.section_name
     FROM test_questions tq
     JOIN questions q ON tq.question_id = q.id
     JOIN tests t ON tq.test_id = t.id
     WHERE tq.test_id = $1
     ORDER BY tq.display_order ASC;`,
    [attempt.test_id]
  );

  // Fetch saved responses
  const answersRes = await pool.query(
    `SELECT question_id, selected_option, is_marked_for_review, visited
     FROM attempt_answers
     WHERE attempt_id = $1;`,
    [attemptId]
  );

  const answersMap = {};
  for (const ans of answersRes.rows) {
    answersMap[ans.question_id] = {
      selectedOption: ans.selected_option,
      isMarkedForReview: ans.is_marked_for_review,
      visited: ans.visited,
    };
  }

  return {
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.started_at,
    remainingSeconds,
    test: {
      id: attempt.test_id,
      title: attempt.test_title,
      subjectName: attempt.subject_name,
      chapterName: attempt.chapter_name,
      testType: attempt.test_type,
      testNumber: attempt.test_number,
      durationMinutes: attempt.duration_minutes,
      positiveMarks: attempt.positive_marks,
      negativeMarks: attempt.negative_marks,
      totalQuestions: attempt.total_questions,
    },
    questions: questionsRes.rows.map((q) => ({
      id: q.id,
      displayOrder: q.display_order,
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      positiveMarks: q.positive_marks,
      negativeMarks: q.negative_marks,
      sectionName: q.section_name,
    })),
    savedResponses: answersMap,
    isCompleted: false,
  };
};

/**
 * Save an individual question response during the test.
 */
export const saveQuestionResponse = async ({
  attemptId,
  studentId,
  questionId,
  selectedOption,
  isMarkedForReview,
  visited = true,
}) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify attempt ownership and in_progress status
    const attRes = await client.query(
      `SELECT a.id, a.user_id, a.test_id, a.started_at, a.status,
              t.duration_minutes,
              EXTRACT(EPOCH FROM (NOW() - a.started_at))::int AS elapsed_seconds
       FROM attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.id = $1
       FOR UPDATE;`,
      [attemptId]
    );

    if (attRes.rowCount === 0) {
      const err = new Error('Attempt not found.');
      err.statusCode = 404;
      throw err;
    }

    const attempt = attRes.rows[0];

    if (attempt.user_id !== studentId) {
      const err = new Error('Unauthorized: You cannot modify another student’s attempt.');
      err.statusCode = 403;
      throw err;
    }

    if (attempt.status !== 'in_progress') {
      const err = new Error(`Cannot save answer: This attempt is already ${attempt.status}.`);
      err.statusCode = 400;
      throw err;
    }

    const durationSeconds = (attempt.duration_minutes || 60) * 60;
    if ((attempt.elapsed_seconds || 0) > durationSeconds + 10) {
      // Allow 10s grace for network latency before rejecting
      const err = new Error('Examination duration has expired. Answers can no longer be modified.');
      err.statusCode = 400;
      err.code = 'EXAM_TIME_EXPIRED';
      throw err;
    }

    // 2. Validate question belongs to this test
    const qCheck = await client.query(
      `SELECT id FROM test_questions WHERE test_id = $1 AND question_id = $2;`,
      [attempt.test_id, questionId]
    );

    if (qCheck.rowCount === 0) {
      const err = new Error('Invalid question: Question does not belong to this test.');
      err.statusCode = 400;
      throw err;
    }

    // Sanitize option
    const cleanOpt = selectedOption && ['A', 'B', 'C', 'D'].includes(String(selectedOption).toUpperCase())
      ? String(selectedOption).toUpperCase()
      : null;

    const cleanReview = Boolean(isMarkedForReview);
    const cleanVisited = Boolean(visited);

    // 3. Upsert answer in attempt_answers
    await client.query(
      `INSERT INTO attempt_answers (
         attempt_id, question_id, selected_option, is_marked_for_review, visited, answered_at, updated_at
       )
       VALUES ($1, $2, $3::varchar, $4, $5, CASE WHEN $3::text IS NOT NULL THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (attempt_id, question_id) DO UPDATE
       SET selected_option = EXCLUDED.selected_option,
           is_marked_for_review = EXCLUDED.is_marked_for_review,
           visited = EXCLUDED.visited,
           answered_at = CASE WHEN EXCLUDED.selected_option IS NOT NULL THEN NOW() ELSE attempt_answers.answered_at END,
           updated_at = NOW();`,
      [attemptId, questionId, cleanOpt, cleanReview, cleanVisited]
    );

    // 4. Update attempted_questions count on attempt
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS attempted
       FROM attempt_answers
       WHERE attempt_id = $1 AND selected_option IS NOT NULL;`,
      [attemptId]
    );

    await client.query(
      `UPDATE attempts SET attempted_questions = $1, updated_at = NOW() WHERE id = $2;`,
      [countRes.rows[0].attempted, attemptId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      questionId,
      selectedOption: cleanOpt,
      isMarkedForReview: cleanReview,
      visited: cleanVisited,
      attemptedCount: countRes.rows[0].attempted,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Submit test attempt, calculate score server-side, and save final statistics.
 */
export const submitTestAttempt = async ({ attemptId, studentId, isAutoTimeout = false }) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch attempt and test with lock
    const attRes = await client.query(
      `SELECT a.*, t.duration_minutes, t.positive_marks, t.negative_marks, t.title AS test_title,
              t.test_type, t.test_number,
              s.name AS subject_name, c.name AS chapter_name,
              EXTRACT(EPOCH FROM (NOW() - a.started_at))::int AS elapsed_seconds
       FROM attempts a
       JOIN tests t ON a.test_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN chapters c ON t.chapter_id = c.id
       WHERE a.id = $1
       FOR UPDATE OF a;`,
      [attemptId]
    );

    if (attRes.rowCount === 0) {
      const err = new Error('Attempt not found.');
      err.statusCode = 404;
      throw err;
    }

    const attempt = attRes.rows[0];

    if (attempt.user_id !== studentId) {
      const err = new Error('Unauthorized: You cannot submit another student’s attempt.');
      err.statusCode = 403;
      throw err;
    }

    // Idempotent: If already submitted, return the calculated result
    if (attempt.status === 'submitted' || attempt.status === 'expired') {
      await client.query('COMMIT');
      return await getAttemptResult({ attemptId, studentId });
    }

    // 2. Fetch all test questions with correct options and mark schemes
    const testQuestionsRes = await client.query(
      `SELECT tq.question_id, tq.display_order,
              COALESCE(tq.positive_marks, t.positive_marks, 4.0) AS positive_marks,
              COALESCE(tq.negative_marks, t.negative_marks, 1.0) AS negative_marks,
              q.correct_option, q.question_text
       FROM test_questions tq
       JOIN tests t ON tq.test_id = t.id
       JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = $1
       ORDER BY tq.display_order ASC;`,
      [attempt.test_id]
    );

    // 3. Fetch student saved responses
    const responsesRes = await client.query(
      `SELECT question_id, selected_option, is_marked_for_review
       FROM attempt_answers
       WHERE attempt_id = $1;`,
      [attemptId]
    );

    const responsesMap = new Map();
    for (const r of responsesRes.rows) {
      responsesMap.set(r.question_id, r);
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalScore = 0;

    // 4. Evaluate each question
    for (const tq of testQuestionsRes.rows) {
      const resp = responsesMap.get(tq.question_id);
      const selected = resp && resp.selected_option ? resp.selected_option.toUpperCase() : null;
      const correct = tq.correct_option ? tq.correct_option.toUpperCase() : null;
      const pos = parseFloat(tq.positive_marks);
      const neg = parseFloat(tq.negative_marks);

      let isCorrect = null;
      let marksAwarded = 0;

      if (!selected) {
        unansweredCount++;
        marksAwarded = 0;
        isCorrect = false;
      } else if (selected === correct) {
        correctCount++;
        marksAwarded = pos;
        isCorrect = true;
        totalScore += pos;
      } else {
        incorrectCount++;
        marksAwarded = -neg;
        isCorrect = false;
        totalScore -= neg;
      }

      // Upsert evaluation into attempt_answers
      await client.query(
        `INSERT INTO attempt_answers (
           attempt_id, question_id, selected_option, is_correct, marks_awarded, is_marked_for_review, answered_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (attempt_id, question_id) DO UPDATE
         SET is_correct = EXCLUDED.is_correct,
             marks_awarded = EXCLUDED.marks_awarded,
             updated_at = NOW();`,
        [
          attemptId,
          tq.question_id,
          selected,
          isCorrect,
          marksAwarded,
          resp ? resp.is_marked_for_review : false,
        ]
      );
    }

    const attemptedCount = correctCount + incorrectCount;
    const totalQuestions = testQuestionsRes.rowCount;
    const durationSeconds = (attempt.duration_minutes || 60) * 60;
    const timeTaken = Math.min(attempt.elapsed_seconds || 0, durationSeconds);
    const finalStatus = isAutoTimeout ? 'expired' : 'submitted';

    // 5. Update attempt record with authoritative score and status
    await client.query(
      `UPDATE attempts
       SET status = $1,
           submitted_at = NOW(),
           total_questions = $2,
           attempted_questions = $3,
           correct_answers = $4,
           incorrect_answers = $5,
           unanswered_questions = $6,
           score = $7,
           time_taken_seconds = $8,
           updated_at = NOW()
       WHERE id = $9;`,
      [
        finalStatus,
        totalQuestions,
        attemptedCount,
        correctCount,
        incorrectCount,
        unansweredCount,
        totalScore,
        timeTaken,
        attemptId,
      ]
    );

    await client.query('COMMIT');

    // 6. Return finalized result with revealed answers & solutions
    return await getAttemptResult({ attemptId, studentId });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get finalized attempt results with question-by-question review & solutions.
 */
export const getAttemptResult = async ({ attemptId, studentId }) => {
  const pool = getPool();

  const attRes = await pool.query(
    `SELECT a.id, a.user_id, a.test_id, a.started_at, a.submitted_at, a.status,
            a.total_questions, a.attempted_questions, a.correct_answers,
            a.incorrect_answers, a.unanswered_questions, a.score, a.time_taken_seconds,
            t.title AS test_title, t.test_type, t.test_number, t.duration_minutes,
            t.positive_marks, t.negative_marks,
            s.name AS subject_name, c.name AS chapter_name
     FROM attempts a
     JOIN tests t ON a.test_id = t.id
     JOIN subjects s ON t.subject_id = s.id
     LEFT JOIN chapters c ON t.chapter_id = c.id
     WHERE a.id = $1;`,
    [attemptId]
  );

  if (attRes.rowCount === 0) {
    const err = new Error('Attempt not found.');
    err.statusCode = 404;
    throw err;
  }

  const attempt = attRes.rows[0];

  if (attempt.user_id !== studentId) {
    const err = new Error('Unauthorized: You can only view your own results.');
    err.statusCode = 403;
    throw err;
  }

  if (attempt.status === 'in_progress') {
    const err = new Error('This attempt is still in progress and has not been submitted.');
    err.statusCode = 400;
    throw err;
  }

  const posDefault = parseFloat(attempt.positive_marks) || 4.0;
  const maxPossibleMarks = (attempt.total_questions * posDefault).toFixed(2);
  const accuracy = attempt.attempted_questions > 0
    ? ((attempt.correct_answers / attempt.attempted_questions) * 100).toFixed(1)
    : '0.0';

  // Fetch question-by-question review with REVEALED correct answers and explanations
  const reviewRes = await pool.query(
    `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
            q.correct_option, q.explanation,
            tq.display_order,
            COALESCE(tq.positive_marks, t.positive_marks) AS positive_marks,
            COALESCE(tq.negative_marks, t.negative_marks) AS negative_marks,
            aa.selected_option, aa.is_correct, aa.marks_awarded, aa.is_marked_for_review
     FROM test_questions tq
     JOIN tests t ON tq.test_id = t.id
     JOIN questions q ON tq.question_id = q.id
     LEFT JOIN attempt_answers aa ON aa.attempt_id = $1 AND aa.question_id = q.id
     WHERE tq.test_id = $2
     ORDER BY tq.display_order ASC;`,
    [attemptId, attempt.test_id]
  );

  return {
    attemptId: attempt.id,
    testId: attempt.test_id,
    testTitle: attempt.test_title,
    subjectName: attempt.subject_name,
    chapterName: attempt.chapter_name,
    testType: attempt.test_type,
    testNumber: attempt.test_number,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    status: attempt.status,
    totalQuestions: attempt.total_questions,
    attemptedQuestions: attempt.attempted_questions,
    unansweredQuestions: attempt.unanswered_questions,
    correctAnswers: attempt.correct_answers,
    incorrectAnswers: attempt.incorrect_answers,
    score: parseFloat(attempt.score) || 0,
    maxPossibleMarks: parseFloat(maxPossibleMarks),
    accuracyPercentage: parseFloat(accuracy),
    timeTakenSeconds: attempt.time_taken_seconds || 0,
    questions: reviewRes.rows.map((q) => ({
      id: q.id,
      displayOrder: q.display_order,
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      selectedOption: q.selected_option || null,
      correctOption: q.correct_option,
      isCorrect: q.is_correct === true,
      isAttempted: Boolean(q.selected_option),
      marksAwarded: parseFloat(q.marks_awarded) || 0,
      positiveMarks: parseFloat(q.positive_marks) || 4.0,
      negativeMarks: parseFloat(q.negative_marks) || 1.0,
      explanation: q.explanation || null,
      isMarkedForReview: Boolean(q.is_marked_for_review),
    })),
  };
};

/**
 * List all past attempts for a student.
 */
export const listStudentAttempts = async (studentId) => {
  const pool = getPool();
  const query = `
    SELECT a.id, a.test_id, a.started_at, a.submitted_at, a.status,
           a.total_questions, a.attempted_questions, a.correct_answers,
           a.incorrect_answers, a.unanswered_questions, a.score, a.time_taken_seconds,
           t.title AS test_title, t.test_type, t.test_number, t.duration_minutes,
           t.positive_marks, t.negative_marks,
           s.name AS subject_name, c.name AS chapter_name
    FROM attempts a
    JOIN tests t ON a.test_id = t.id
    JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN chapters c ON t.chapter_id = c.id
    WHERE a.user_id = $1
    ORDER BY a.started_at DESC;
  `;
  const res = await pool.query(query, [studentId]);
  return res.rows.map((a) => {
    const pos = parseFloat(a.positive_marks) || 4.0;
    const maxMarks = a.total_questions * pos;
    const accuracy = a.attempted_questions > 0
      ? ((a.correct_answers / a.attempted_questions) * 100).toFixed(1)
      : '0.0';

    return {
      id: a.id,
      testId: a.test_id,
      testTitle: a.test_title,
      subjectName: a.subject_name,
      chapterName: a.chapter_name,
      testType: a.test_type,
      testNumber: a.test_number,
      status: a.status,
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      totalQuestions: a.total_questions,
      attemptedQuestions: a.attempted_questions,
      correctAnswers: a.correct_answers,
      incorrectAnswers: a.incorrect_answers,
      score: a.score !== null ? parseFloat(a.score) : null,
      maxPossibleMarks: maxMarks,
      accuracyPercentage: parseFloat(accuracy),
      timeTakenSeconds: a.time_taken_seconds,
    };
  });
};
