import * as XLSX from 'xlsx';

/**
 * Normalizes a header string for flexible column matching.
 * e.g. "Option A" -> "option a", "Correct_Option" -> "correct option"
 */
export const normalizeHeaderKey = (header) => {
  if (!header || typeof header !== 'string') return '';
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Maps spreadsheet headers to standardized question fields.
 */
export const identifyColumns = (headers = []) => {
  const map = {
    question: null,
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    answer: null,
    solution: null,
    subject: null,
    chapter: null,
    testType: null,
    testNumber: null,
  };

  for (const raw of headers) {
    const norm = normalizeHeaderKey(raw);

    // Question
    if (['question', 'question text', 'questiontext', 'questions', 'q text'].includes(norm)) {
      map.question = raw;
    }
    // Option A
    else if (['option a', 'optiona', 'opt a', 'option 1', 'option1', 'a'].includes(norm) && !map.optionA) {
      map.optionA = raw;
    }
    // Option B
    else if (['option b', 'optionb', 'opt b', 'option 2', 'option2', 'b'].includes(norm) && !map.optionB) {
      map.optionB = raw;
    }
    // Option C
    else if (['option c', 'optionc', 'opt c', 'option 3', 'option3', 'c'].includes(norm) && !map.optionC) {
      map.optionC = raw;
    }
    // Option D
    else if (['option d', 'optiond', 'opt d', 'option 4', 'option4', 'd'].includes(norm) && !map.optionD) {
      map.optionD = raw;
    }
    // Answer
    else if (['answer', 'correct answer', 'correct option', 'ans', 'correct', 'correctoption'].includes(norm)) {
      map.answer = raw;
    }
    // Solution / Explanation
    else if (['solution', 'explanation', 'solutions', 'sol', 'expl', 'rationale'].includes(norm)) {
      map.solution = raw;
    }
    // Subject (optional)
    else if (['subject', 'subject name', 'subjectname', 'subject code'].includes(norm)) {
      map.subject = raw;
    }
    // Chapter (optional)
    else if (['chapter', 'chapter name', 'chaptername'].includes(norm)) {
      map.chapter = raw;
    }
    // Test Type (optional)
    else if (['test type', 'testtype', 'category', 'test category'].includes(norm)) {
      map.testType = raw;
    }
    // Test Number (optional)
    else if (['test number', 'testnumber', 'test no', 'test #', 'testno'].includes(norm)) {
      map.testNumber = raw;
    }
  }

  return map;
};

/**
 * Normalizes test type string from spreadsheet to 'sectional' | 'full_length' | 'pyq'
 */
export const normalizeTestType = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase().replace(/[\s_\-]+/g, '');
  if (s.includes('sectional') || s === 'section') return 'sectional';
  if (s.includes('full') || s.includes('length') || s === 'mock') return 'full_length';
  if (s.includes('pyq') || s.includes('past') || s.includes('previous')) return 'pyq';
  return s;
};

/**
 * Parse Excel Buffer or CSV String into validated structured questions
 */
