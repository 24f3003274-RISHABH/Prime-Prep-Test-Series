import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSubjects, getChaptersBySubject, getTestsByChapter, getTest } from '../api/client.js';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  // Catalogue navigation state
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chaptersError, setChaptersError] = useState(null);

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsError, setTestsError] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL'); // 'ALL' | 'sectional' | 'full_length' | 'pyq'

  const [selectedTestDetail, setSelectedTestDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch published subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const data = await getSubjects('published');
      setSubjects(data || []);
    } catch (err) {
      setSubjectsError(err.message || 'Failed to load subjects catalogue.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSelectSubject = async (subj) => {
    setSelectedSubject(subj);
    setSelectedChapter(null);
    setSelectedTestDetail(null);
    setLoadingChapters(true);
    setChaptersError(null);
    try {
      const data = await getChaptersBySubject(subj.id);
      setChapters(data || []);
    } catch (err) {
      setChaptersError(err.message || 'Failed to load chapters.');
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleSelectChapter = async (chap) => {
    setSelectedChapter(chap);
    setSelectedTestDetail(null);
    setLoadingTests(true);
    setTestsError(null);
    try {
      const data = await getTestsByChapter(chap.id);
      setTests(data || []);
    } catch (err) {
      setTestsError(err.message || 'Failed to load tests.');
    } finally {
      setLoadingTests(false);
    }
  };

  const handleViewTestDetail = async (testId) => {
    setLoadingDetail(true);
    try {
      const detail = await getTest(testId);
      setSelectedTestDetail(detail);
    } catch (err) {
      alert(`Could not load test details: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (activeCategoryFilter === 'ALL') return true;
    return t.test_type === activeCategoryFilter;
  });

  return (
    <div>
      {/* Student Profile Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Welcome back, {user.fullName}!</h2>
            <p className="card-subtitle">CUET PG Test Series &bull; Student Preparation Portal</p>
          </div>
          <span className="status-pill status-success">STUDENT ACCOUNT</span>
        </div>

        <table className="data-table">
          <tbody>
            <tr>
              <td style={{ width: '200px', fontWeight: 600 }}>Student ID</td>
              <td><code>{user.id}</code></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Email Address</td>
              <td>{user.email}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Role</td>
              <td><code>{user.role}</code> (Enforced server-side)</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <button
            onClick={() => { setSelectedSubject(null); setSelectedChapter(null); setSelectedTestDetail(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            Subjects Catalogue
          </button>
          {selectedSubject && (
            <>
              <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
              <button
                onClick={() => { setSelectedChapter(null); setSelectedTestDetail(null); }}
                style={{ background: 'none', border: 'none', color: selectedChapter ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {selectedSubject.name}
              </button>
            </>
          )}
          {selectedChapter && (
            <>
              <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {selectedChapter.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* LEVEL 1: Subjects Catalogue */}
      {!selectedSubject && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">CUET PG Subject Catalogue</h3>
              <p className="card-subtitle">Select your examination subject to explore chapter modules and mock test series</p>
            </div>
            <button className="btn btn-outline" onClick={loadSubjects} disabled={loadingSubjects}>
              {loadingSubjects ? 'Refreshing...' : 'Refresh Catalogue'}
            </button>
          </div>

          {subjectsError && (
            <div className="status-pill status-error" style={{ display: 'block', margin: '1rem 0', padding: '0.75rem' }}>
              {subjectsError}
            </div>
          )}

          {loadingSubjects ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
              Loading examination catalogue from PostgreSQL...
            </p>
          ) : subjects.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
              No published subjects available at this time.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {subjects.map((subj) => (
                <div
                  key={subj.id}
                  onClick={() => handleSelectSubject(subj)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {subj.paper_code || subj.code || 'CUET PG'}
                    </span>
                    <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                      PUBLISHED
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                    {subj.name}
                  </h4>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minHeight: '2.5rem', marginBottom: '1rem' }}>
                    {subj.description || 'Comprehensive CUET PG preparation syllabus with Sectional, Full-Length, and PYQ tests.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <span>📚 {subj.chapter_count || 0} Chapter(s)</span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Explore Chapters &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEVEL 2: Chapters in Selected Subject */}
      {selectedSubject && !selectedChapter && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">{selectedSubject.name} &bull; Chapters</h3>
              <p className="card-subtitle">{selectedSubject.description || 'Explore syllabus modules and test series'}</p>
            </div>
            <button className="btn btn-outline" onClick={() => setSelectedSubject(null)}>
              &larr; Back to Subjects
            </button>
          </div>

          {chaptersError && (
            <div className="status-pill status-error" style={{ display: 'block', margin: '1rem 0', padding: '0.75rem' }}>
              {chaptersError}
            </div>
          )}

          {loadingChapters ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
              Loading chapters...
            </p>
          ) : chapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No published chapters currently available under this subject.</p>
              <button className="btn btn-outline" onClick={() => setSelectedSubject(null)}>
                Choose Another Subject
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {chapters.map((chap, idx) => (
                <div
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
                    CHAPTER #{chap.display_order || idx + 1}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    {chap.name}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minHeight: '2.5rem', marginBottom: '0.75rem' }}>
                    {chap.description || 'Topic-wise mock tests, full-length papers, and past year question series.'}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: '0.75rem' }}>
                    <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                      {chap.sectional_count || 0} Sectional
                    </span>
                    <span className="status-pill status-warning" style={{ fontSize: '0.7rem' }}>
                      {chap.full_length_count || 0} Full-Length
                    </span>
                    <span className="status-pill status-success" style={{ fontSize: '0.7rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      {chap.pyq_count || 0} PYQ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEVEL 3: Tests in Selected Chapter */}
      {selectedSubject && selectedChapter && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">{selectedChapter.name} &bull; Available Tests</h3>
              <p className="card-subtitle">Subject: {selectedSubject.name} &bull; Chapter #{selectedChapter.display_order}</p>
            </div>
            <button className="btn btn-outline" onClick={() => setSelectedChapter(null)}>
              &larr; Back to Chapters
            </button>
          </div>

          {/* Test Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            {[
              { id: 'ALL', label: `All Tests (${tests.length})` },
              { id: 'sectional', label: `Sectional Tests (${tests.filter(t => t.test_type === 'sectional').length})` },
              { id: 'full_length', label: `Full-Length Tests (${tests.filter(t => t.test_type === 'full_length').length})` },
              { id: 'pyq', label: `PYQ Tests (${tests.filter(t => t.test_type === 'pyq').length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id)}
                className={`nav-btn ${activeCategoryFilter === tab.id ? 'active' : ''}`}
                style={{ fontSize: '0.85rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {testsError && (
            <div className="status-pill status-error" style={{ display: 'block', margin: '1rem 0', padding: '0.75rem' }}>
              {testsError}
            </div>
          )}

          {loadingTests ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
              Loading test series...
            </p>
          ) : filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <p>No published tests found in this category.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className={`status-pill ${test.test_type === 'sectional' ? 'status-success' : test.test_type === 'full_length' ? 'status-warning' : 'status-success'}`} style={{ fontSize: '0.7rem' }}>
                        {test.test_type.replace('_', ' ').toUpperCase()} #{test.test_number || test.display_order}
                      </span>
                      <span className={`status-pill ${test.access_type === 'free' ? 'status-success' : 'status-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {test.access_type.toUpperCase()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                      {test.title}
                    </h4>

                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                      {test.description || 'Standard CUET PG pattern questions with positive and negative marking.'}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Duration:</span>
                        <div style={{ fontWeight: 600 }}>{test.duration_minutes} min</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Marking:</span>
                        <div style={{ fontWeight: 600 }}>+{test.positive_marks} / -{test.negative_marks}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Questions:</span>
                        <div style={{ fontWeight: 600 }}>{test.question_count || 0} Qs</div>
                      </div>
                    </div>

                    <button
                      className="btn btn-outline"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                      onClick={() => handleViewTestDetail(test.id)}
                      disabled={loadingDetail}
                    >
                      View Test Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Detail Modal / Overview */}
      {selectedTestDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">{selectedTestDetail.title}</h3>
                <p className="card-subtitle">{selectedTestDetail.subject_name} &bull; {selectedTestDetail.chapter_name}</p>
              </div>
              <button
                onClick={() => setSelectedTestDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                &times;
              </button>
            </div>

            <table className="data-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, width: '180px' }}>Category</td>
                  <td>
                    <span className="status-pill status-success">
                      {selectedTestDetail.test_type?.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Test Number</td>
                  <td>#{selectedTestDetail.test_number}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Access Type</td>
                  <td>
                    <span className={`status-pill ${selectedTestDetail.access_type === 'free' ? 'status-success' : 'status-warning'}`}>
                      {selectedTestDetail.access_type?.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Duration</td>
                  <td>{selectedTestDetail.duration_minutes} Minutes</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Marking Scheme</td>
                  <td>+{selectedTestDetail.positive_marks} for correct, -{selectedTestDetail.negative_marks} for incorrect</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Questions Mapped</td>
                  <td>{selectedTestDetail.question_count || 0} Questions</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Allowed Attempts</td>
                  <td>{selectedTestDetail.max_attempts || 1} Attempt</td>
                </tr>
              </tbody>
            </table>

            {selectedTestDetail.instructions && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius)' }}>
                <strong style={{ fontSize: '0.85rem' }}>Examination Instructions:</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                  {selectedTestDetail.instructions}
                </p>
              </div>
            )}

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setSelectedTestDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
