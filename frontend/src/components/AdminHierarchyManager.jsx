import React, { useState, useEffect } from 'react';
import {
  getSubjects,
  createSubject,
  updateSubject,
  updateSubjectStatus,
  deleteSubject,
  getAdminSubjectTests,
  createAdminSubjectTest,
  updateTest,
  updateTestStatus,
  deleteTest,
  getTestQuestions,
} from '../api/client.js';

const TEST_CATEGORIES = [
  { id: 'sectional', label: 'Sectional Tests', badge: 'Targeted Units', defaultDuration: 30, desc: 'Topic-focused practice tests' },
  { id: 'full_length', label: 'Full-Length Tests', badge: 'NTA Exam Mock', defaultDuration: 105, desc: 'Comprehensive full-syllabus examination mocks' },
  { id: 'pyq', label: 'Previous Year Question (PYQ) Tests', badge: 'Past Papers', defaultDuration: 105, desc: 'Official previous year question papers' },
];

export default function AdminHierarchyManager() {
  // Navigation / Selection State: Level 1 (Subject) -> Level 2 (Category) -> Level 3 (Tests)
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('sectional');
  const [tests, setTests] = useState([]);

  // Loading & Feedback
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Creation & Editing States for Subjects
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', slug: '', paperCode: '', description: '', displayOrder: 0 });

  // Creation & Editing States for Tests
  const [showAddTest, setShowAddTest] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState({
    title: '',
    testType: 'sectional',
    testNumber: '',
    durationMinutes: 30,
    positiveMarks: 4,
    negativeMarks: 1,
    accessType: 'paid',
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
    setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
  };

  // ==========================================
  // 1. SUBJECTS (LEVEL 1)
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
    loadTestsForSubject(subj.id, selectedCategory);
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    if (selectedSubject) {
      loadTestsForSubject(selectedSubject.id, catId);
    }
  };

  // ==========================================
  // 2. TESTS (LEVEL 3)
  // ==========================================
  const loadTestsForSubject = async (subjectId, category) => {
    setLoadingTests(true);
    try {
      const data = await getAdminSubjectTests(subjectId, category);
      setTests(data || []);
    } catch (err) {
      showMsg(err.message || 'Failed to load tests for subject', 'error');
    } finally {
      setLoadingTests(false);
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
      setTests([]);
      loadSubjects();
    } catch (err) {
      showMsg(err.message || 'Failed to delete subject', 'error');
      setDeleteConfirmation(null);
    }
  };

  // Test Actions
  const handleOpenAddTest = () => {
    const defaultDuration = selectedCategory === 'sectional' ? 30 : 105;
    const catLabel = TEST_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Test';
    const nextNumber = tests.length + 1;
    setTestForm({
      title: `${selectedSubject ? selectedSubject.name : ''} ${catLabel.replace(' Tests', '')} 0${nextNumber}`,
      testType: selectedCategory,
      testNumber: nextNumber,
      durationMinutes: defaultDuration,
      positiveMarks: 4,
      negativeMarks: 1,
      accessType: 'paid',
      description: '',
      maxAttempts: 1,
    });
    setShowAddTest(true);
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !testForm.title.trim()) return;

    try {
      const payload = {
        title: testForm.title.trim(),
        testType: testForm.testType || selectedCategory,
        testNumber: testForm.testNumber ? parseInt(testForm.testNumber, 10) : undefined,
        durationMinutes: parseInt(testForm.durationMinutes, 10) || 30,
        positiveMarks: parseFloat(testForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(testForm.negativeMarks) || 1.0,
        accessType: testForm.accessType || 'paid',
        description: testForm.description.trim() || undefined,
        maxAttempts: parseInt(testForm.maxAttempts, 10) || 1,
        publicationStatus: 'draft',
      };

      const newTest = await createAdminSubjectTest(selectedSubject.id, payload);
      showMsg(`Test "${newTest.title}" created successfully as draft.`);
      setShowAddTest(false);
      loadTestsForSubject(selectedSubject.id, selectedCategory);
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
      durationMinutes: testItem.duration_minutes || 30,
      positiveMarks: testItem.positive_marks || 4,
      negativeMarks: testItem.negative_marks || 1,
      accessType: testItem.access_type || 'paid',
      description: testItem.description || '',
      maxAttempts: testItem.max_attempts || 1,
    });
  };

  const handleUpdateTest = async (e) => {
    e.preventDefault();
    if (!editingTest || !testForm.title.trim()) return;

    try {
      await updateTest(editingTest.id, {
        title: testForm.title.trim(),
        testType: testForm.testType,
        testNumber: parseInt(testForm.testNumber, 10) || 1,
        durationMinutes: parseInt(testForm.durationMinutes, 10) || 30,
        positiveMarks: parseFloat(testForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(testForm.negativeMarks) || 1.0,
        accessType: testForm.accessType,
        description: testForm.description.trim() || undefined,
        maxAttempts: parseInt(testForm.maxAttempts, 10) || 1,
      });

      showMsg(`Test "${testForm.title}" updated successfully.`);
      setEditingTest(null);
      if (selectedSubject) {
        loadTestsForSubject(selectedSubject.id, selectedCategory);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to update test', 'error');
    }
  };

  const handleToggleTestStatus = async (testItem) => {
    const isCurrentlyPublished = testItem.publication_status === 'published' || testItem.is_published;
    const nextStatus = isCurrentlyPublished ? 'draft' : 'published';

    // Guard: Prevent publishing if test has zero questions
    if (nextStatus === 'published' && (!testItem.question_count || parseInt(testItem.question_count, 10) === 0)) {
      showMsg(`Cannot publish test "${testItem.title}": It has 0 questions. Please import or add questions first.`, 'error');
      return;
    }

    try {
      await updateTestStatus(testItem.id, nextStatus);
      showMsg(`Test "${testItem.title}" publication status updated to ${nextStatus}.`);
      if (selectedSubject) {
        loadTestsForSubject(selectedSubject.id, selectedCategory);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to update test status', 'error');
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await deleteTest(testId);
      showMsg('Test deleted successfully.');
      setDeleteConfirmation(null);
      if (selectedSubject) {
        loadTestsForSubject(selectedSubject.id, selectedCategory);
      }
    } catch (err) {
      showMsg(err.message || 'Failed to delete test', 'error');
      setDeleteConfirmation(null);
    }
  };

  const handlePreviewTest = async (testItem) => {
    setPreviewTest(testItem);
    setLoadingPreview(true);
    try {
      const questions = await getTestQuestions(testItem.id);
      setPreviewQuestions(questions || []);
    } catch (err) {
      showMsg(err.message || 'Failed to load test questions', 'error');
      setPreviewQuestions([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div>
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`status-pill ${feedback.type === 'error' ? 'status-error' : 'status-success'}`}
          style={{
            display: 'block',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Header Breadcrumb & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
            CUET PG Test Series Structure
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
            Direct 3-level academic organization: <strong>Subject &rsaquo; Category &rsaquo; Individual Tests</strong>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          style={{ fontSize: '0.85rem' }}
          onClick={() => setShowAddSubject(true)}
        >
          + Add New Subject
        </button>
      </div>

      {/* ======================================================== */}
      {/* LEVEL 1: SUBJECT SELECTION BAR */}
      {/* ======================================================== */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
          Level 1 &bull; Select Master Subject ({subjects.length} Disciplines)
        </div>

        {loadingSubjects ? (
          <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading subjects...</div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {subjects.map((s) => {
              const isSelected = selectedSubject?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSubject(s)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--color-text)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{s.name}</span>
                  {s.paper_code && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#eff6ff',
                        color: isSelected ? '#ffffff' : 'var(--color-primary)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                      }}
                    >
                      {s.paper_code}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Subject Action Banner */}
      {selectedSubject && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderLeft: '4px solid var(--color-primary)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {selectedSubject.name}
              </h3>
              <span className="status-pill status-primary" style={{ fontSize: '0.725rem' }}>
                {selectedSubject.paper_code || 'CUET PG'}
              </span>
              <span
                className={`status-pill ${selectedSubject.publication_status === 'published' ? 'status-success' : 'status-warning'}`}
                style={{ fontSize: '0.7rem' }}
              >
                {selectedSubject.publication_status?.toUpperCase() || 'PUBLISHED'}
              </span>
            </div>
            {selectedSubject.description && (
              <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                {selectedSubject.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={() => startEditSubject(selectedSubject)}
            >
              Edit Subject
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={() => handleToggleSubjectStatus(selectedSubject)}
            >
              {selectedSubject.publication_status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEVEL 2: 3 TEST CATEGORIES SELECTION */}
      {/* ======================================================== */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
          Level 2 &bull; Select Test Category
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {TEST_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                style={{
                  cursor: 'pointer',
                  padding: '1.15rem',
                  borderRadius: 'var(--radius)',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                  boxShadow: isSelected ? '0 4px 12px -2px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="status-pill status-primary" style={{ fontSize: '0.7rem' }}>
                    {cat.badge}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Active Selection ✓
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {cat.label}
                </h4>

                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {cat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEVEL 3: INDIVIDUAL TESTS TABLE */}
      {/* ======================================================== */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Level 3 &bull; Tests List
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
              {selectedSubject?.name || 'Subject'} &rsaquo; {TEST_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h3>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
            onClick={handleOpenAddTest}
            disabled={!selectedSubject}
          >
            + Create New Test
          </button>
        </div>

        {loadingTests ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            Loading tests from PostgreSQL...
          </div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
              No tests created yet in this category
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1.25rem 0' }}>
              Create your first test or use Bulk Upload to import questions into this category.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleOpenAddTest}>
              + Create Test Now
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Test Title</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Marking</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, idx) => {
                  const isPub = t.publication_status === 'published' || t.is_published;
                  const qCount = parseInt(t.question_count, 10) || 0;

                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        {t.test_number || idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{t.title}</div>
                        {t.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{qCount} Qs</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {(qCount * (parseFloat(t.positive_marks) || 4)).toFixed(0)} marks
                        </div>
                      </td>
                      <td>{t.duration_minutes}m</td>
                      <td style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                        +{t.positive_marks}/-{t.negative_marks}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${t.access_type === 'free' ? 'status-success' : 'status-warning'}`}
                          style={{ fontSize: '0.675rem', textTransform: 'uppercase' }}
                        >
                          {t.access_type}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${isPub ? 'status-success' : 'status-warning'}`}
                          style={{ fontSize: '0.675rem', textTransform: 'uppercase' }}
                        >
                          {isPub ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                            onClick={() => handlePreviewTest(t)}
                            title="Preview Questions"
                          >
                            👁️ Questions ({qCount})
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                            onClick={() => startEditTest(t)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`btn ${isPub ? 'btn-outline' : 'btn-primary'}`}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                            onClick={() => handleToggleTestStatus(t)}
                          >
                            {isPub ? 'Draft' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => setDeleteConfirmation({ type: 'test', id: t.id, title: t.title })}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT SUBJECT */}
      {/* ======================================================== */}
      {(showAddSubject || editingSubject) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 0 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
              {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add New Subject'}
            </h3>

            <form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}>
              <div className="form-group">
                <label className="form-label">Subject Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Political Science"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">CUET Paper Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HUQP18"
                    value={subjectForm.paperCode}
                    onChange={(e) => setSubjectForm({ ...subjectForm, paperCode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={subjectForm.displayOrder}
                    onChange={(e) => setSubjectForm({ ...subjectForm, displayOrder: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Curriculum overview..."
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddSubject(false);
                    setEditingSubject(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT TEST */}
      {/* ======================================================== */}
      {(showAddTest || editingTest) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '580px', width: '100%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              {editingTest ? `Edit Test: ${editingTest.title}` : `Create New ${TEST_CATEGORIES.find((c) => c.id === selectedCategory)?.label}`}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Belongs directly to <strong>{selectedSubject?.name}</strong> under <strong>{TEST_CATEGORIES.find((c) => c.id === (editingTest?.test_type || selectedCategory))?.label}</strong>.
            </p>

            <form onSubmit={editingTest ? handleUpdateTest : handleCreateTest}>
              <div className="form-group">
                <label className="form-label">Test Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Political Science Sectional Test 01"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={testForm.testType}
                    onChange={(e) => setTestForm({ ...testForm, testType: e.target.value })}
                  >
                    <option value="sectional">Sectional Test</option>
                    <option value="full_length">Full-Length Mock</option>
                    <option value="pyq">PYQ Test</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Test Number</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={testForm.testNumber}
                    onChange={(e) => setTestForm({ ...testForm, testNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={5}
                    value={testForm.durationMinutes}
                    onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Positive (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={testForm.positiveMarks}
                    onChange={(e) => setTestForm({ ...testForm, positiveMarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Negative (-)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={testForm.negativeMarks}
                    onChange={(e) => setTestForm({ ...testForm, negativeMarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Access Tier</label>
                  <select
                    className="form-input"
                    value={testForm.accessType}
                    onChange={(e) => setTestForm({ ...testForm, accessType: e.target.value })}
                  >
                    <option value="paid">Paid / Premium</option>
                    <option value="free">Free Test</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Instructions</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Test instructions or syllabus topics covered..."
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddTest(false);
                    setEditingTest(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTest ? 'Save Test Changes' : 'Create Test (Draft)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PREVIEW QUESTIONS */}
      {/* ======================================================== */}
      {previewTest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '780px', width: '100%', margin: 0, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Questions in "{previewTest.title}"
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Total: {previewQuestions.length} Questions | Marking: +{previewTest.positive_marks}/-{previewTest.negative_marks}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setPreviewTest(null)}
              >
                Close ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {loadingPreview ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Loading questions...
                </div>
              ) : previewQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  This test currently has no questions. Go to "Bulk Question Upload" to import questions.
                </div>
              ) : (
                previewQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    style={{
                      padding: '0.85rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                        Q{qIdx + 1}
                      </span>
                      <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                        Answer: Option {q.correct_option}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
                      {q.question_text}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.35rem', fontSize: '0.8rem' }}>
                      <div style={{ color: q.correct_option === 'A' ? '#16a34a' : 'inherit', fontWeight: q.correct_option === 'A' ? 700 : 400 }}>
                        A. {q.option_a}
                      </div>
                      <div style={{ color: q.correct_option === 'B' ? '#16a34a' : 'inherit', fontWeight: q.correct_option === 'B' ? 700 : 400 }}>
                        B. {q.option_b}
                      </div>
                      <div style={{ color: q.correct_option === 'C' ? '#16a34a' : 'inherit', fontWeight: q.correct_option === 'C' ? 700 : 400 }}>
                        C. {q.option_c}
                      </div>
                      <div style={{ color: q.correct_option === 'D' ? '#16a34a' : 'inherit', fontWeight: q.correct_option === 'D' ? 700 : 400 }}>
                        D. {q.option_d}
                      </div>
                    </div>

                    {q.explanation && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', backgroundColor: '#eff6ff', padding: '0.4rem', borderRadius: '4px' }}>
                        💡 <strong>Solution:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {deleteConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Confirm Deletion
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete {deleteConfirmation.type} "<strong>{deleteConfirmation.title}</strong>"?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  if (deleteConfirmation.type === 'test') {
                    handleDeleteTest(deleteConfirmation.id);
                  } else {
                    handleDeleteSubject(deleteConfirmation.id);
                  }
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