export const parseQuestionsSpreadsheet = (bufferOrText, destination = null) => {
  let workbook;

  try {
    if (typeof bufferOrText === 'string') {
      workbook = XLSX.read(bufferOrText, { type: 'string', raw: false });
    } else if (Buffer.isBuffer(bufferOrText)) {
      workbook = XLSX.read(bufferOrText, { type: 'buffer', raw: false });
    } else {
      throw new Error('Unsupported input type for spreadsheet parser.');
    }
  } catch (err) {
    const error = new Error(`Failed to parse file: ${err.message}`);
    error.code = 'SPREADSHEET_PARSE_ERROR';
    error.statusCode = 400;
    throw error;
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    const error = new Error('Spreadsheet has no worksheets.');
    error.code = 'EMPTY_SPREADSHEET';
    error.statusCode = 400;
    throw error;
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert worksheet to JSON rows with headers
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  if (!rawRows || rawRows.length === 0) {
    const error = new Error('Spreadsheet contains no data rows.');
    error.code = 'EMPTY_SPREADSHEET_ROWS';
    error.statusCode = 400;
    throw error;
  }

  const headers = Object.keys(rawRows[0] || {});
  const colMap = identifyColumns(headers);

  // Requirement: Reject spreadsheet with missing Question column
  if (!colMap.question) {
    const error = new Error('Spreadsheet is missing required "Question" column. Found columns: ' + headers.join(', '));
    error.code = 'MISSING_QUESTION_COLUMN';
    error.statusCode = 400;
    throw error;
  }

  // Requirement: Reject spreadsheet if none of the option columns are found
  if (!colMap.optionA && !colMap.optionB && !colMap.optionC && !colMap.optionD) {
    const error = new Error('Spreadsheet is missing option columns (Option A, Option B, Option C, Option D).');
    error.code = 'MISSING_OPTION_COLUMNS';
    error.statusCode = 400;
    throw error;
  }

  if (!colMap.answer) {
    const error = new Error('Spreadsheet is missing required "Answer" column.');
    error.code = 'MISSING_ANSWER_COLUMN';
    error.statusCode = 400;
    throw error;
  }

  const validQuestions = [];
  const validationErrors = [];
  const questionTextMap = new Map(); // for intra-file duplicate detection
  const internalDuplicates = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 2; // Physical Excel row number (Row 1 is headers)
    const rowErrors = [];

    const rawQuestion = colMap.question ? String(row[colMap.question] || '').trim() : '';
    const rawOptA = colMap.optionA ? String(row[colMap.optionA] || '').trim() : '';
    const rawOptB = colMap.optionB ? String(row[colMap.optionB] || '').trim() : '';
    const rawOptC = colMap.optionC ? String(row[colMap.optionC] || '').trim() : '';
    const rawOptD = colMap.optionD ? String(row[colMap.optionD] || '').trim() : '';
    const rawAnswer = colMap.answer ? String(row[colMap.answer] || '').trim().toUpperCase() : '';
    const rawSolution = colMap.solution ? String(row[colMap.solution] || '').trim() : '';

    // Metadata columns (optional)
    const rawSubject = colMap.subject ? String(row[colMap.subject] || '').trim() : '';
    const rawChapter = colMap.chapter ? String(row[colMap.chapter] || '').trim() : '';
    const rawTestType = colMap.testType ? String(row[colMap.testType] || '').trim() : '';
    const rawTestNumber = colMap.testNumber ? String(row[colMap.testNumber] || '').trim() : '';

    // 1. Question text validation
    if (!rawQuestion) {
      rowErrors.push('Question text is required and cannot be empty.');
    }

    // 2. Options validation (All 4 options must be present)
    if (!rawOptA) rowErrors.push('Option A is required and cannot be empty.');
    if (!rawOptB) rowErrors.push('Option B is required and cannot be empty.');
    if (!rawOptC) rowErrors.push('Option C is required and cannot be empty.');
    if (!rawOptD) rowErrors.push('Option D is required and cannot be empty.');

    // 3. Answer validation (must be A, B, C, or D)
    let cleanAnswer = rawAnswer;
    // Allow minor variations e.g. "OPTION A" -> "A", "A." -> "A", "(A)" -> "A"
    const match = cleanAnswer.match(/\b([A-D])\b/i);
    if (match) {
      cleanAnswer = match[1].toUpperCase();
    }

    if (!['A', 'B', 'C', 'D'].includes(cleanAnswer)) {
      rowErrors.push(`Answer must be A, B, C, or D (received "${rawAnswer || 'empty'}").`);
    }

    // 4. Metadata destination validation (Reject if metadata conflicts with selected destination)
    if (destination) {
      if (rawSubject) {
        const destSubjectName = (destination.subjectName || '').toLowerCase().trim();
        const destSubjectCode = (destination.subjectCode || '').toLowerCase().trim();
        const subLower = rawSubject.toLowerCase().trim();
        if (destSubjectName && !subLower.includes(destSubjectName) && !destSubjectName.includes(subLower) && subLower !== destSubjectCode) {
          rowErrors.push(`Subject "${rawSubject}" does not match selected subject "${destination.subjectName}".`);
        }
      }

      if (rawChapter) {
        const destChapterName = (destination.chapterName || '').toLowerCase().trim();
        const destChapterTitle = (destination.chapterTitle || '').toLowerCase().trim();
        const chapLower = rawChapter.toLowerCase().trim();

        // Check exact or substring name match
        const matchesName =
          (destChapterName && (destChapterName.includes(chapLower) || chapLower.includes(destChapterName))) ||
          (destChapterTitle && (destChapterTitle.includes(chapLower) || chapLower.includes(destChapterTitle)));

        // Check chapter number match (e.g. "Chapter 1" or "1" matching chapterOrder = 1)
        const chapDigits = chapLower.match(/\d+/);
        const destOrderDigits = destination.chapterOrder !== undefined && destination.chapterOrder !== null
          ? String(destination.chapterOrder)
          : null;
        const matchesNumber = Boolean(
          chapDigits && (
            (destOrderDigits && chapDigits[0] === destOrderDigits) ||
            destChapterTitle.includes(chapDigits[0]) ||
            destChapterName.includes(chapDigits[0])
          )
        );

        if (!matchesName && !matchesNumber) {
          rowErrors.push(`Chapter "${rawChapter}" does not match selected chapter "${destination.chapterName}".`);
        }
      }

      if (rawTestType) {
        const rowNormType = normalizeTestType(rawTestType);
        const destNormType = normalizeTestType(destination.testType);
        if (destNormType && rowNormType !== destNormType) {
          rowErrors.push(`Test type "${rawTestType}" does not match selected test category "${destination.testType}".`);
        }
      }

      if (rawTestNumber) {
        const rowDigits = String(rawTestNumber).match(/\d+/);
        const rowNumInt = rowDigits ? parseInt(rowDigits[0], 10) : parseInt(rawTestNumber, 10);
        const destNumInt = destination.testNumber !== undefined && destination.testNumber !== null
          ? parseInt(destination.testNumber, 10)
          : null;

        if (destNumInt !== null && !isNaN(rowNumInt) && rowNumInt !== destNumInt) {
          rowErrors.push(`Test number "${rawTestNumber}" does not match selected test number "${destination.testNumber}".`);
        }
      }
    }

    // Check for duplicate questions inside the spreadsheet itself
    if (rawQuestion) {
      const normalizedQText = rawQuestion.toLowerCase().replace(/\s+/g, ' ');
      if (questionTextMap.has(normalizedQText)) {
        internalDuplicates.push({
          row: rowNum,
          firstOccurrenceRow: questionTextMap.get(normalizedQText),
          questionText: rawQuestion.substring(0, 80),
        });
      } else {
        questionTextMap.set(normalizedQText, rowNum);
      }
    }

    if (rowErrors.length > 0) {
      validationErrors.push({
        row: rowNum,
        questionPreview: rawQuestion ? rawQuestion.substring(0, 100) : '[Empty question]',
        errors: rowErrors,
      });
    } else {
      validQuestions.push({
        rowNumber: rowNum,
        questionText: rawQuestion,
        optionA: rawOptA,
        optionB: rawOptB,
        optionC: rawOptC,
        optionD: rawOptD,
        correctOption: cleanAnswer,
        explanation: rawSolution || null,
        metadata: {
          subject: rawSubject || null,
          chapter: rawChapter || null,
          testType: rawTestType || null,
          testNumber: rawTestNumber || null,
        },
      });
    }
  }

  return {
    totalRows: rawRows.length,
    validCount: validQuestions.length,
    invalidCount: validationErrors.length,
    validQuestions,
    validationErrors,
    internalDuplicates,
    headers,
    detectedColumns: colMap,
  };
};
