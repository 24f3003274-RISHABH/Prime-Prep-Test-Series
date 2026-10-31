import * as studentRepo from '../repositories/studentRepository.js';
import * as userRepo from '../repositories/userRepository.js';

export const getPublishedSubjects = async (req, res, next) => {
  try {
    const subjects = await studentRepo.listPublishedSubjects();
    res.json({
      success: true,
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getPublishedChapters = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const chapters = await studentRepo.listPublishedChapters(subjectId);
    res.json({
      success: true,
      data: chapters,
    });
  } catch (err) {
    next(err);
  }
};

export const getPublishedTests = async (req, res, next) => {
  try {
    const { subjectId, chapterId, category } = req.query;
    const studentId = req.user?.id || null;

    const tests = await studentRepo.listPublishedTests({
      subjectId,
      chapterId,
      testType: category,
      studentId,
    });

    res.json({
      success: true,
      data: tests,
    });
  } catch (err) {
    next(err);
  }
};

export const getTestInstructions = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const studentId = req.user?.id || null;

    const test = await studentRepo.getTestInstructions(testId, studentId);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found.',
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

export const startTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to start a test.',
      });
    }

    const session = await studentRepo.startTestAttempt(testId, studentId);

    res.status(200).json({
      success: true,
      message: 'Test attempt started.',
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

export const getAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    const attempt = await studentRepo.getAttemptForExam(attemptId, studentId);

    res.json({
      success: true,
      data: attempt,
    });
  } catch (err) {
    next(err);
  }
};

export const saveResponse = async (req, res, next) => {
  try {
    const { attemptId, questionId } = req.params;
    const { selectedOption, isMarkedForReview, visited } = req.body;
    const studentId = req.user?.id;

    const result = await studentRepo.saveQuestionResponse({
      attemptId,
      studentId,
      questionId,
      selectedOption,
      isMarkedForReview,
      visited,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const submitAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    const result = await studentRepo.submitTestAttempt({
      attemptId,
      studentId,
      isAutoTimeout: false,
    });

    res.json({
      success: true,
      message: 'Test submitted successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getAttemptResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    const result = await studentRepo.getAttemptResult({
      attemptId,
      studentId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentAttempts = async (req, res, next) => {
  try {
    const studentId = req.user?.id;
    const attempts = await studentRepo.listStudentAttempts(studentId);

    res.json({
      success: true,
      data: attempts,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const studentId = req.user?.id;
    const profile = await userRepo.getProfileWithStats(studentId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.user?.id;
    const { fullName, targetSubjectCode, phone } = req.body;

    const updated = await userRepo.updateProfile(studentId, {
      fullName: fullName?.trim() || undefined,
      targetSubjectCode: targetSubjectCode?.trim() || undefined,
      phone: phone?.trim() || undefined,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

