import * as adminRepo from '../repositories/adminRepository.js';
import { query } from '../config/db.js';

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
export const getStats = async (req, res, next) => {
  try {
    const stats = await adminRepo.getDashboardStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. SUBJECTS
// ==========================================
export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await adminRepo.listSubjects();
    return res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const subject = await adminRepo.getSubjectById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const { name, slug, description, displayOrder, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    // Auto-generate slug from name if omitted
    const finalSlug = (slug && typeof slug === 'string' && slug.trim().length > 0)
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existing = await adminRepo.getSubjectBySlug(finalSlug);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A subject with slug "${finalSlug}" already exists.`,
      });
    }

    const newSubject = await adminRepo.createSubject({
      name,
      slug: finalSlug,
      description,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'SUBJECT_CREATED',
      entityType: 'subject',
      entityId: newSubject.id,
      details: { name: newSubject.name, slug: newSubject.slug },
    });

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: newSubject,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const current = await adminRepo.getSubjectById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const { name, slug, description, displayOrder, isActive } = req.body;
    const updatePayload = {};

    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description;
    if (displayOrder !== undefined) updatePayload.display_order = parseInt(displayOrder, 10);
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    if (slug !== undefined) {
      const cleanSlug = slug.trim().toLowerCase();
      const existing = await adminRepo.getSubjectBySlug(cleanSlug);
      if (existing && existing.id !== id) {
        return res.status(409).json({
          success: false,
          message: `A subject with slug "${cleanSlug}" already exists.`,
        });
      }
      updatePayload.slug = cleanSlug;
    }

    const updated = await adminRepo.updateSubject(id, updatePayload);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'SUBJECT_UPDATED',
      entityType: 'subject',
      entityId: id,
      details: updatePayload,
    });

    return res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const current = await adminRepo.getSubjectById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const deleted = await adminRepo.deleteSubject(id);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'SUBJECT_DELETED',
      entityType: 'subject',
      entityId: id,
      details: { name: current.name, slug: current.slug },
    });

    return res.status(200).json({
      success: true,
      message: 'Subject deleted successfully.',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. CHAPTERS
// ==========================================
export const getChaptersBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    if (!adminRepo.isValidUuid(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const chapters = await adminRepo.listChaptersBySubject(subjectId);
    return res.status(200).json({
      success: true,
      data: chapters,
    });
  } catch (error) {
    next(error);
  }
};

export const getChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const chapter = await adminRepo.getChapterById(id);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    return res.status(200).json({
      success: true,
      data: chapter,
    });
  } catch (error) {
    next(error);
  }
};

export const createChapter = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { name, description, displayOrder, isActive } = req.body;

    if (!adminRepo.isValidUuid(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const subject = await adminRepo.getSubjectById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Parent subject not found.' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Chapter name is required.' });
    }

    const newChapter = await adminRepo.createChapter({
      subjectId,
      name,
      description,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'CHAPTER_CREATED',
      entityType: 'chapter',
      entityId: newChapter.id,
      details: { name: newChapter.name, subjectId },
    });

    return res.status(201).json({
      success: true,
      message: 'Chapter created successfully.',
      data: newChapter,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const current = await adminRepo.getChapterById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const { name, description, displayOrder, isActive, subjectId } = req.body;
    const updatePayload = {};

    if (name !== undefined) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description;
    if (displayOrder !== undefined) updatePayload.display_order = parseInt(displayOrder, 10);
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    if (subjectId !== undefined) {
      if (!adminRepo.isValidUuid(subjectId)) {
        return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
      }
      const subject = await adminRepo.getSubjectById(subjectId);
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Target parent subject not found.' });
      }
      updatePayload.subject_id = subjectId;
    }

    const updated = await adminRepo.updateChapter(id, updatePayload);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'CHAPTER_UPDATED',
      entityType: 'chapter',
      entityId: id,
      details: updatePayload,
    });

    return res.status(200).json({
      success: true,
      message: 'Chapter updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const current = await adminRepo.getChapterById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const deleted = await adminRepo.deleteChapter(id);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'CHAPTER_DELETED',
      entityType: 'chapter',
      entityId: id,
      details: { name: current.name },
    });

    return res.status(200).json({
      success: true,
      message: 'Chapter deleted successfully.',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. TESTS
// ==========================================
export const getTestsByChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    if (!adminRepo.isValidUuid(chapterId)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const { testType, isPublished } = req.query;
    const filters = {};
    if (testType) filters.testType = testType;
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';

    const tests = await adminRepo.listTestsByChapter(chapterId, filters);
    return res.status(200).json({
      success: true,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

export const getTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    const testItem = await adminRepo.getTestById(id);
    if (!testItem) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    return res.status(200).json({
      success: true,
      data: testItem,
    });
  } catch (error) {
    next(error);
  }
};

export const createTest = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    if (!adminRepo.isValidUuid(chapterId)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const chapter = await adminRepo.getChapterById(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Parent chapter not found.' });
    }

    const {
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
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Test title is required.' });
    }

    const validTestTypes = ['sectional', 'full_length', 'pyq'];
    if (!validTestTypes.includes(testType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid test type. Allowed types: ${validTestTypes.join(', ')}.`,
      });
    }

    const validAccessTypes = ['free', 'paid'];
    if (!validAccessTypes.includes(accessType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid access type. Allowed values: ${validAccessTypes.join(', ')}.`,
      });
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: 'durationMinutes must be a positive integer.' });
    }

    const posMarks = parseFloat(positiveMarks);
    if (isNaN(posMarks) || posMarks < 0) {
      return res.status(400).json({ success: false, message: 'positiveMarks must be non-negative.' });
    }

    const negMarks = parseFloat(negativeMarks);
    if (isNaN(negMarks) || negMarks < 0) {
      return res.status(400).json({ success: false, message: 'negativeMarks must be non-negative.' });
    }

    // A newly created test starts with 0 questions, so it cannot be published immediately
    if (isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a test directly in published status without questions. Please create as draft and map questions before publishing.',
      });
    }

    const newTest = await adminRepo.createTest({
      chapterId,
      title,
      description,
      testType,
      durationMinutes: duration,
      positiveMarks: posMarks,
      negativeMarks: negMarks,
      accessType,
      maxAttempts: parseInt(maxAttempts, 10) || 1,
      isPublished: false,
      displayOrder: parseInt(displayOrder, 10) || 0,
    });

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'TEST_CREATED',
      entityType: 'test',
      entityId: newTest.id,
      details: { title: newTest.title, testType, chapterId },
    });

    return res.status(201).json({
      success: true,
      message: 'Test created successfully as draft.',
      data: newTest,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    const current = await adminRepo.getTestById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const {
      title,
      description,
      testType,
      durationMinutes,
      positiveMarks,
      negativeMarks,
      accessType,
      maxAttempts,
      isPublished,
      displayOrder,
      chapterId,
    } = req.body;

    const updatePayload = {};

    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description;

    if (testType !== undefined) {
      const validTestTypes = ['sectional', 'full_length', 'pyq'];
      if (!validTestTypes.includes(testType)) {
        return res.status(400).json({ success: false, message: `Invalid test type. Allowed: ${validTestTypes.join(', ')}` });
      }
      updatePayload.test_type = testType;
    }

    if (accessType !== undefined) {
      const validAccessTypes = ['free', 'paid'];
      if (!validAccessTypes.includes(accessType)) {
        return res.status(400).json({ success: false, message: `Invalid access type. Allowed: ${validAccessTypes.join(', ')}` });
      }
      updatePayload.access_type = accessType;
    }

    if (durationMinutes !== undefined) {
      const duration = parseInt(durationMinutes, 10);
      if (isNaN(duration) || duration <= 0) {
        return res.status(400).json({ success: false, message: 'durationMinutes must be a positive integer.' });
      }
      updatePayload.duration_minutes = duration;
    }

    if (positiveMarks !== undefined) {
      const posMarks = parseFloat(positiveMarks);
      if (isNaN(posMarks) || posMarks < 0) {
        return res.status(400).json({ success: false, message: 'positiveMarks must be non-negative.' });
      }
      updatePayload.positive_marks = posMarks;
    }

    if (negativeMarks !== undefined) {
      const negMarks = parseFloat(negativeMarks);
      if (isNaN(negMarks) || negMarks < 0) {
        return res.status(400).json({ success: false, message: 'negativeMarks must be non-negative.' });
      }
      updatePayload.negative_marks = negMarks;
    }

    if (maxAttempts !== undefined) {
      const attempts = parseInt(maxAttempts, 10);
      if (isNaN(attempts) || attempts <= 0) {
        return res.status(400).json({ success: false, message: 'maxAttempts must be a positive integer.' });
      }
      updatePayload.max_attempts = attempts;
    }

    if (displayOrder !== undefined) {
      updatePayload.display_order = parseInt(displayOrder, 10) || 0;
    }

    if (chapterId !== undefined) {
      if (!adminRepo.isValidUuid(chapterId)) {
        return res.status(400).json({ success: false, message: 'Invalid target chapter ID format.' });
      }
      const chapter = await adminRepo.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Target chapter not found.' });
      }
      updatePayload.chapter_id = chapterId;
    }

    // CRITICAL VALIDATION: Check publication rules
    if (isPublished === true || (isPublished === 'true')) {
      const questionCheck = await query(
        `SELECT COUNT(*)::int as count FROM test_questions WHERE test_id = $1;`,
        [id]
      );
      const questionCount = questionCheck.rows[0]?.count || 0;

      if (questionCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish a test with no questions. Please map questions to the test before publishing.',
        });
      }
      updatePayload.is_published = true;
    } else if (isPublished === false || (isPublished === 'false')) {
      updatePayload.is_published = false;
    }

    const updated = await adminRepo.updateTest(id, updatePayload);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: updatePayload.is_published !== undefined 
        ? (updatePayload.is_published ? 'TEST_PUBLISHED' : 'TEST_UNPUBLISHED')
        : 'TEST_UPDATED',
      entityType: 'test',
      entityId: id,
      details: updatePayload,
    });

    return res.status(200).json({
      success: true,
      message: 'Test updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    const current = await adminRepo.getTestById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const deleted = await adminRepo.deleteTest(id);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'TEST_DELETED',
      entityType: 'test',
      entityId: id,
      details: { title: current.title },
    });

    return res.status(200).json({
      success: true,
      message: 'Test deleted successfully.',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. TEST SERIES SETTINGS / QUOTAS
// ==========================================
export const getChapterSettings = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    if (!adminRepo.isValidUuid(chapterId)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const chapter = await adminRepo.getChapterById(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const settings = await adminRepo.getChapterSettingsWithActuals(chapterId);
    return res.status(200).json({
      success: true,
      data: {
        chapter,
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateChapterSettings = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    if (!adminRepo.isValidUuid(chapterId)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const chapter = await adminRepo.getChapterById(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const { settings } = req.body;
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ success: false, message: 'Settings must be a non-empty array of configuration objects.' });
    }

    const validTestTypes = ['sectional', 'full_length', 'pyq'];
    const updatedResults = [];

    for (const item of settings) {
      if (!validTestTypes.includes(item.test_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid test_type "${item.test_type}". Must be sectional, full_length, or pyq.`,
        });
      }

      const targetCount = parseInt(item.target_count, 10);
      const defaultDuration = parseInt(item.default_duration_minutes, 10);
      const freeCount = parseInt(item.free_test_count, 10);

      if (isNaN(targetCount) || targetCount < 0) {
        return res.status(400).json({ success: false, message: `target_count for ${item.test_type} must be a non-negative integer.` });
      }
      if (isNaN(defaultDuration) || defaultDuration <= 0) {
        return res.status(400).json({ success: false, message: `default_duration_minutes for ${item.test_type} must be greater than 0.` });
      }
      if (isNaN(freeCount) || freeCount < 0) {
        return res.status(400).json({ success: false, message: `free_test_count for ${item.test_type} must be a non-negative integer.` });
      }

      const updated = await adminRepo.updateChapterSetting({
        chapterId,
        testType: item.test_type,
        targetCount,
        defaultDurationMinutes: defaultDuration,
        defaultPositiveMarks: parseFloat(item.default_positive_marks) || 4.0,
        defaultNegativeMarks: parseFloat(item.default_negative_marks) || 1.0,
        freeTestCount: freeCount,
      });
      updatedResults.push(updated);
    }

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'CHAPTER_SETTINGS_UPDATED',
      entityType: 'chapter',
      entityId: chapterId,
      details: { settings: updatedResults },
    });

    const refreshed = await adminRepo.getChapterSettingsWithActuals(chapterId);

    return res.status(200).json({
      success: true,
      message: 'Chapter test quotas and settings updated successfully.',
      data: {
        chapter,
        settings: refreshed,
      },
    });
  } catch (error) {
    next(error);
  }
};
