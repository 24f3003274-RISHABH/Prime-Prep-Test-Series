import React, { useState, useEffect } from 'react';
import {
  getSubjects,
  getAdminSubjectTests,
  createAdminSubjectTest,
  previewQuestionImport,
  confirmQuestionImport,
  getTestQuestions,
} from '../api/client.js';

export default function AdminBulkQuestionUpload() {
  // Step selections (Strictly Subject -> Category -> Test)
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [testCategory, setTestCategory] = useState('sectional'); // 'sectional' | 'full_length' | 'pyq'
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');

  // Loading states
  const [loadingSubjects, setLoadingSubjects] = useState(false);
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

  // 2. Fetch Tests when selectedSubjectId or testCategory changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setTests([]);
      setSelectedTestId('');
      return;
    }
    fetchTests(selectedSubjectId, testCategory);
  }, [selectedSubjectId, testCategory]);

  const fetchTests = async (subjectId, category) => {
    setLoadingTests(true);
    setGeneralError('');
    try {
      const data = await getAdminSubjectTests(subjectId, category);
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

  // Quick-create a new test
  const handleQuickCreateTest = async (e) => {
    e.preventDefault();
    if (!newTestTitle.trim()) {
      alert('Test title is required.');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject first.');
      return;
    }
    setCreatingTest(true);
    try {
      const created = await createAdminSubjectTest(selectedSubjectId, {
        title: newTestTitle.trim(),
        testType: testCategory,
        testNumber: newTestNumber ? parseInt(newTestNumber, 10) : undefined,
        durationMinutes: parseInt(newTestDuration, 10) || (testCategory === 'sectional' ? 30 : 105),
        publicationStatus: 'draft',
      });
      setShowCreateTest(false);
      setNewTestTitle('');
      setNewTestNumber('');
      // Refresh tests and auto-select new test
      await fetchTests(selectedSubjectId, testCategory);
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
      'Question,Option A,Option B,Option C,Option D,Answer,Solution,Subject,Test Type,Test Number\n' +
      '"Who founded the Bolshevik Communist Party?","Vladimir Lenin","Joseph Stalin","Nikita Khrushchev","Leonid Brezhnev","A","Vladimir Lenin founded the Bolshevik faction in 1903.","Political Science","SECTIONAL","1"\n' +
      '"Which article of the Indian Constitution deals with the Right to Equality?","Article 14","Article 19","Article 21","Article 32","A","Article 14 guarantees equality before the law and equal protection of laws.","Political Science","SECTIONAL","1"\n' +
      '"Who is considered the father of Western political philosophy?","Socrates","Plato","Aristotle","Niccolò Machiavelli","B","Plato established the Academy in Athens and wrote The Republic.","Political Science","SECTIONAL","1"\n';

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

  // Step: Upload & Preview
  const handleGeneratePreview = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setGeneralError('');

    if (!selectedSubjectId) {
      setGeneralError('Step 1: Please select a Subject.');
      return;
    }
    if (!selectedTestId) {
      setGeneralError('Step 3: Please select or create a destination Test Series.');
      return;
    }
    if (!file) {
      setGeneralError('Step 4: Please choose or drop an Excel (.xlsx/.xls) or CSV file to upload.');
      return;
    }

    setUploading(true);
    setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('testId', selectedTestId);
      formData.append('subjectId', selectedSubjectId);
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
        testType: testCategory,
        questions: previewData.validQuestions,
        allowDuplicates,
      };

      const result = await confirmQuestionImport(payload);
      setImportReport(result);
      setPreviewData(null);
      setFile(null);
      // Refresh tests to update question count
      fetchTests(selectedSubjectId, testCategory);
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
              Import spreadsheet questions (.xlsx, .xls, .csv) directly into CUET PG subjects and test series without chapters.
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
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setImportReport(null)}
              >
                Dismiss
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Questions Inserted</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{importReport.importedCount}</div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Total in Destination Test</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{importReport.totalQuestionsInTest}</div>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Destination Test</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {importReport.test?.title || selectedTest?.title}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', backgroundColor: '#15803d', borderColor: '#15803d' }}
                onClick={() => handleViewTestQuestions(importReport.test?.id || selectedTestId)}
              >
                Inspect All Questions in Test &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* DESTINATION SELECTION: Subject -> Category -> Test */}
        {/* ======================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* STEP 1: SUBJECT */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              1. Subject Discipline
            </label>
            <select
              className="form-input"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={loadingSubjects || uploading || importing}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.paper_code || 'CUET'})
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: TEST CATEGORY */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              2. Test Category
            </label>
            <select
              className="form-input"
              value={testCategory}
              onChange={(e) => setTestCategory(e.target.value)}
              disabled={uploading || importing}
            >
              <option value="sectional">Sectional Tests</option>
              <option value="full_length">Full-Length Mocks</option>
              <option value="pyq">Previous Year Questions (PYQ)</option>
            </select>
          </div>

          {/* STEP 3: DESTINATION TEST SERIES */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                3. Destination Test ({tests.length})
              </label>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={() => {
                  setNewTestTitle(`${selectedSubject ? selectedSubject.name : ''} ${testCategory.toUpperCase()} Test 0${tests.length + 1}`);
                  setNewTestNumber(tests.length + 1);
                  setNewTestDuration(testCategory === 'sectional' ? 30 : 105);
                  setShowCreateTest(true);
                }}
              >
                + Quick Create Test
              </button>
            </div>

            <select
              className="form-input"
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              disabled={loadingTests || uploading || importing || tests.length === 0}
            >
              {tests.length === 0 ? (
                <option value="">No tests exist in this category yet</option>
              ) : (
                tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.question_count || 0} Qs) {t.publication_status === 'published' ? '[Live]' : '[Draft]'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Destination Summary Card */}
        {selectedTest && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Target Import Destination:
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {selectedSubject?.name} &rsaquo; {testCategory.replace('_', ' ').toUpperCase()} &rsaquo; {selectedTest.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                Current questions: <strong>{selectedTest.question_count || 0}</strong> | Duration: {selectedTest.duration_minutes}m | Status: {selectedTest.publication_status}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                onClick={() => handleViewTestQuestions(selectedTest.id)}
              >
                👁️ View Questions ({selectedTest.question_count || 0})
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: FILE UPLOAD DRAG & DROP ZONE */}
        {/* ======================================================== */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
              4. Select Excel (.xlsx, .xls) or CSV File
            </label>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', color: '#166534', borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
              onClick={handleDownloadTemplate}
            >
              ⬇️ Download Sample Template (.csv)
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) {
                handleFileChange({ target: { files: [dropped] } });
              }
            }}
            style={{
              border: dragOver ? '2px dashed var(--color-primary)' : '2px dashed #cbd5e1',
              backgroundColor: dragOver ? '#eff6ff' : '#f8fafc',
              borderRadius: 'var(--radius)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => document.getElementById('excel-file-input')?.click()}
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📊</div>

            {file ? (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Selected: {file.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {(file.size / 1024).toFixed(1)} KB &bull; Click to replace file
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Drag & Drop Excel or CSV file here, or click to browse
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> spreadsheets
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Parse & Preview */}
        {!previewData && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!file || !selectedTestId || uploading}
              onClick={handleGeneratePreview}
              style={{ fontSize: '0.95rem', padding: '0.6rem 1.5rem', fontWeight: 700 }}
            >
              {uploading ? 'Analyzing Spreadsheet...' : 'Validate & Preview Questions &rarr;'}
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PREVIEW & VALIDATION TABLE */}
        {/* ======================================================== */}
        {previewData && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Pre-Import Validation Results
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Reviewed {previewData.summary?.totalRows || 0} rows from <strong>{file?.name}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCancelPreview} disabled={importing}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmImport}
                  disabled={importing || previewData.validQuestions?.length === 0}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
                >
                  {importing ? 'Importing...' : `Confirm & Commit ${previewData.validQuestions?.length || 0} Questions`}
                </button>
              </div>
            </div>

            {/* Validation Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Valid Questions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
                  {previewData.validQuestions?.length || 0}
                </div>
              </div>

              <div style={{ backgroundColor: previewData.validationErrors?.length > 0 ? '#fef2f2' : '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: previewData.validationErrors?.length > 0 ? '1px solid #fecaca' : '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: previewData.validationErrors?.length > 0 ? '#991b1b' : 'var(--color-text-muted)', fontWeight: 600 }}>
                  Syntax / Row Errors
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: previewData.validationErrors?.length > 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                  {previewData.validationErrors?.length || 0}
                </div>
              </div>

              <div style={{ backgroundColor: previewData.duplicatesInDb?.length > 0 ? '#fffbeb' : '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: previewData.duplicatesInDb?.length > 0 ? '1px solid #fde68a' : '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: previewData.duplicatesInDb?.length > 0 ? '#92400e' : 'var(--color-text-muted)', fontWeight: 600 }}>
                  Duplicate in Test
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: previewData.duplicatesInDb?.length > 0 ? '#d97706' : 'var(--color-text-muted)' }}>
                  {previewData.duplicatesInDb?.length || 0}
                </div>
              </div>
            </div>

            {/* Validation Errors Table (if any) */}
            {previewData.validationErrors && previewData.validationErrors.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                  ⚠️ Rows with Errors (Will be Skipped):
                </h5>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: '4px', backgroundColor: '#fff5f5' }}>
                  <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Row</th>
                        <th>Error Cause</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.validationErrors.map((err, errIdx) => (
                        <tr key={errIdx}>
                          <td style={{ fontWeight: 700 }}>Row {err.row}</td>
                          <td style={{ color: '#991b1b' }}>{err.error || err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Valid Questions Preview Table */}
            <h5 style={{ fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
              Preview Valid Questions ({previewData.validQuestions?.length || 0}):
            </h5>
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>Question Text</th>
                    <th>Option A</th>
                    <th>Option B</th>
                    <th>Option C</th>
                    <th>Option D</th>
                    <th style={{ width: '55px' }}>Ans</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.validQuestions?.map((q, qIdx) => (
                    <tr key={qIdx}>
                      <td style={{ fontWeight: 700 }}>{qIdx + 1}</td>
                      <td style={{ fontWeight: 600, maxWidth: '240px' }}>{q.questionText}</td>
                      <td>{q.optionA}</td>
                      <td>{q.optionB}</td>
                      <td>{q.optionC}</td>
                      <td>{q.optionD}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{q.correctOption}</td>
                      <td style={{ maxWidth: '180px', color: 'var(--color-text-muted)' }}>{q.explanation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline" onClick={handleCancelPreview} disabled={importing}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={importing || previewData.validQuestions?.length === 0}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
              >
                {importing ? 'Importing to PostgreSQL...' : `Confirm & Commit ${previewData.validQuestions?.length || 0} Questions`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: QUICK CREATE NEW TEST */}
      {/* ======================================================== */}
      {showCreateTest && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', margin: 0 }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Quick Create New Test Series
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Creating test under <strong>{selectedSubject?.name}</strong> &rsaquo; <strong>{testCategory.toUpperCase()}</strong>.
            </p>

            <form onSubmit={handleQuickCreateTest}>
              <div className="form-group">
                <label className="form-label">Test Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Political Science Sectional Test 01"
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Test Number</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newTestNumber}
                    onChange={(e) => setNewTestNumber(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateTest(false)}
                  disabled={creatingTest}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingTest}>
                  {creatingTest ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW TEST QUESTIONS */}
      {/* ======================================================== */}
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
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Questions in Test: {selectedTest?.title}
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Total: {testQuestionsList?.length || 0} Questions
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setViewingQuestions(false)}
              >
                Close ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingQuestionsList ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  Loading questions...
                </div>
              ) : !testQuestionsList || testQuestionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No questions currently attached to this test.
                </div>
              ) : (
                testQuestionsList.map((q, idx) => (
                  <div
                    key={q.id || idx}
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
                        Q{idx + 1}
                      </span>
                      <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                        Answer: Option {q.correct_option}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                      {q.question_text}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.35rem', fontSize: '0.8rem' }}>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', backgroundColor: '#eff6ff', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
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
    </div>
  );
}
