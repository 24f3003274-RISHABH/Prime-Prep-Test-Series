import React, { useState, useEffect } from 'react';
import {
  getSubjects,
  createSubject,
  updateSubject,
  updateSubjectStatus,
  deleteSubject,
  getChaptersBySubject,
  createChapter,
  updateChapter,
  updateChapterStatus,
  deleteChapter,
  getTestsByChapter,
  createTest,
  updateTest,
  updateTestStatus,
  deleteTest,
  getTestQuestions,
} from '../api/client.js';

const CATEGORY_LIMITS = {
  sectional: 15,
  full_length: 10,
  pyq: 5,
};

export default function AdminHierarchyManager() {
  // Navigation / Selection State
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [tests, setTests] = useState([]);
  const [testCategoryFilter, setTestCategoryFilter] = useState('ALL');

  // Loading & Feedback
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Creation & Editing States for Subjects
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', slug: '', paperCode: '', description: '', displayOrder: 0 });

  // Creation & Editing States for Chapters
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({ name: '', description: '', displayOrder: 1 });

  // Creation & Editing States for Tests
  const [showAddTest, setShowAddTest] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState({
    title: '',
    testType: 'sectional',
    testNumber: 1,
    durationMinutes: 45,
    positiveMarks: 4,
    negativeMarks: 1,
    description: '',
    maxAttempts: 1,
  });

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Test Preview Modal State
  const [previewTest, setPreviewTest] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const showMsg = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 6000);
  };

  // ==========================================
  // 1. SUBJECTS MANAGEMENT
  // ==========================================
  const loadSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const data = await getSubjects();
      setSubjects(data || []);
      if (data && data.length > 0 && !selectedSubject) {
        handleSelectSubject(data[0]);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to load subjects', 'error');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSelectSubject = async (subj) => {
    setSelectedSubject(subj);
    setSelectedChapter(null);
    setTests([]);
    setLoadingChapters(true);
    try {
      const data = await getChaptersBySubject(subj.id);
      setChapters(data || []);
      if (data && data.length > 0) {
        handleSelectChapter(data[0]);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to load chapters', 'error');
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    try {
      const newSubj = await createSubject({
        name: subjectForm.name.trim(),
        slug: subjectForm.slug.trim() || undefined,
        paperCode: subjectForm.paperCode.trim().toUpperCase() || undefined,
        description: subjectForm.description.trim() || undefined,
        displayOrder: parseInt(subjectForm.displayOrder, 10) || 0,
        publicationStatus: 'published',
      });
      showMsg(`Subject "${newSubj.name}" created successfully!`);
      setShowAddSubject(false);
      setSubjectForm({ name: '', slug: '', paperCode: '', description: '', displayOrder: 0 });
      await loadSubjects();
      handleSelectSubject(newSubj);
    } catch (err) {
      showMsg(err.message || 'Failed to create subject', 'error');
    }
  };

  const startEditSubject = (subj) => {
    setEditingSubject(subj);
    setSubjectForm({
      name: subj.name,
      slug: subj.slug || '',
      paperCode: subj.paper_code || subj.code || '',
      description: subj.description || '',
      displayOrder: subj.display_order || 0,
    });
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject || !subjectForm.name.trim()) return;
    try {
      await updateSubject(editingSubject.id, {
        name: subjectForm.name.trim(),
        slug: subjectForm.slug.trim() || undefined,
        paperCode: subjectForm.paperCode.trim().toUpperCase() || undefined,
        description: subjectForm.description.trim() || undefined,
        displayOrder: parseInt(subjectForm.displayOrder, 10) || 0,
      });
      showMsg(`Subject "${subjectForm.name}" updated successfully!`);
      setEditingSubject(null);
      await loadSubjects();
    } catch (err) {
      showMsg(err.message || 'Failed to update subject', 'error');
    }
  };

  const handleToggleSubjectStatus = async (subj) => {
    const nextStatus = subj.publication_status === 'published' ? 'draft' : 'published';
    try {
      await updateSubjectStatus(subj.id, nextStatus);
      showMsg(`Subject "${subj.name}" status updated to ${nextStatus}.`);
      loadSubjects();
    } catch (err) {
      showMsg(err.message || 'Failed to update subject status', 'error');
    }
  };

  const handleDeleteSubject = async (subjId) => {
    try {
      await deleteSubject(subjId);
      showMsg('Subject deleted successfully.');
      setDeleteConfirmation(null);
      setSelectedSubject(null);
      setSelectedChapter(null);
      setTests([]);
      loadSubjects();
    } catch (err) {
      showMsg(err.message || 'Failed to delete subject', 'error');
      setDeleteConfirmation(null);
    }
  };

  // ==========================================
  // 2. CHAPTERS MANAGEMENT
  // ==========================================
  const handleSelectChapter = async (chap) => {
    setSelectedChapter(chap);
    setLoadingTests(true);
    try {
      const data = await getTestsByChapter(chap.id);
      setTests(data || []);
    } catch (err) {
      showMsg(err.message || 'Failed to load tests', 'error');
    } finally {
      setLoadingTests(false);
    }
  };

  const handleCreateChapter = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !chapterForm.name.trim()) return;
    try {
      const newChap = await createChapter(selectedSubject.id, {
        name: chapterForm.name.trim(),
        description: chapterForm.description.trim() || undefined,
        displayOrder: parseInt(chapterForm.displayOrder, 10) || 1,
        publicationStatus: 'published',
      });
      showMsg(`Chapter "${newChap.name}" created under ${selectedSubject.name}!`);
      setShowAddChapter(false);
      setChapterForm({ name: '', description: '', displayOrder: chapters.length + 1 });
      const refreshed = await getChaptersBySubject(selectedSubject.id);
      setChapters(refreshed || []);
      handleSelectChapter(newChap);
    } catch (err) {
      showMsg(err.message || 'Failed to create chapter', 'error');
    }
  };

  const startEditChapter = (chap) => {
    setEditingChapter(chap);
    setChapterForm({
      name: chap.name || chap.title || '',
      description: chap.description || '',
      displayOrder: chap.display_order || 1,
    });
  };

  const handleUpdateChapter = async (e) => {
    e.preventDefault();
    if (!editingChapter || !chapterForm.name.trim()) return;
    try {
      await updateChapter(editingChapter.id, {
        name: chapterForm.name.trim(),
        description: chapterForm.description.trim() || undefined,
        displayOrder: parseInt(chapterForm.displayOrder, 10) || 1,
      });
      showMsg(`Chapter "${chapterForm.name}" updated successfully!`);
      setEditingChapter(null);
      const refreshed = await getChaptersBySubject(selectedSubject.id);
      setChapters(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update chapter', 'error');
    }
  };

  const handleToggleChapterStatus = async (chap) => {
    const nextStatus = chap.publication_status === 'published' ? 'draft' : 'published';
    try {
      await updateChapterStatus(chap.id, nextStatus);
      showMsg(`Chapter "${chap.name || chap.title}" status updated to ${nextStatus}.`);
      const refreshed = await getChaptersBySubject(selectedSubject.id);
      setChapters(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update chapter status', 'error');
    }
  };

  const handleDeleteChapter = async (chapId) => {
    try {
      await deleteChapter(chapId);
      showMsg('Chapter deleted successfully.');
      setDeleteConfirmation(null);
      setSelectedChapter(null);
      setTests([]);
      if (selectedSubject) {
        const refreshed = await getChaptersBySubject(selectedSubject.id);
        setChapters(refreshed || []);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to delete chapter', 'error');
      setDeleteConfirmation(null);
    }
  };

  // ==========================================
  // 3. TESTS MANAGEMENT
  // ==========================================
  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!selectedChapter || !testForm.title.trim()) return;

    // Validate limit for category
    const cat = testForm.testType;
    const maxLimit = CATEGORY_LIMITS[cat] || 15;
    const num = parseInt(testForm.testNumber, 10);
    if (num < 1 || num > maxLimit) {
      showMsg(`Test number for ${cat.replace('_', ' ')} must be between 1 and ${maxLimit}.`, 'error');
      return;
    }

    try {
      const newTest = await createTest(selectedChapter.id, {
        title: testForm.title.trim(),
        testType: testForm.testType,
        testNumber: num,
        durationMinutes: parseInt(testForm.durationMinutes, 10) || 45,
        positiveMarks: parseFloat(testForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(testForm.negativeMarks) || 1.0,
        description: testForm.description.trim() || undefined,
        maxAttempts: parseInt(testForm.maxAttempts, 10) || 1,
        publicationStatus: 'draft',
      });
      showMsg(`Test "${newTest.title}" created in draft status! Add questions before publishing.`);
      setShowAddTest(false);
      setTestForm({
        title: '',
        testType: 'sectional',
        testNumber: 1,
        durationMinutes: 45,
        positiveMarks: 4,
        negativeMarks: 1,
        description: '',
        maxAttempts: 1,
      });
      const refreshed = await getTestsByChapter(selectedChapter.id);
      setTests(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to create test', 'error');
    }
  };

  const startEditTest = (testItem) => {
    setEditingTest(testItem);
    setTestForm({
      title: testItem.title,
      testType: testItem.test_type,
      testNumber: testItem.test_number || 1,
      durationMinutes: testItem.duration_minutes || 45,
      positiveMarks: testItem.positive_marks || 4,
      negativeMarks: testItem.negative_marks || 1,
      description: testItem.description || '',
      maxAttempts: testItem.max_attempts || 1,
    });
  };

  const handleUpdateTest = async (e) => {
    e.preventDefault();
    if (!editingTest || !testForm.title.trim()) return;

    const cat = testForm.testType;
    const maxLimit = CATEGORY_LIMITS[cat] || 15;
    const num = parseInt(testForm.testNumber, 10);
    if (num < 1 || num > maxLimit) {
      showMsg(`Test number for ${cat.replace('_', ' ')} must be between 1 and ${maxLimit}.`, 'error');
      return;
    }

    try {
      await updateTest(editingTest.id, {
        title: testForm.title.trim(),
        testType: testForm.testType,
        testNumber: num,
        durationMinutes: parseInt(testForm.durationMinutes, 10) || 45,
        positiveMarks: parseFloat(testForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(testForm.negativeMarks) || 1.0,
        description: testForm.description.trim() || undefined,
        maxAttempts: parseInt(testForm.maxAttempts, 10) || 1,
      });
      showMsg(`Test "${testForm.title}" updated successfully!`);
      setEditingTest(null);
      const refreshed = await getTestsByChapter(selectedChapter.id);
      setTests(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update test', 'error');
    }
  };

  const handleToggleTestStatus = async (testItem) => {
    const isCurrentlyPublished = testItem.publication_status === 'published' || testItem.is_published;
    const nextStatus = isCurrentlyPublished ? 'draft' : 'published';

    if (nextStatus === 'published' && (!testItem.question_count || testItem.question_count === 0)) {
      showMsg('Cannot publish a test with zero questions. Please upload questions first.', 'error');
      return;
    }

    try {
      await updateTestStatus(testItem.id, nextStatus);
      showMsg(`Test "${testItem.title}" updated to ${nextStatus}.`);
      const refreshed = await getTestsByChapter(selectedChapter.id);
      setTests(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update test status', 'error');
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await deleteTest(testId);
      showMsg('Test deleted successfully.');
      setDeleteConfirmation(null);
      if (selectedChapter) {
        const refreshed = await getTestsByChapter(selectedChapter.id);
        setTests(refreshed || []);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to delete test', 'error');
      setDeleteConfirmation(null);
    }
  };

  // Preview test questions modal
  const handleOpenPreview = async (testItem) => {
    setPreviewTest(testItem);
    setLoadingPreview(true);
    setPreviewQuestions([]);
    try {
      const data = await getTestQuestions(testItem.id);
      setPreviewQuestions(data?.questions || []);
    } catch (err) {
      showMsg(err.message || 'Failed to load test questions', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Category counts and capacity
  const sectionalCount = tests.filter((t) => t.test_type === 'sectional').length;
  const fullLengthCount = tests.filter((t) => t.test_type === 'full_length').length;
  const pyqCount = tests.filter((t) => t.test_type === 'pyq').length;

  const filteredTests = tests.filter((t) => {
    if (testCategoryFilter === 'ALL') return true;
    return t.test_type === testCategoryFilter;
  });

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Feedback banner */}
      {feedback.message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
            backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: feedback.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${feedback.type === 'error' ? '#f87171' : '#86efac'}`,
            fontSize: '0.9rem',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* 3-Column Academic Structure Management Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.35fr', gap: '1.25rem' }}>
        
        {/* ==========================================
            COLUMN 1: SUBJECTS
           ========================================== */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0 }}>1. Subjects</h3>
              <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>{subjects.length} registered</p>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => {
                setShowAddSubject(!showAddSubject);
                setEditingSubject(null);
              }}
            >
              {showAddSubject ? 'Cancel' : '+ New Subject'}
            </button>
          </div>

          {/* New / Edit Subject Form */}
          {(showAddSubject || editingSubject) && (
            <form
              onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}
              style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{editingSubject ? 'Edit Subject' : 'Create New Subject'}</strong>
                {editingSubject && (
                  <button
                    type="button"
                    onClick={() => setEditingSubject(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Political Science"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Paper Code (Unique)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HUQP18"
                    value={subjectForm.paperCode}
                    onChange={(e) => setSubjectForm({ ...subjectForm, paperCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Display Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={subjectForm.displayOrder}
                    onChange={(e) => setSubjectForm({ ...subjectForm, displayOrder: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}>
                {editingSubject ? 'Save Changes' : 'Create Subject'}
              </button>
            </form>
          )}

          {/* Subjects List */}
          {loadingSubjects ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading subjects...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
              {subjects.map((sub) => {
                const isSelected = selectedSubject?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                        {sub.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {sub.paper_code ? `Code: ${sub.paper_code} | ` : ''}Order #{sub.display_order}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditSubject(sub);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                        title="Edit Subject"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSubjectStatus(sub);
                        }}
                        className={`status-pill ${sub.publication_status === 'published' ? 'status-success' : 'status-secondary'}`}
                        style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                        title="Toggle Publication Status"
                      >
                        {sub.publication_status || 'published'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==========================================
            COLUMN 2: CHAPTERS
           ========================================== */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0 }}>2. Chapters</h3>
              <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>
                {selectedSubject ? `${selectedSubject.name} (${chapters.length})` : 'Select a subject'}
              </p>
            </div>
            {selectedSubject && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowAddChapter(!showAddChapter);
                  setEditingChapter(null);
                }}
              >
                {showAddChapter ? 'Cancel' : '+ New Chapter'}
              </button>
            )}
          </div>

          {/* New / Edit Chapter Form */}
          {(showAddChapter || editingChapter) && (
            <form
              onSubmit={editingChapter ? handleUpdateChapter : handleCreateChapter}
              style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{editingChapter ? 'Edit Chapter' : `Add Chapter under ${selectedSubject?.name}`}</strong>
                {editingChapter && (
                  <button
                    type="button"
                    onClick={() => setEditingChapter(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Chapter Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Western Political Thought"
                  value={chapterForm.name}
                  onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Display Order</label>
                <input
                  type="number"
                  className="form-input"
                  value={chapterForm.displayOrder}
                  onChange={(e) => setChapterForm({ ...chapterForm, displayOrder: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}>
                {editingChapter ? 'Save Changes' : 'Save Chapter'}
              </button>
            </form>
          )}

          {/* Chapters List */}
          {loadingChapters ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading chapters...</p>
          ) : !selectedSubject ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Choose a subject to view its syllabus chapters.</p>
          ) : chapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No chapters in this subject yet. Click "+ New Chapter" above to create one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
              {chapters.map((chap) => {
                const isSelected = selectedChapter?.id === chap.id;
                return (
                  <div
                    key={chap.id}
                    onClick={() => handleSelectChapter(chap)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                        {chap.display_order ? `Ch ${chap.display_order}. ` : ''}{chap.name || chap.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {chap.test_count !== undefined ? `${chap.test_count} tests | ` : ''}Order #{chap.display_order}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditChapter(chap);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                        title="Edit Chapter"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleChapterStatus(chap);
                        }}
                        className={`status-pill ${chap.publication_status === 'published' ? 'status-success' : 'status-secondary'}`}
                        style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                        title="Toggle Publication Status"
                      >
                        {chap.publication_status || 'published'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==========================================
            COLUMN 3: TESTS & MOCK PAPERS
           ========================================== */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0 }}>3. Test Series</h3>
              <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>
                {selectedChapter ? `${selectedChapter.name || 'Chapter'} (${tests.length})` : 'Select a chapter'}
              </p>
            </div>
            {selectedChapter && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowAddTest(!showAddTest);
                  setEditingTest(null);
                }}
              >
                {showAddTest ? 'Cancel' : '+ New Test'}
              </button>
            )}
          </div>

          {/* Chapter Quota / Platform Capacity Badges */}
          {selectedChapter && (
            <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                Intended Chapter Configuration Quotas:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`status-pill ${sectionalCount >= 15 ? 'status-warning' : 'status-secondary'}`}>
                  Sectional: {sectionalCount}/15
                </span>
                <span className={`status-pill ${fullLengthCount >= 10 ? 'status-warning' : 'status-secondary'}`}>
                  Full-Length: {fullLengthCount}/10
                </span>
                <span className={`status-pill ${pyqCount >= 5 ? 'status-warning' : 'status-secondary'}`}>
                  PYQ: {pyqCount}/5
                </span>
              </div>
            </div>
          )}

          {/* Category Filter Tabs */}
          {selectedChapter && (
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {['ALL', 'sectional', 'full_length', 'pyq'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTestCategoryFilter(cat)}
                  className={`btn ${testCategoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                >
                  {cat === 'ALL' ? 'All Tests' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {/* New / Edit Test Form */}
          {(showAddTest || editingTest) && (
            <form
              onSubmit={editingTest ? handleUpdateTest : handleCreateTest}
              style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{editingTest ? 'Edit Test' : 'Create New Test'}</strong>
                {editingTest && (
                  <button
                    type="button"
                    onClick={() => setEditingTest(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Test Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sectional Test 2: Core Thinkers"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Category *</label>
                  <select
                    className="form-input"
                    value={testForm.testType}
                    onChange={(e) => setTestForm({ ...testForm, testType: e.target.value })}
                  >
                    <option value="sectional">Sectional Test (Max 15)</option>
                    <option value="full_length">Full-Length Test (Max 10)</option>
                    <option value="pyq">PYQ Test (Max 5)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Test # (Series)</label>
                  <input
                    type="number"
                    min="1"
                    max={CATEGORY_LIMITS[testForm.testType] || 15}
                    className="form-input"
                    value={testForm.testNumber}
                    onChange={(e) => setTestForm({ ...testForm, testNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Mins</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={testForm.durationMinutes}
                    onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>+ Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={testForm.positiveMarks}
                    onChange={(e) => setTestForm({ ...testForm, positiveMarks: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>- Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    className="form-input"
                    value={testForm.negativeMarks}
                    onChange={(e) => setTestForm({ ...testForm, negativeMarks: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}>
                {editingTest ? 'Save Changes' : 'Create Test (Draft)'}
              </button>
            </form>
          )}

          {/* Tests List */}
          {loadingTests ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading tests...</p>
          ) : !selectedChapter ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Choose a chapter to view linked tests.</p>
          ) : filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No tests in this category yet. Click "+ New Test" above to create one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
              {filteredTests.map((t) => {
                const qCount = parseInt(t.question_count, 10) || 0;
                const isPublished = t.publication_status === 'published' || t.is_published;
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          #{t.test_number || t.display_order}: {t.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                          <span className="status-pill status-secondary" style={{ textTransform: 'capitalize', padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}>
                            {t.test_type?.replace('_', ' ')}
                          </span>
                          {' '}&bull; {qCount} questions &bull; {t.duration_minutes}m &bull; +{t.positive_marks}/-{t.negative_marks}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleTestStatus(t)}
                        className={`status-pill ${isPublished ? 'status-success' : 'status-secondary'}`}
                        style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                        title={qCount === 0 ? 'Draft: Cannot publish without questions' : 'Click to toggle publication status'}
                      >
                        {isPublished ? 'published' : 'draft'}
                      </button>
                    </div>

                    {/* Test Action Controls */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => handleOpenPreview(t)}
                        title="Preview questions in this test"
                      >
                        👁️ Preview ({qCount})
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                        onClick={() => startEditTest(t)}
                        title="Edit test configuration"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', color: '#dc2626' }}
                        onClick={() => setDeleteConfirmation({ type: 'test', id: t.id, title: t.title })}
                        title="Delete test"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL: TEST QUESTIONS PREVIEW DRAWER
         ========================================== */}
      {previewTest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              overflowY: 'auto',
              margin: 0,
              backgroundColor: '#ffffff',
            }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                  Test Questions Preview: {previewTest.title}
                </h3>
                <p className="card-subtitle" style={{ fontSize: '0.85rem' }}>
                  {previewQuestions.length} Questions Mapped in PostgreSQL
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPreviewTest(null)}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
              >
                Close ✕
              </button>
            </div>

            {loadingPreview ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading mapped questions...</p>
            ) : previewQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No questions assigned to this test yet.</p>
                <p style={{ fontSize: '0.85rem' }}>Use the <strong>Bulk Question Upload</strong> tab to import questions into this test.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {previewQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      padding: '0.85rem',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                        Q{idx + 1}. {q.topic ? `[${q.topic}]` : ''}
                      </span>
                      <span className="status-pill status-secondary" style={{ fontSize: '0.7rem' }}>
                        +{q.positive_marks || 4} / -{q.negative_marks || 1}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      {q.question_text}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const optKey = `option_${opt.toLowerCase()}`;
                        const isCorrect = (q.correct_option || '').trim().toUpperCase() === opt;
                        return (
                          <div
                            key={opt}
                            style={{
                              padding: '0.45rem 0.65rem',
                              borderRadius: '4px',
                              border: isCorrect ? '2px solid #16a34a' : '1px solid var(--color-border)',
                              backgroundColor: isCorrect ? '#f0fdf4' : '#ffffff',
                              fontSize: '0.85rem',
                            }}
                          >
                            <strong>({opt})</strong> {q[optKey]}
                            {isCorrect && <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: '0.5rem' }}>✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                        <strong>Solution / Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: DELETE CONFIRMATION
         ========================================== */}
      {deleteConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '420px', width: '100%', margin: 0 }}>
            <h3 className="card-title" style={{ color: '#dc2626' }}>
              Confirm Deletion
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', margin: '0.75rem 0' }}>
              Are you sure you want to delete this {deleteConfirmation.type}: <strong>"{deleteConfirmation.title}"</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              This operation cannot be undone. Any associated sub-records must be clean.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirmation(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  if (deleteConfirmation.type === 'test') {
                    handleDeleteTest(deleteConfirmation.id);
                  }
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
