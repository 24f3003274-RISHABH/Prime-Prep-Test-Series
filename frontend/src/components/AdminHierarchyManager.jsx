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
} from '../api/client.js';

export default function AdminHierarchyManager() {
  // Navigation / Selection State
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [tests, setTests] = useState([]);

  // Loading & Feedback
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Creation Modals / Drawers
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', slug: '', paperCode: '', description: '', displayOrder: 0 });

  const [showAddChapter, setShowAddChapter] = useState(false);
  const [chapterForm, setChapterForm] = useState({ name: '', description: '', displayOrder: 1 });

  const [showAddTest, setShowAddTest] = useState(false);
  const [testForm, setTestForm] = useState({
    title: '',
    testType: 'sectional',
    testNumber: 1,
    durationMinutes: 45,
    positiveMarks: 4,
    negativeMarks: 1,
    description: '',
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const showMsg = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
  };

  // 1. Subjects
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
        paperCode: subjectForm.paperCode.trim() || undefined,
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

  // 2. Chapters
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

  const handleToggleChapterStatus = async (chap) => {
    const nextStatus = chap.publication_status === 'published' ? 'draft' : 'published';
    try {
      await updateChapterStatus(chap.id, nextStatus);
      showMsg(`Chapter "${chap.name}" status updated to ${nextStatus}.`);
      const refreshed = await getChaptersBySubject(selectedSubject.id);
      setChapters(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update chapter status', 'error');
    }
  };

  // 3. Tests
  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!selectedChapter || !testForm.title.trim()) return;
    try {
      const newTest = await createTest(selectedChapter.id, {
        title: testForm.title.trim(),
        testType: testForm.testType,
        testNumber: parseInt(testForm.testNumber, 10) || 1,
        durationMinutes: parseInt(testForm.durationMinutes, 10) || 45,
        positiveMarks: parseFloat(testForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(testForm.negativeMarks) || 1.0,
        description: testForm.description.trim() || undefined,
        publicationStatus: 'draft',
      });
      showMsg(`Test "${newTest.title}" created in draft status!`);
      setShowAddTest(false);
      setTestForm({
        title: '',
        testType: 'sectional',
        testNumber: tests.length + 1,
        durationMinutes: 45,
        positiveMarks: 4,
        negativeMarks: 1,
        description: '',
      });
      const refreshed = await getTestsByChapter(selectedChapter.id);
      setTests(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to create test', 'error');
    }
  };

  const handleToggleTestStatus = async (testItem) => {
    const isCurrentlyPublished = testItem.publication_status === 'published' || testItem.is_published;
    const nextStatus = isCurrentlyPublished ? 'draft' : 'published';

    try {
      await updateTestStatus(testItem.id, nextStatus);
      showMsg(`Test "${testItem.title}" updated to ${nextStatus}.`);
      const refreshed = await getTestsByChapter(selectedChapter.id);
      setTests(refreshed || []);
    } catch (err) {
      showMsg(err.message || 'Failed to update test status', 'error');
    }
  };

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '1.25rem' }}>
        
        {/* COLUMN 1: SUBJECTS */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0 }}>1. Subjects</h3>
              <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>{subjects.length} registered</p>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setShowAddSubject(!showAddSubject)}
            >
              {showAddSubject ? 'Cancel' : '+ New Subject'}
            </button>
          </div>

          {/* New Subject Form */}
          {showAddSubject && (
            <form onSubmit={handleCreateSubject} style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}>
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
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Paper Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HUQP18"
                    value={subjectForm.paperCode}
                    onChange={(e) => setSubjectForm({ ...subjectForm, paperCode: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={subjectForm.displayOrder}
                    onChange={(e) => setSubjectForm({ ...subjectForm, displayOrder: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}>
                Create Subject
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSubjectStatus(sub);
                      }}
                      className={`status-pill ${sub.publication_status === 'published' ? 'status-success' : 'status-secondary'}`}
                      style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                    >
                      {sub.publication_status || 'published'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 2: CHAPTERS */}
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
                onClick={() => setShowAddChapter(!showAddChapter)}
              >
                {showAddChapter ? 'Cancel' : '+ New Chapter'}
              </button>
            )}
          </div>

          {/* New Chapter Form */}
          {showAddChapter && (
            <form onSubmit={handleCreateChapter} style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}>
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
                Save Chapter
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleChapterStatus(chap);
                      }}
                      className={`status-pill ${chap.publication_status === 'published' ? 'status-success' : 'status-secondary'}`}
                      style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                    >
                      {chap.publication_status || 'published'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: TESTS & MOCK PAPERS */}
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
                onClick={() => setShowAddTest(!showAddTest)}
              >
                {showAddTest ? 'Cancel' : '+ New Test'}
              </button>
            )}
          </div>

          {/* New Test Form */}
          {showAddTest && (
            <form onSubmit={handleCreateTest} style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}>
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
                    <option value="sectional">Sectional Test</option>
                    <option value="full_length">Full-Length Test</option>
                    <option value="pyq">PYQ Test</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Test #</label>
                  <input
                    type="number"
                    className="form-input"
                    value={testForm.testNumber}
                    onChange={(e) => setTestForm({ ...testForm, testNumber: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Mins</label>
                  <input
                    type="number"
                    className="form-input"
                    value={testForm.durationMinutes}
                    onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>+ Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={testForm.positiveMarks}
                    onChange={(e) => setTestForm({ ...testForm, positiveMarks: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>- Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={testForm.negativeMarks}
                    onChange={(e) => setTestForm({ ...testForm, negativeMarks: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}>
                Create Test (Draft)
              </button>
            </form>
          )}

          {/* Tests List */}
          {loadingTests ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading tests...</p>
          ) : !selectedChapter ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Choose a chapter to view linked tests.</p>
          ) : tests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No tests in this chapter yet. Click "+ New Test" above to create one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '550px', overflowY: 'auto' }}>
              {tests.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      #{t.test_number || t.display_order}: {t.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <span className="status-pill status-secondary" style={{ textTransform: 'capitalize', padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}>
                        {t.test_type?.replace('_', ' ')}
                      </span>
                      {' '}&bull; {t.question_count || 0} questions &bull; {t.duration_minutes}m &bull; +{t.positive_marks}/-{t.negative_marks}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleTestStatus(t)}
                    className={`status-pill ${t.publication_status === 'published' ? 'status-success' : 'status-secondary'}`}
                    style={{ cursor: 'pointer', border: 'none', fontSize: '0.7rem' }}
                    title={t.question_count === 0 ? 'Draft: Cannot publish without questions' : 'Click to toggle publication status'}
                  >
                    {t.publication_status || 'draft'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
