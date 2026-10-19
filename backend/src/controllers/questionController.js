import * as questionRepo from '../repositories/questionRepository.js';
import * as adminRepo from '../repositories/adminRepository.js';
import { parseQuestionsSpreadsheet } from '../utils/excelParser.js';

/**
 * Preview question spreadsheet upload before committing to database.
 * Supports:
 * - multipart/form-data via req.file
 * - application/json with fileBase64
 * - application/json with csvText
 * - application/json with raw questions array
 */
export const previewQuestionImport = async (req, res, next) => {
  try {
    const { testId, subjectId, chapterId, testType } = req.body;

    if (!testId || !adminRepo.isValidUuid(testId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid testId (UUID) must be selected as the import destination.',
      });
    }

    // 1. Verify destination test exists
    const testHierarchy = await questionRepo.getTestWithHierarchy(testId);
    if (!testHierarchy) {
      return res.status(404).json({
        success: false,
        message: 'Destination test not found in database.',
      });
    }

    // 2. Validate destination hierarchy matches if provided
    if (subjectId && testHierarchy.subject_id !== subjectId) {
      return res.status(400).json({
        success: false,
        message: `Destination mismatch: The selected test belongs to subject "${testHierarchy.subject_name}", not the requested subject ID.`,
      });
    }

    if (chapterId && testHierarchy.chapter_id !== chapterId) {
      return res.status(400).json({
        success: false,
        message: `Destination mismatch: The selected test belongs to chapter "${testHierarchy.chapter_name}", not the requested chapter ID.`,
      });
    }

    if (testType && testHierarchy.test_type.toLowerCase() !== testType.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: `Destination mismatch: Selected test category is "${testHierarchy.test_type}", but "${testType}" was specified.`,
      });
    }

    const destination = {
      subjectId: testHierarchy.subject_id,
      subjectName: testHierarchy.subject_name,
      subjectCode: testHierarchy.subject_code || testHierarchy.subject_paper_code,
      chapterId: testHierarchy.chapter_id,
      chapterName: testHierarchy.chapter_name || testHierarchy.chapter_title,
      chapterTitle: testHierarchy.chapter_title || testHierarchy.chapter_name,
      chapterOrder: testHierarchy.chapter_order,
      testId: testHierarchy.id,
      testTitle: testHierarchy.title,
      testType: testHierarchy.test_type,
      testNumber: testHierarchy.test_number,
    };

    // 3. Obtain file buffer or questions array
    let parseResult;

    if (req.file && req.file.buffer) {
      parseResult = parseQuestionsSpreadsheet(req.file.buffer, destination);
    } else if (req.body.fileBase64) {
      const buffer = Buffer.from(req.body.fileBase64, 'base64');
      parseResult = parseQuestionsSpreadsheet(buffer, destination);
    } else if (req.body.csvText) {
      parseResult = parseQuestionsSpreadsheet(req.body.csvText, destination);
    } else if (Array.isArray(req.body.questions)) {
      // Direct JSON questions array
      const rawRows = req.body.questions.map((q) => ({
        Question: q.question || q.questionText,
        'Option A': q.optionA || q.option_a,
        'Option B': q.optionB || q.option_b,
        'Option C': q.optionC || q.option_c,
        'Option D': q.optionD || q.option_d,
        Answer: q.answer || q.correctOption || q.correct_option,
        Solution: q.solution || q.explanation,
        Subject: q.subject,
        Chapter: q.chapter,
        'Test Type': q.testType || q.test_type,
        'Test Number': q.testNumber || q.test_number,
      }));
      // Build a virtual CSV text or use sheet parser
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rawRows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      parseResult = parseQuestionsSpreadsheet(csv, destination);
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please provide an Excel (.xlsx/.xls) or .csv file.',
      });
    }

    // 4. Check for duplicates against existing questions in this test
    const existingQuestions = await questionRepo.getExistingQuestionsInTest(testId);
    const existingTextsMap = new Map();
    for (const eq of existingQuestions) {
      const norm = (eq.question_text || '').toLowerCase().trim().replace(/\s+/g, ' ');
      existingTextsMap.set(norm, eq);
    }

    const duplicatesInTest = [];
    for (const q of parseResult.validQuestions) {
      const norm = q.questionText.toLowerCase().trim().replace(/\s+/g, ' ');
      if (existingTextsMap.has(norm)) {
        duplicatesInTest.push({
          rowNumber: q.rowNumber,
          questionText: q.questionText,
          existingQuestionId: existingTextsMap.get(norm).id,
          existingDisplayOrder: existingTextsMap.get(norm).display_order,
        });
      }
    }

    // Return preview payload
    return res.status(200).json({
      success: true,
      data: {
        destination,
        totalRows: parseResult.totalRows,
        validCount: parseResult.validCount,
        invalidCount: parseResult.invalidCount,
        preview: parseResult.validQuestions.slice(0, 5),
        validationErrors: parseResult.validationErrors,
        internalDuplicates: parseResult.internalDuplicates,
        existingQuestionsInTest: existingQuestions.length,
        isDuplicateWarning: duplicatesInTest.length > 0,
        duplicateCount: duplicatesInTest.length,
        duplicatesInTest: duplicatesInTest.slice(0, 10),
        // Send all valid questions to allow the client to confirm
        validQuestions: parseResult.validQuestions,
      },
    });
  } catch (error) {
    if (error.code === 'MISSING_QUESTION_COLUMN' || error.code === 'MISSING_OPTION_COLUMNS' || error.code === 'MISSING_ANSWER_COLUMN') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    next(error);
  }
};

