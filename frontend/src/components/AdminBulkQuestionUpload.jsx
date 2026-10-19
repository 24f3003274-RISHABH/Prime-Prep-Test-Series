import React, { useState, useEffect } from 'react';
import {
  getSubjects,
  getChaptersBySubject,
  createChapter,
  getTestsByChapter,
  createTest,
  previewQuestionImport,
  confirmQuestionImport,
  getTestQuestions,
} from '../api/client.js';

export default function AdminBulkQuestionUpload() {
  // Step selections
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [testCategory, setTestCategory] = useState('sectional'); // 'sectional' | 'full_length' | 'pyq'
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  // Loading states
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);

  // File upload state
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [generalError, setGeneralError] = useState('');
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // View existing questions modal/drawer
  const [viewingQuestions, setViewingQuestions] = useState(false);
  const [testQuestionsList, setTestQuestionsList] = useState(null);
  const [loadingQuestionsList, setLoadingQuestionsList] = useState(false);

  // Inline Quick-Create Chapter state
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [creatingChapter, setCreatingChapter] = useState(false);

  // Inline Quick-Create Test state
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestNumber, setNewTestNumber] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(30);
  const [creatingTest, setCreatingTest] = useState(false);

  // 1. Fetch Subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    setGeneralError('');
    try {
      const data = await getSubjects();
      setSubjects(data || []);
      if (data && data.length > 0) {
        setSelectedSubjectId(data[0].id);
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // 2. Fetch Chapters when selectedSubjectId changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setChapters([]);
      setSelectedChapterId('');
      return;
    }
    fetchChapters(selectedSubjectId);
  }, [selectedSubjectId]);

  const fetchChapters = async (subjectId) => {
    setLoadingChapters(true);
    setGeneralError('');
    try {
      const data = await getChaptersBySubject(subjectId);
      setChapters(data || []);
      if (data && data.length > 0) {
        setSelectedChapterId(data[0].id);
      } else {
        setSelectedChapterId('');
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load chapters.');
    } finally {
      setLoadingChapters(false);
    }
  };

  // 3. Fetch Tests when selectedChapterId or testCategory changes
  useEffect(() => {
    if (!selectedChapterId) {
      setTests([]);
      setSelectedTestId('');
      return;
    }
    fetchTests(selectedChapterId, testCategory);
  }, [selectedChapterId, testCategory]);

  const fetchTests = async (chapterId, category) => {
    setLoadingTests(true);
    setGeneralError('');
    try {
      const data = await getTestsByChapter(chapterId, category);
      setTests(data || []);
      if (data && data.length > 0) {
        setSelectedTestId(data[0].id);
      } else {
        setSelectedTestId('');
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load tests.');
    } finally {
      setLoadingTests(false);
    }
  };

  // Quick-create a new chapter
  const handleQuickCreateChapter = async (e) => {
    e.preventDefault();
    if (!newChapterName.trim()) {
      alert('Chapter name is required.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject first.');
      return;
    }
    setCreatingChapter(true);
    try {
      const created = await createChapter(selectedSubjectId, {
        name: newChapterName.trim(),
        displayOrder: chapters.length + 1,
        publicationStatus: 'published',
      });
      setShowCreateChapter(false);
      setNewChapterName('');
      await fetchChapters(selectedSubjectId);
      setSelectedChapterId(created.id);
    } catch (err) {
      alert(err.message || 'Failed to create chapter.');
    } finally {
      setCreatingChapter(false);
    }
  };

  // Quick-create a new test
  const handleQuickCreateTest = async (e) => {
    e.preventDefault();
    if (!newTestTitle.trim()) {
      alert('Test title is required.');
      return;
    }
    setCreatingTest(true);
    try {
      const created = await createTest(selectedChapterId, {
        title: newTestTitle.trim(),
        testType: testCategory,
        testNumber: newTestNumber ? parseInt(newTestNumber, 10) : undefined,
        durationMinutes: parseInt(newTestDuration, 10) || 30,
        publicationStatus: 'published',
      });
      setShowCreateTest(false);
      setNewTestTitle('');
      setNewTestNumber('');
      // Refresh tests and auto-select new test
      await fetchTests(selectedChapterId, testCategory);
      setSelectedTestId(created.id);
    } catch (err) {
      alert(err.message || 'Failed to create test.');
    } finally {
      setCreatingTest(false);
    }
  };

  // Download Sample Question Spreadsheet Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Question,Option A,Option B,Option C,Option D,Answer,Solution,Subject,Chapter,Test Type,Test Number\n' +
      '"Who founded the Bolshevik Communist Party?","Vladimir Lenin","Joseph Stalin","Nikita Khrushchev","Leonid Brezhnev","A","Vladimir Lenin founded the Bolshevik faction in 1903.","Political Science","Western Political Thought","SECTIONAL","1"\n' +
      '"Which article of the Indian Constitution deals with the Right to Equality?","Article 14","Article 19","Article 21","Article 32","A","Article 14 guarantees equality before the law and equal protection of laws.","Political Science","Western Political Thought","SECTIONAL","1"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'PrimePrep_Sample_Questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const name = (selected.name || '').toLowerCase();
      const valid = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
      if (!valid) {
        setGeneralError('Unsupported file format. Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.');
        setFile(null);
        return;
      }
      setFile(selected);
      setPreviewData(null);
      setImportReport(null);
      setGeneralError('');
    }
  };

  // Step 5: Upload & Preview
  const handleGeneratePreview = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setGeneralError('');

    if (!selectedSubjectId) {
      setGeneralError('Step 1: Please select a Subject.');
      return;
    }
    if (!selectedChapterId) {
      setGeneralError('Step 2: Please select or create a Chapter for this subject.');
      return;
    }
    if (!selectedTestId) {
      setGeneralError('Step 4: Please select or create a destination Test Series (or switch Test Category).');
      return;
    }
    if (!file) {
      setGeneralError('Step 5: Please choose or drop an Excel (.xlsx/.xls) or CSV file to upload.');
      return;
    }

    setUploading(true);
    setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('testId', selectedTestId);
      formData.append('subjectId', selectedSubjectId);
      formData.append('chapterId', selectedChapterId);
      formData.append('testType', testCategory);

      const preview = await previewQuestionImport(formData);
      setPreviewData(preview);
    } catch (err) {
      setGeneralError(err.message || 'Failed to parse and validate spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  // Cancel Preview
  const handleCancelPreview = () => {
    setPreviewData(null);
    setFile(null);
    setGeneralError('');
    setAllowDuplicates(false);
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!previewData || !previewData.validQuestions || previewData.validQuestions.length === 0) {
      setGeneralError('No valid questions to import.');
      return;
    }

    setImporting(true);
    setGeneralError('');

    try {
      const payload = {
        testId: selectedTestId,
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId,
        testType: testCategory,
        questions: previewData.validQuestions,
        allowDuplicates,
      };

      const result = await confirmQuestionImport(payload);
      setImportReport(result);
      setPreviewData(null);
      setFile(null);
      // Refresh tests to update question count
      fetchTests(selectedChapterId, testCategory);
    } catch (err) {
      setGeneralError(err.message || 'Failed to commit question import.');
    } finally {
      setImporting(false);
    }
  };

  // View questions in currently selected test
  const handleViewTestQuestions = async (testIdToView) => {
    const tId = testIdToView || selectedTestId;
    if (!tId) return;
    setLoadingQuestionsList(true);
    setViewingQuestions(true);
    try {
      const data = await getTestQuestions(tId);
      setTestQuestionsList(data);
    } catch (err) {
      alert(err.message || 'Failed to load test questions.');
    } finally {
      setLoadingQuestionsList(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);
  const selectedTest = tests.find((t) => t.id === selectedTestId);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Bulk Question Upload Engine
            </h3>
            <p className="card-subtitle" style={{ fontSize: '0.85rem' }}>
              Import spreadsheet questions (.xlsx, .xls, .csv) into CUET PG subjects, chapters, and test series.
            </p>
          </div>
          <span className="status-pill status-primary" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
            ADMIN WORKFLOW
          </span>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #f87171',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <strong>Error:</strong> {generalError}
          </div>
        )}

        {/* Post-Import Success Report */}
        {importReport && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', color: '#16a34a' }}>&#10004;</span>
                <h4 style={{ margin: 0, color: '#166534', fontSize: '1.05rem', fontWeight: 700 }}>
                  Import Completed Successfully
                </h4>
              </div>
              <span className="status-pill status-success">STATUS: {importReport.data?.importStatus?.toUpperCase()}</span>
            </div>

            <table className="data-table" style={{ backgroundColor: '#ffffff', borderRadius: '4px', marginBottom: '1rem' }}>
              <tbody>
                <tr>
                  <td style={{ width: '180px', fontWeight: 600 }}>Subject:</td>
                  <td>{importReport.data?.subjectName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Chapter:</td>
                  <td>{importReport.data?.chapterName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Test Category:</td>
                  <td>
                    <span className="status-pill status-secondary" style={{ textTransform: 'capitalize' }}>
                      {importReport.data?.testCategory?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Test Title & Number:</td>
                  <td>
                    <strong>#{importReport.data?.testNumber}</strong> — {importReport.data?.testTitle}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Questions Imported:</td>
                  <td style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
                    +{importReport.data?.questionsImported} question(s)
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Total Questions In Test:</td>
                  <td>
                    <strong>{importReport.data?.totalQuestionsInTest}</strong> total questions
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setImportReport(null);
                  setFile(null);
                  setPreviewData(null);
                }}
              >
                Upload Questions to Another Test
              </button>
              <button
                className="btn btn-outline"
                onClick={() => handleViewTestQuestions(selectedTestId)}
              >
                View Questions in this Test ({importReport.data?.totalQuestionsInTest})
              </button>
            </div>
          </div>
        )}

        {/* STEP-BY-STEP WORKFLOW FORM */}
        {!previewData && !importReport && (
          <form onSubmit={handleGeneratePreview}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              
              {/* Step 1: Select Subject */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Step 1 &bull; Select Subject{' '}
                  {loadingSubjects && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>(loading...)</span>}
                </label>
                <select
                  className="form-input"
                  value={selectedSubjectId}
                  onChange={(e) => {
                    const newSubId = e.target.value;
                    setSelectedSubjectId(newSubId);
                    setSelectedChapterId('');
                    setSelectedTestId('');
                    setPreviewData(null);
                    setImportReport(null);
                    setGeneralError('');
                  }}
                  disabled={loadingSubjects || subjects.length === 0}
                >
                  {subjects.length === 0 ? (
                    <option value="">No subjects found</option>
                  ) : (
                    subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.paper_code ? `(${sub.paper_code})` : ''} [{sub.publication_status}]
                      </option>
                    ))
                  )}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Loaded dynamically from database ({subjects.length} subjects available)
                </span>
              </div>

              {/* Step 2: Select Chapter */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    Step 2 &bull; Select Chapter{' '}
                    {loadingChapters && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>(loading...)</span>}
                  </label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setShowCreateChapter(!showCreateChapter);
                      if (!showCreateChapter && !newChapterName) {
                        setNewChapterName(`${selectedSubject?.name || 'Subject'} Chapter ${chapters.length + 1}`);
                      }
                    }}
                  >
                    {showCreateChapter ? 'Cancel New Chapter' : '+ New Chapter'}
                  </button>
                </div>
                <select
                  className="form-input"
                  value={selectedChapterId}
                  onChange={(e) => {
                    const newChapId = e.target.value;
                    setSelectedChapterId(newChapId);
                    setSelectedTestId('');
                    setPreviewData(null);
                    setImportReport(null);
                    setGeneralError('');
                  }}
                  disabled={loadingChapters || chapters.length === 0}
                  style={{ marginTop: '0.35rem' }}
                >
                  {chapters.length === 0 ? (
                    <option value="">No chapters in selected subject</option>
                  ) : (
                    chapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>
                        {chap.display_order ? `Ch ${chap.display_order}. ` : ''}{chap.name || chap.title} [{chap.publication_status}]
                      </option>
                    ))
                  )}
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {chapters.length} chapter(s) under {selectedSubject?.name || 'subject'}
                  </span>
                  {chapters.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateChapter(true);
                        setNewChapterName(`${selectedSubject?.name || 'Subject'} Chapter 1`);
                      }}
                      style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      + Quick Add Chapter 1
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Select Test Category */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Step 3 &bull; Select Test Category
                </label>
                <select
                  className="form-input"
                  value={testCategory}
                  onChange={(e) => {
                    setTestCategory(e.target.value);
                    setSelectedTestId('');
                    setPreviewData(null);
                    setImportReport(null);
                    setGeneralError('');
                  }}
                >
                  <option value="sectional">1. Sectional Test</option>
                  <option value="full_length">2. Full-Length Mock Test</option>
                  <option value="pyq">3. PYQ (Previous Year Question Paper)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Filters available test series by examination category
                </span>
              </div>

              {/* Step 4: Select Test Series Number */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    Step 4 &bull; Select Test Series Number
                  </label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setShowCreateTest(!showCreateTest);
                      if (!showCreateTest && !newTestTitle) {
                        const catLabel = testCategory === 'full_length' ? 'Full-Length Test' : testCategory === 'pyq' ? 'PYQ Test' : 'Sectional Test';
                        setNewTestTitle(`${selectedChapter?.name || 'Domain'} ${catLabel} ${tests.length + 1}`);
                        setNewTestNumber(tests.length + 1);
                      }
                    }}
                  >
                    {showCreateTest ? 'Cancel New Test' : '+ New Test'}
                  </button>
                </div>
                <select
                  className="form-input"
                  value={selectedTestId}
                  onChange={(e) => {
                    setSelectedTestId(e.target.value);
                    setPreviewData(null);
                    setImportReport(null);
                    setGeneralError('');
                  }}
                  disabled={loadingTests || tests.length === 0}
                  style={{ marginTop: '0.35rem' }}
                >
                  {tests.length === 0 ? (
                    <option value="">No tests found for this category</option>
                  ) : (
                    tests.map((t) => (
                      <option key={t.id} value={t.id}>
                        Test #{t.test_number || t.display_order}: {t.title} ({t.question_count || 0} questions, {t.duration_minutes}m)
                      </option>
                    ))
                  )}
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {tests.length} {testCategory.replace('_', ' ')} test(s) available
                  </span>
                  {tests.length === 0 && selectedChapterId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateTest(true);
                        const catLabel = testCategory === 'full_length' ? 'Full-Length Test' : testCategory === 'pyq' ? 'PYQ Test' : 'Sectional Test';
                        setNewTestTitle(`${selectedChapter?.name || 'Domain'} ${catLabel} 1`);
                        setNewTestNumber(1);
                      }}
                      style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      + Quick Add Test 1
                    </button>
                  )}
                  {selectedTestId && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => handleViewTestQuestions(selectedTestId)}
                    >
                      View existing questions
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick-Create Chapter Drawer if no chapters exist or admin wants to add one */}
            {showCreateChapter && (
              <div
                style={{
                  padding: '1rem',
                  border: '1px dashed var(--color-primary)',
                  borderRadius: 'var(--radius)',
                  backgroundColor: '#f8fafc',
                  marginBottom: '1.25rem',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                  Create New Chapter in {selectedSubject?.name || 'Selected Subject'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Chapter Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Political Theory and Core Constitutionalism"
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleQuickCreateChapter}
                    disabled={creatingChapter || !newChapterName.trim()}
                  >
                    {creatingChapter ? 'Creating...' : 'Create Chapter'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick-Create Test Drawer if no tests exist or admin wants to add one */}
            {showCreateTest && (
              <div
                style={{
                  padding: '1rem',
                  border: '1px dashed var(--color-primary)',
                  borderRadius: 'var(--radius)',
                  backgroundColor: '#f8fafc',
                  marginBottom: '1.25rem',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                  Create New {testCategory.replace('_', ' ').toUpperCase()} Test in {selectedChapter?.name || 'Chapter'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Test Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sectional Test 2: Core Constitutionalism"
                      value={newTestTitle}
                      onChange={(e) => setNewTestTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Test Number</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 2"
                      value={newTestNumber}
                      onChange={(e) => setNewTestNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Duration (Mins)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newTestDuration}
                      onChange={(e) => setNewTestDuration(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleQuickCreateTest}
                    disabled={creatingTest || !newTestTitle.trim()}
                  >
                    {creatingTest ? 'Creating...' : 'Create Test'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Upload File */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer?.files?.[0];
                if (dropped) {
                  setFile(dropped);
                  setPreviewData(null);
                  setImportReport(null);
                  setGeneralError('');
                }
              }}
              style={{
                border: dragOver ? '2px solid var(--color-primary)' : '2px dashed var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: dragOver ? '#eff6ff' : file ? '#f0fdf4' : '#fafafa',
                marginBottom: '1.25rem',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Step 5 &bull; Upload Question Spreadsheet (.xlsx, .xls, .csv)
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                >
                  Download Sample Template (.csv)
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Drag & drop or browse your file. Required columns: <code>Question</code>, <code>Option A</code>, <code>Option B</code>, <code>Option C</code>, <code>Option D</code>, <code>Answer</code>. Optional: <code>Solution</code>, <code>Subject</code>, <code>Chapter</code>, <code>Test Type</code>, <code>Test Number</code>.
              </p>

              <input
                type="file"
                id="question-file-input"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <label htmlFor="question-file-input" className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                {file ? `Change Selected File: ${file.name}` : 'Browse Spreadsheet File'}
              </label>

              {file && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#166534' }}>
                  <strong>Selected File:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}

              {file && !selectedTestId && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#fffbeb', color: '#92400e', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fde68a' }}>
                  ⚠️ Destination test series not selected yet. Please select Subject, Chapter, and Test Series (Steps 1–4) above to preview questions.
                </div>
              )}
            </div>

            {/* Submit to Preview Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleGeneratePreview}
                className="btn btn-primary"
                disabled={uploading}
                style={{
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.7 : 1,
                  backgroundColor: file && selectedTestId ? '#2563eb' : undefined,
                  boxShadow: file && selectedTestId ? '0 2px 6px rgba(37,99,235,0.35)' : undefined,
                }}
              >
                {uploading ? 'Parsing & Validating...' : 'Upload & Preview Spreadsheet'}
              </button>
            </div>
          </form>
        )}

        {/* IMPORT PREVIEW SCREEN */}
        {previewData && (
          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                marginBottom: '1.25rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                Import Validation Summary & Destination Verification
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Target Destination</span>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {previewData.destination.subjectName} &rarr; {previewData.destination.chapterName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Test #{previewData.destination.testNumber}: {previewData.destination.testTitle} ({previewData.destination.testType})
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Rows Processed</span>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: '0.25rem' }}>
                    {previewData.totalRows}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Spreadsheet rows parsed
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase' }}>Valid Questions</span>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#16a34a', marginTop: '0.25rem' }}>
                    {previewData.validCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                    Ready for atomic import
                  </div>
                </div>

                <div style={{ backgroundColor: previewData.invalidCount > 0 ? '#fef2f2' : '#ffffff', padding: '0.75rem', borderRadius: '4px', border: previewData.invalidCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', color: previewData.invalidCount > 0 ? '#991b1b' : 'var(--color-text-muted)', textTransform: 'uppercase' }}>Validation Errors</span>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', color: previewData.invalidCount > 0 ? '#dc2626' : '#16a34a', marginTop: '0.25rem' }}>
                    {previewData.invalidCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: previewData.invalidCount > 0 ? '#991b1b' : 'var(--color-text-muted)' }}>
                    {previewData.invalidCount > 0 ? 'Rows rejected with errors' : 'All rows passed checks'}
                  </div>
                </div>
              </div>

              {/* DUPLICATE WARNING BANNER */}
              {previewData.isDuplicateWarning && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius)',
                    color: '#92400e',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    &#9888; Duplicate Question Warning: {previewData.duplicateCount} question(s) in this file already exist in this test!
                  </div>
                  <div>
                    PrimePrep detected content overlapping with existing questions in {previewData.destination.testTitle}.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowDuplicates}
                      onChange={(e) => setAllowDuplicates(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600 }}>Allow duplicate question import intentionally</span>
                  </label>
                </div>
              )}

              {/* VALIDATION ERRORS TABLE */}
              {previewData.invalidCount > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h5 style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Validation Errors ({previewData.invalidCount} Rejected Rows):
                  </h5>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #fecaca', borderRadius: '4px' }}>
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#fee2e2' }}>
                        <tr>
                          <th style={{ width: '80px', color: '#991b1b' }}>Row #</th>
                          <th style={{ color: '#991b1b' }}>Question Snippet</th>
                          <th style={{ color: '#991b1b' }}>Identified Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.validationErrors.map((err, idx) => (
                          <tr key={idx}>
                            <td><strong>Row {err.row}</strong></td>
                            <td style={{ color: 'var(--color-text-muted)' }}>{err.questionPreview}</td>
                            <td>
                              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#dc2626' }}>
                                {err.errors.map((msg, i) => (
                                  <li key={i}>{msg}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* QUESTION PREVIEW TABLE */}
              {previewData.preview && previewData.preview.length > 0 && (
                <div>
                  <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    Preview of Valid Questions (Showing First {previewData.preview.length} of {previewData.validCount}):
                  </h5>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>Question</th>
                          <th>Options</th>
                          <th style={{ width: '60px' }}>Answer</th>
                          <th>Solution / Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.preview.map((q, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{q.questionText}</td>
                            <td>
                              <div style={{ fontSize: '0.8rem' }}>
                                <div><strong>A:</strong> {q.optionA}</div>
                                <div><strong>B:</strong> {q.optionB}</div>
                                <div><strong>C:</strong> {q.optionC}</div>
                                <div><strong>D:</strong> {q.optionD}</div>
                              </div>
                            </td>
                            <td>
                              <span className="status-pill status-success" style={{ fontWeight: 700 }}>
                                {q.correctOption}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {q.explanation || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS: CANCEL OR CONFIRM IMPORT */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCancelPreview}
                disabled={importing}
              >
                Cancel Import
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={importing || previewData.validCount === 0 || (previewData.isDuplicateWarning && !allowDuplicates && previewData.duplicateCount === previewData.validCount)}
              >
                {importing ? 'Importing Atomically into Database...' : `Confirm Import (${previewData.validCount} Questions)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL / DRAWER FOR VIEWING QUESTIONS IN CURRENT TEST */}
      {viewingQuestions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflowY: 'auto',
              margin: 0,
            }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Test Questions Bank</h3>
                <p className="card-subtitle">
                  {testQuestionsList?.test?.title} ({testQuestionsList?.test?.subjectName} &rarr; {testQuestionsList?.test?.chapterName})
                </p>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => setViewingQuestions(false)}
              >
                Close &times;
              </button>
            </div>

            {loadingQuestionsList ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                Loading questions from PostgreSQL...
              </p>
            ) : !testQuestionsList?.questions || testQuestionsList.questions.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                No questions currently linked to this test. Use the bulk upload tool above to import questions.
              </p>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Total Questions: <strong>{testQuestionsList.questions.length}</strong> | Positive Marks: +{testQuestionsList.test.positiveMarks} | Negative Marks: -{testQuestionsList.test.negativeMarks}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {testQuestionsList.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>Q{q.display_order || (idx + 1)}. {q.question_text}</strong>
                        <span className="status-pill status-success" style={{ height: 'fit-content' }}>
                          Ans: {q.correct_option}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                        <div>(A) {q.option_a}</div>
                        <div>(B) {q.option_b}</div>
                        <div>(C) {q.option_c}</div>
                        <div>(D) {q.option_d}</div>
                      </div>
                      {q.explanation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', backgroundColor: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
