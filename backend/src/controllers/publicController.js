import * as publicRepo from '../repositories/publicRepository.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await publicRepo.getPublicStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await publicRepo.getPublicSubjects();
    res.json({
      success: true,
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getChapters = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const chapters = await publicRepo.getPublicChapters(subjectId);
    res.json({
      success: true,
      data: chapters,
    });
  } catch (err) {
    next(err);
  }
};

export const getTests = async (req, res, next) => {
  try {
    const { subjectId, chapterId, category, accessType, search, page, limit } = req.query;
    const result = await publicRepo.getPublicTests({
      subjectId,
      chapterId,
      category,
      accessType,
      search,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.tests,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getTestDetails = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!testId || !UUID_REGEX.test(testId)) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or not published.',
      });
    }

    const test = await publicRepo.getPublicTestById(testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or not published.',
      });
    }

    res.json({
      success: true,
      data: test,
    });
  } catch (err) {
    next(err);
  }
};

export const getFeaturedFreeTest = async (req, res, next) => {
  try {
    const test = await publicRepo.getFeaturedFreeTest();
    res.json({
      success: true,
      data: test,
    });
  } catch (err) {
    next(err);
  }
};