/**
 * Confirm and atomically insert validated questions into database.
 */
export const confirmQuestionImport = async (req, res, next) => {
  try {
    const {
      testId,
      questions,
      subjectId,
      chapterId,
      testType,
      overridePositiveMarks,
      overrideNegativeMarks,
      allowDuplicates,
    } = req.body;

    if (!testId || !adminRepo.isValidUuid(testId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid testId (UUID) is required to commit the import.',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions provided for import.',
      });
    }

    // 1. Re-verify destination test in database
    const testHierarchy = await questionRepo.getTestWithHierarchy(testId);
    if (!testHierarchy) {
      return res.status(404).json({
        success: false,
        message: 'Destination test not found.',
      });
    }

    // 2. Validate destination hierarchy match
    if (subjectId && testHierarchy.subject_id !== subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Destination subject mismatch during confirmation.',
      });
    }

    if (chapterId && testHierarchy.chapter_id !== chapterId) {
      return res.status(400).json({
        success: false,
        message: 'Destination chapter mismatch during confirmation.',
      });
    }

    if (testType && testHierarchy.test_type.toLowerCase() !== testType.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Destination test type mismatch during confirmation.',
      });
    }

    // 3. Server-side validation of every single question
    const sanitizedQuestions = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const rowNum = q.rowNumber || (i + 1);

      const qText = (q.questionText || q.question_text || q.question || '').trim();
      const optA = (q.optionA || q.option_a || '').trim();
      const optB = (q.optionB || q.option_b || '').trim();
      const optC = (q.optionC || q.option_c || '').trim();
      const optD = (q.optionD || q.option_d || '').trim();
      const ans = (q.correctOption || q.correct_option || q.answer || '').trim().toUpperCase();
      const expl = (q.explanation || q.solution || '').trim();

      if (!qText) errors.push(`Row ${rowNum}: Question text is empty.`);
      if (!optA) errors.push(`Row ${rowNum}: Option A is empty.`);
      if (!optB) errors.push(`Row ${rowNum}: Option B is empty.`);
      if (!optC) errors.push(`Row ${rowNum}: Option C is empty.`);
      if (!optD) errors.push(`Row ${rowNum}: Option D is empty.`);
      if (!['A', 'B', 'C', 'D'].includes(ans)) {
        errors.push(`Row ${rowNum}: Answer must be A, B, C, or D (got "${ans}").`);
      }

      sanitizedQuestions.push({
        questionText: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption: ans,
        explanation: expl || null,
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed for ${errors.length} item(s). Import cancelled.`,
        errors: errors.slice(0, 15),
      });
    }

    // 4. Duplicate safety check
    if (!allowDuplicates) {
      const existing = await questionRepo.getExistingQuestionsInTest(testId);
      const existingMap = new Set(existing.map((e) => e.question_text.toLowerCase().trim().replace(/\s+/g, ' ')));
      const dupes = sanitizedQuestions.filter((q) => existingMap.has(q.questionText.toLowerCase().trim().replace(/\s+/g, ' ')));

      if (dupes.length > 0 && dupes.length === sanitizedQuestions.length) {
        return res.status(409).json({
          success: false,
          code: 'ALL_QUESTIONS_DUPLICATE',
          message: `All ${dupes.length} question(s) already exist in this test. Duplicate import prevented. Check "Allow Duplicates" if intentional.`,
        });
      }
    }

    // 5. Execute atomic transaction
    const result = await questionRepo.bulkImportQuestionsAtomic({
      testId,
      questions: sanitizedQuestions,
      adminUserId: req.user?.id,
      overridePositiveMarks,
      overrideNegativeMarks,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${result.importedCount} question(s) into ${testHierarchy.title}.`,
      data: {
        subjectName: testHierarchy.subject_name,
        chapterName: testHierarchy.chapter_name || testHierarchy.chapter_title,
        testCategory: testHierarchy.test_type,
        testNumber: testHierarchy.test_number,
        testTitle: testHierarchy.title,
        questionsImported: result.importedCount,
        totalQuestionsInTest: result.totalQuestionsInTest,
        importStatus: 'completed',
        displayOrderRange: `${result.firstOrder} to ${result.lastOrder}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all questions for a specific test (administrator view).
 */
export const getTestQuestions = async (req, res, next) => {
  try {
    const { testId } = req.params;

    if (!adminRepo.isValidUuid(testId)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    const test = await questionRepo.getTestWithHierarchy(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const questions = await questionRepo.getTestQuestionsForAdmin(testId);

    return res.status(200).json({
      success: true,
      data: {
        test: {
          id: test.id,
          title: test.title,
          testType: test.test_type,
          testNumber: test.test_number,
          subjectName: test.subject_name,
          chapterName: test.chapter_name || test.chapter_title,
          totalQuestions: questions.length,
          positiveMarks: test.positive_marks,
          negativeMarks: test.negative_marks,
        },
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List questions with search, pagination, and filters (subject, chapter, test, category).
 */
export const listQuestions = async (req, res, next) => {
  try {
    const { subjectId, chapterId, testId, testType, search, limit, offset } = req.query;

    const result = await questionRepo.listQuestions({
      subjectId,
      chapterId,
      testId,
      testType,
      search,
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single question by ID.
 */
export const getQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID format.' });
    }

    const question = await questionRepo.getQuestionById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a question's text, options, correct answer, explanation, or marks.
 */
export const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID format.' });
    }

    const current = await questionRepo.getQuestionById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      positiveMarks,
      negativeMarks,
    } = req.body;

    if (questionText !== undefined && (!questionText || typeof questionText !== 'string' || !questionText.trim())) {
      return res.status(400).json({ success: false, message: 'Question text cannot be empty.' });
    }
    if (optionA !== undefined && (!optionA || typeof optionA !== 'string' || !optionA.trim())) {
      return res.status(400).json({ success: false, message: 'Option A cannot be empty.' });
    }
    if (optionB !== undefined && (!optionB || typeof optionB !== 'string' || !optionB.trim())) {
      return res.status(400).json({ success: false, message: 'Option B cannot be empty.' });
    }
    if (optionC !== undefined && (!optionC || typeof optionC !== 'string' || !optionC.trim())) {
      return res.status(400).json({ success: false, message: 'Option C cannot be empty.' });
    }
    if (optionD !== undefined && (!optionD || typeof optionD !== 'string' || !optionD.trim())) {
      return res.status(400).json({ success: false, message: 'Option D cannot be empty.' });
    }
    if (correctOption !== undefined) {
      const cleanAns = String(correctOption).trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(cleanAns)) {
        return res.status(400).json({ success: false, message: 'Correct answer must be A, B, C, or D.' });
      }
    }

    const updated = await questionRepo.updateQuestion(id, {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      positiveMarks,
      negativeMarks,
    });

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'QUESTION_UPDATED',
      entityType: 'question',
      entityId: id,
      details: { questionText: updated.question_text?.substring(0, 80) },
    });

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a question safely (preventing deletion if historical student attempts exist).
 */
export const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID format.' });
    }

    const current = await questionRepo.getQuestionById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const result = await questionRepo.deleteQuestion(id);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'QUESTION_DELETED',
      entityType: 'question',
      entityId: id,
      details: { testId: result.testId, questionText: current.question_text?.substring(0, 80) },
    });

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully.',
      data: result,
    });
  } catch (error) {
    if (error.code === 'QUESTION_HAS_ATTEMPTS') {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Reorder questions within a test.
 */
export const reorderTestQuestions = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { orderedQuestionIds } = req.body;

    if (!adminRepo.isValidUuid(testId)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    if (!Array.isArray(orderedQuestionIds) || orderedQuestionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedQuestionIds must be an array of question UUIDs.',
      });
    }

    const result = await questionRepo.reorderTestQuestions(testId, orderedQuestionIds);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'QUESTIONS_REORDERED',
      entityType: 'test',
      entityId: testId,
      details: { count: orderedQuestionIds.length },
    });

    return res.status(200).json({
      success: true,
      message: 'Questions reordered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
