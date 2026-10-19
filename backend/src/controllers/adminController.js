import * as adminRepo from '../repositories/adminRepository.js';

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
    const isAdmin = req.user?.role === 'admin';
    const publishedOnly = !isAdmin || req.query.status === 'published';
    const subjects = await adminRepo.listSubjects({ publishedOnly });

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

    const isAdmin = req.user?.role === 'admin';
    const subject = await adminRepo.getSubjectById(id, { publishedOnly: !isAdmin });
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
    const { name, slug, description, paperCode, displayOrder, publicationStatus, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    // Auto-generate slug from name if omitted
    const finalSlug = (slug && typeof slug === 'string' && slug.trim().length > 0)
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check slug and name uniqueness
    const existingSlug = await adminRepo.getSubjectBySlug(finalSlug);
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: `A subject with slug "${finalSlug}" already exists.`,
      });
    }

    const existingName = await adminRepo.getSubjectByName(name);
    if (existingName) {
      return res.status(409).json({
        success: false,
        message: `A subject with name "${name.trim()}" already exists.`,
      });
    }

    const validStatus = ['draft', 'published', 'archived'];
    const finalStatus = publicationStatus && validStatus.includes(publicationStatus)
      ? publicationStatus
      : (isActive !== undefined && !isActive ? 'archived' : 'published');

    const newSubject = await adminRepo.createSubject({
      name: name.trim(),
      slug: finalSlug,
      description,
      paperCode,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      publicationStatus: finalStatus,
      isActive: finalStatus === 'published',
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

    const { name, slug, description, paperCode, displayOrder, publicationStatus, isActive } = req.body;
    const updatePayload = {};

    if (name !== undefined) {
      const cleanName = name.trim();
      const existingName = await adminRepo.getSubjectByName(cleanName);
      if (existingName && existingName.id !== id) {
        return res.status(409).json({
          success: false,
          message: `A subject with name "${cleanName}" already exists.`,
        });
      }
      updatePayload.name = cleanName;
    }

    if (description !== undefined) updatePayload.description = description;
    if (paperCode !== undefined) updatePayload.paper_code = paperCode;
    if (displayOrder !== undefined) updatePayload.display_order = parseInt(displayOrder, 10);

    if (publicationStatus !== undefined) {
      const valid = ['draft', 'published', 'archived'];
      if (!valid.includes(publicationStatus)) {
        return res.status(400).json({ success: false, message: `Invalid publicationStatus. Allowed: ${valid.join(', ')}` });
      }
      updatePayload.publication_status = publicationStatus;
      updatePayload.is_active = publicationStatus === 'published';
    } else if (isActive !== undefined) {
      updatePayload.is_active = Boolean(isActive);
      updatePayload.publication_status = isActive ? 'published' : 'archived';
    }

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

export const updateSubjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, publicationStatus } = req.body;
    const targetStatus = (publicationStatus || status || '').trim().toLowerCase();

    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
    }

    const valid = ['draft', 'published', 'archived'];
    if (!valid.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${targetStatus}". Allowed values: ${valid.join(', ')}.`,
      });
    }

    const current = await adminRepo.getSubjectById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const updated = await adminRepo.updateSubjectStatus(id, targetStatus);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: `SUBJECT_STATUS_${targetStatus.toUpperCase()}`,
      entityType: 'subject',
      entityId: id,
      details: { previousStatus: current.publication_status, newStatus: targetStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Subject publication status updated to ${targetStatus}.`,
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

    const isAdmin = req.user?.role === 'admin';
    const parentSubject = await adminRepo.getSubjectById(subjectId, { publishedOnly: !isAdmin });
    if (!parentSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const chapters = await adminRepo.listChaptersBySubject(subjectId, { publishedOnly: !isAdmin });
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

    const isAdmin = req.user?.role === 'admin';
    const chapter = await adminRepo.getChapterById(id, { publishedOnly: !isAdmin });
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
    const { name, description, displayOrder, publicationStatus, isActive } = req.body;

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

    // Check duplicate chapter name within the subject
    const existing = await adminRepo.getChapterByNameInSubject(subjectId, name.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A chapter named "${name.trim()}" already exists in this subject.`,
      });
    }

    const validStatus = ['draft', 'published', 'archived'];
    const finalStatus = publicationStatus && validStatus.includes(publicationStatus)
      ? publicationStatus
      : (isActive !== undefined && !isActive ? 'archived' : 'published');

    const newChapter = await adminRepo.createChapter({
      subjectId,
      name: name.trim(),
      description,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
      publicationStatus: finalStatus,
      isActive: finalStatus === 'published',
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

    const { name, description, displayOrder, publicationStatus, isActive, subjectId } = req.body;
    const updatePayload = {};

    if (name !== undefined) {
      const cleanName = name.trim();
      const parentSubjectId = subjectId || current.subject_id;
      const existing = await adminRepo.getChapterByNameInSubject(parentSubjectId, cleanName);
      if (existing && existing.id !== id) {
        return res.status(409).json({
          success: false,
          message: `A chapter named "${cleanName}" already exists in this subject.`,
        });
      }
      updatePayload.name = cleanName;
    }

    if (description !== undefined) updatePayload.description = description;
    if (displayOrder !== undefined) updatePayload.display_order = parseInt(displayOrder, 10);

    if (publicationStatus !== undefined) {
      const valid = ['draft', 'published', 'archived'];
      if (!valid.includes(publicationStatus)) {
        return res.status(400).json({ success: false, message: `Invalid publicationStatus. Allowed: ${valid.join(', ')}` });
      }
      updatePayload.publication_status = publicationStatus;
      updatePayload.is_active = publicationStatus === 'published';
    } else if (isActive !== undefined) {
      updatePayload.is_active = Boolean(isActive);
      updatePayload.publication_status = isActive ? 'published' : 'archived';
    }

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

export const updateChapterStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, publicationStatus } = req.body;
    const targetStatus = (publicationStatus || status || '').trim().toLowerCase();

    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid chapter ID format.' });
    }

    const valid = ['draft', 'published', 'archived'];
    if (!valid.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${targetStatus}". Allowed values: ${valid.join(', ')}.`,
      });
    }

    const current = await adminRepo.getChapterById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const updated = await adminRepo.updateChapterStatus(id, targetStatus);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: `CHAPTER_STATUS_${targetStatus.toUpperCase()}`,
      entityType: 'chapter',
      entityId: id,
      details: { previousStatus: current.publication_status, newStatus: targetStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Chapter publication status updated to ${targetStatus}.`,
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

    const isAdmin = req.user?.role === 'admin';
    const parentChapter = await adminRepo.getChapterById(chapterId, { publishedOnly: !isAdmin });
    if (!parentChapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found.' });
    }

    const { testType, isPublished, status } = req.query;
    const filters = {};
    if (!isAdmin) {
      filters.publishedOnly = true;
    } else {
      if (status === 'published' || isPublished === 'true' || isPublished === true) {
        filters.isPublished = true;
      } else if (status === 'draft' || isPublished === 'false' || isPublished === false) {
        filters.isPublished = false;
      }
    }
    if (testType) filters.testType = testType;

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

    const isAdmin = req.user?.role === 'admin';
    const testItem = await adminRepo.getTestById(id, { publishedOnly: !isAdmin });
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
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Test title is required.' });
    }

    const validTestTypes = ['sectional', 'full_length', 'pyq'];
    if (!validTestTypes.includes(testType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid test type "${testType}". Allowed types: ${validTestTypes.join(', ')}.`,
      });
    }

    const validAccessTypes = ['free', 'paid'];
    if (!validAccessTypes.includes(accessType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid access type "${accessType}". Allowed values: ${validAccessTypes.join(', ')}.`,
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

    const validStatus = ['draft', 'published', 'archived'];
    const finalStatus = publicationStatus && validStatus.includes(publicationStatus)
      ? publicationStatus
      : (isPublished ? 'published' : 'draft');

    if (finalStatus === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish a test with no questions. Please create the test as draft and add questions before publishing.',
      });
    }

    const newTest = await adminRepo.createTest({
      chapterId,
      title: title.trim(),
      description,
      instructions,
      testType: testType.toLowerCase(),
      testNumber: testNumber !== undefined && testNumber !== null ? parseInt(testNumber, 10) : undefined,
      durationMinutes: duration,
      positiveMarks: posMarks,
      negativeMarks: negMarks,
      accessType: accessType.toLowerCase(),
      maxAttempts: parseInt(maxAttempts, 10) || 1,
      publicationStatus: finalStatus,
      isPublished: finalStatus === 'published',
      displayOrder: parseInt(displayOrder, 10) || 0,
    });

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'TEST_CREATED',
      entityType: 'test',
      entityId: newTest.id,
      details: { title: newTest.title, testType, testNumber: newTest.test_number, chapterId },
    });

    return res.status(201).json({
      success: true,
      message: `Test created successfully in ${finalStatus} status.`,
      data: newTest,
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_TEST_NUMBER' || error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_TEST_NUMBER',
          message: error.message || 'A test with this test number already exists in this chapter and category.',
        },
      });
    }
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
      instructions,
      testType,
      testNumber,
      durationMinutes,
      positiveMarks,
      negativeMarks,
      accessType,
      maxAttempts,
      publicationStatus,
      isPublished,
      displayOrder,
      chapterId,
    } = req.body;

    const updatePayload = {};

    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description;
    if (instructions !== undefined) updatePayload.instructions = instructions;

    if (testType !== undefined) {
      const validTestTypes = ['sectional', 'full_length', 'pyq'];
      if (!validTestTypes.includes(testType.toLowerCase())) {
        return res.status(400).json({ success: false, message: `Invalid test type. Allowed: ${validTestTypes.join(', ')}` });
      }
      updatePayload.test_type = testType.toLowerCase();
    }

    if (testNumber !== undefined && testNumber !== null) {
      const num = parseInt(testNumber, 10);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ success: false, message: 'testNumber must be a positive integer.' });
      }
      const targetChapterId = chapterId || current.chapter_id;
      const targetType = (testType || current.test_type).toLowerCase();
      const existing = await adminRepo.getTestByNumberInChapter(targetChapterId, targetType, num);
      if (existing && existing.id !== id) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_TEST_NUMBER',
            message: `Test #${num} already exists in this chapter for category "${targetType}".`,
          },
        });
      }
      updatePayload.test_number = num;
    }

    if (accessType !== undefined) {
      const validAccessTypes = ['free', 'paid'];
      if (!validAccessTypes.includes(accessType.toLowerCase())) {
        return res.status(400).json({ success: false, message: `Invalid access type. Allowed: ${validAccessTypes.join(', ')}` });
      }
      updatePayload.access_type = accessType.toLowerCase();
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

    if (publicationStatus !== undefined) {
      const valid = ['draft', 'published', 'archived'];
      if (!valid.includes(publicationStatus)) {
        return res.status(400).json({ success: false, message: `Invalid publicationStatus. Allowed: ${valid.join(', ')}` });
      }
      updatePayload.publication_status = publicationStatus;
      updatePayload.is_published = publicationStatus === 'published';
    } else if (isPublished !== undefined) {
      updatePayload.is_published = Boolean(isPublished);
      updatePayload.publication_status = isPublished ? 'published' : 'draft';
    }

    const willBePublished =
      updatePayload.publication_status === 'published' || updatePayload.is_published === true;

    if (willBePublished) {
      const qCount = parseInt(current.question_count, 10) || 0;
      if (qCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish a test with no questions. Please add questions before publishing.',
        });
      }
    }

    const updated = await adminRepo.updateTest(id, updatePayload);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'TEST_UPDATED',
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
    if (error.code === 'DUPLICATE_TEST_NUMBER' || error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_TEST_NUMBER',
          message: error.message || 'Duplicate test number within this chapter.',
        },
      });
    }
    next(error);
  }
};

export const updateTestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, publicationStatus } = req.body;
    const targetStatus = (publicationStatus || status || '').trim().toLowerCase();

    if (!adminRepo.isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID format.' });
    }

    const valid = ['draft', 'published', 'archived'];
    if (!valid.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${targetStatus}". Allowed values: ${valid.join(', ')}.`,
      });
    }

    const current = await adminRepo.getTestById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    if (targetStatus === 'published') {
      const qCount = parseInt(current.question_count, 10) || 0;
      if (qCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish a test with no questions. Please add questions before publishing.',
        });
      }
    }

    const updated = await adminRepo.updateTestStatus(id, targetStatus);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: `TEST_STATUS_${targetStatus.toUpperCase()}`,
      entityType: 'test',
      entityId: id,
      details: { previousStatus: current.publication_status, newStatus: targetStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Test publication status updated to ${targetStatus}.`,
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
export const getGlobalTestSeriesSettings = async (req, res, next) => {
  try {
    const settings = await adminRepo.getGlobalTestSeriesSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGlobalTestSeriesSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be a non-empty array of configuration objects (sectional, full_length, pyq).',
      });
    }

    const validTestTypes = ['sectional', 'full_length', 'pyq'];
    for (const item of settings) {
      if (!item.test_type || !validTestTypes.includes(item.test_type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid test_type "${item.test_type}". Allowed types: ${validTestTypes.join(', ')}.`,
        });
      }
      const targetCount = parseInt(item.target_count, 10);
      const defaultDuration = parseInt(item.default_duration_minutes, 10);
      const freeCount = parseInt(item.free_test_count, 10);

      if (isNaN(targetCount) || targetCount < 0) {
        return res.status(400).json({ success: false, message: `target_count for ${item.test_type} must be non-negative.` });
      }
      if (isNaN(defaultDuration) || defaultDuration <= 0) {
        return res.status(400).json({ success: false, message: `default_duration_minutes for ${item.test_type} must be > 0.` });
      }
      if (isNaN(freeCount) || freeCount < 0) {
        return res.status(400).json({ success: false, message: `free_test_count for ${item.test_type} must be non-negative.` });
      }
    }

    const updated = await adminRepo.updateGlobalTestSeriesSettings(settings);

    await adminRepo.recordAuditLog({
      adminUserId: req.user?.id,
      action: 'GLOBAL_TEST_SERIES_SETTINGS_UPDATED',
      entityType: 'test_series_settings',
      entityId: null,
      details: { settings: updated },
    });

    return res.status(200).json({
      success: true,
      message: 'Global test-series default settings updated successfully. Existing tests and attempts are preserved.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

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
