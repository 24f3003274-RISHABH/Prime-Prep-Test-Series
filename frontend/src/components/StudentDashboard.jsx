import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getStudentSubjects,
  getStudentChapters,
  getStudentTests,
} from '../api/client.js';
import StudentTestInstructions from './StudentTestInstructions.jsx';
import StudentExamInterface from './StudentExamInterface.jsx';
import StudentTestResult from './StudentTestResult.jsx';
import StudentAttemptHistory from './StudentAttemptHistory.jsx';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  // Navigation views: 'catalogue' | 'instructions' | 'exam' | 'result' | 'history'
  const [activeView, setActiveView] = useState('catalogue');

  // Catalogue state
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

  // Exam / Attempt state
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [initialExamData, setInitialExamData] = useState(null);
  const [activeResultAttemptId, setActiveResultAttemptId] = useState(null);

  // Fetch published subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const data = await getStudentSubjects();
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
    setLoadingChapters(true);
    setChaptersError(null);
    try {
      const data = await getStudentChapters(subj.id);
      setChapters(data || []);
    } catch (err) {
      setChaptersError(err.message || 'Failed to load chapters.');
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleSelectChapter = async (chap) => {
    setSelectedChapter(chap);
    setLoadingTests(true);
    setTestsError(null);
    try {
      const data = await getStudentTests({
        subjectId: selectedSubject?.id,
        chapterId: chap.id,
      });
      setTests(data || []);
    } catch (err) {
      setTestsError(err.message || 'Failed to load tests.');
    } finally {
      setLoadingTests(false);
    }
  };

  const handleOpenInstructions = (testId) => {
    setActiveTestId(testId);
    setActiveView('instructions');
  };

  const handleStartExam = (sessionData) => {
    setActiveAttemptId(sessionData.attemptId);
    setInitialExamData(sessionData);
    setActiveView('exam');
  };

  const handleSubmitSuccess = (attemptId) => {
    setActiveResultAttemptId(attemptId);
    setActiveView('result');
  };

  const handleSelectHistoryAttempt = (attemptId, isInProgress, testId) => {
    if (isInProgress) {
      setActiveAttemptId(attemptId);
      setInitialExamData(null);
      setActiveView('exam');
    } else {
      setActiveResultAttemptId(attemptId);
      setActiveView('result');
    }
  };

  const filteredTests = tests.filter((t) => {
    if (activeCategoryFilter === 'ALL') return true;
    return t.test_type === activeCategoryFilter;
  });

  return (
    <div>
      {/* Top Navigation Tabs for Student Portal (hidden during active exam to avoid distraction) */}
      {activeView !== 'exam' && (
        <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${activeView === 'catalogue' || activeView === 'instructions' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                onClick={() => {
                  setActiveView('catalogue');
                  setActiveTestId(null);
                }}
              >
                📚 Browse Test Catalogue
              </button>
              <button
                type="button"
                className={`btn ${activeView === 'history' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                onClick={() => setActiveView('history')}
              >
                📊 My Test Attempts History
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Candidate: <strong>{user.fullName}</strong>
              </span>
              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }} onClick={logout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: Test Instructions */}
      {activeView === 'instructions' && activeTestId && (
        <StudentTestInstructions
          testId={activeTestId}
          onStartExam={handleStartExam}
          onBack={() => setActiveView('catalogue')}
        />
      )}

      {/* VIEW 2: Active Working Exam Interface */}
      {activeView === 'exam' && activeAttemptId && (
        <StudentExamInterface
          attemptId={activeAttemptId}
          initialData={initialExamData}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}

      {/* VIEW 3: Score and Solutions Result Page */}
      {activeView === 'result' && activeResultAttemptId && (
        <StudentTestResult
          attemptId={activeResultAttemptId}
          onBackToDashboard={() => {
            setActiveView('catalogue');
            setActiveResultAttemptId(null);
            if (selectedChapter) {
              handleSelectChapter(selectedChapter);
            }
          }}
          onViewHistory={() => {
            setActiveView('history');
            setActiveResultAttemptId(null);
          }}
        />
      )}

      {/* VIEW 4: Attempt History */}
      {activeView === 'history' && (
        <StudentAttemptHistory
          onSelectAttempt={handleSelectHistoryAttempt}
          onBackToCatalogue={() => setActiveView('catalogue')}
        />
      )}

      {/* VIEW 5: Catalogue (Subjects -> Chapters -> Tests) */}
      {activeView === 'catalogue' && (
        <div>
          {/* Breadcrumb Navigation Bar */}
          <div className="card" style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => { setSelectedSubject(null); setSelectedChapter(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                CUET PG Subjects
              </button>
              {selectedSubject && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedChapter(null); }}
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

          {/* LEVEL 1: Subjects Grid */}
          {!selectedSubject && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">CUET PG Examination Subjects</h3>
                  <p className="card-subtitle">Select your discipline to access sectional modules, full-length tests, and PYQs</p>
                </div>
                <button className="btn btn-outline" onClick={loadSubjects} disabled={loadingSubjects}>
                  {loadingSubjects ? 'Loading...' : 'Refresh Catalogue'}
                </button>
              </div>

              {subjectsError && (
                <div className="status-pill status-error" style={{ display: 'block', margin: '1rem 0', padding: '0.75rem' }}>
                  {subjectsError}
                </div>
              )}

              {loadingSubjects ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem' }}>
                  Loading subjects catalogue from PostgreSQL...
                </p>
              ) : subjects.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem' }}>
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
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem' }}>
                  Loading chapters from PostgreSQL...
                </p>
              ) : chapters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  <p>No published chapters available for {selectedSubject.name} yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {chapters.map((chap) => (
                    <div
                      key={chap.id}
                      onClick={() => handleSelectChapter(chap)}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        padding: '1.25rem',
                        backgroundColor: 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          Chapter {chap.display_order}
                        </span>
                        <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                          {chap.test_count || 0} Test(s)
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                        {chap.name}
                      </h4>

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minHeight: '2rem', marginBottom: '0.75rem' }}>
                        {chap.description || 'Topic questions covering essential CUET PG syllabus concepts.'}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                        <span>Sectional: {chap.sectional_count || 0} | Full: {chap.full_length_count || 0}</span>
                        <span>Open Tests &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: Available Test Series under Selected Chapter */}
          {selectedSubject && selectedChapter && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 className="card-title">{selectedChapter.name} &bull; Test Series</h3>
                  <p className="card-subtitle">{selectedSubject.name} &bull; Practice exams and past year question papers</p>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedChapter(null)}>
                  &larr; Back to Chapters
                </button>
              </div>

              {/* Category Filter Pills: Sectional, Full-Length, PYQ */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${activeCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => setActiveCategoryFilter('ALL')}
                >
                  All Categories ({tests.length})
                </button>
                <button
                  type="button"
                  className={`btn ${activeCategoryFilter === 'sectional' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => setActiveCategoryFilter('sectional')}
                >
                  1. Sectional Tests ({tests.filter((t) => t.test_type === 'sectional').length})
                </button>
                <button
                  type="button"
                  className={`btn ${activeCategoryFilter === 'full_length' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => setActiveCategoryFilter('full_length')}
                >
                  2. Full-Length Mocks ({tests.filter((t) => t.test_type === 'full_length').length})
                </button>
                <button
                  type="button"
                  className={`btn ${activeCategoryFilter === 'pyq' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => setActiveCategoryFilter('pyq')}
                >
                  3. PYQ Papers ({tests.filter((t) => t.test_type === 'pyq').length})
                </button>
              </div>

              {testsError && (
                <div className="status-pill status-error" style={{ display: 'block', margin: '1rem 0', padding: '0.75rem' }}>
                  {testsError}
                </div>
              )}

              {loadingTests ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem' }}>
                  Loading tests from PostgreSQL...
                </p>
              ) : filteredTests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  <p style={{ fontSize: '1rem' }}>No published tests found in this category.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {filteredTests.map((t) => {
                    const hasQuestions = (t.question_count || 0) > 0;
                    const hasAttempted = Boolean(t.latest_attempt_id);

                    return (
                      <div
                        key={t.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          padding: '1.25rem',
                          backgroundColor: 'var(--color-surface)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="status-pill status-primary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                              {t.test_type.replace('_', ' ')} #{t.test_number || 1}
                            </span>
                            <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                              {t.access_type.toUpperCase()}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                            {t.title}
                          </h4>

                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem' }}>
                            {t.description || 'Standard CUET PG pattern test series with positive and negative marking.'}
                          </p>
                        </div>

                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius)', fontSize: '0.75rem', marginBottom: '0.85rem' }}>
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Duration:</span>
                              <div style={{ fontWeight: 600 }}>{t.duration_minutes} min</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Marking:</span>
                              <div style={{ fontWeight: 600 }}>+{t.positive_marks} / -{t.negative_marks}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Questions:</span>
                              <div style={{ fontWeight: 600, color: hasQuestions ? '#16a34a' : '#dc2626' }}>
                                {t.question_count || 0} Qs
                              </div>
                            </div>
                          </div>

                          {/* Attempt Status Badge if student attempted this test */}
                          {hasAttempted && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.35rem 0.5rem', backgroundColor: '#eff6ff', borderRadius: '4px', fontSize: '0.75rem' }}>
                              <span>Status: <strong>{t.latest_attempt_status?.toUpperCase()}</strong></span>
                              {t.latest_attempt_score !== null && (
                                <span style={{ fontWeight: 700, color: '#16a34a' }}>Score: {t.latest_attempt_score}</span>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700 }}
                              onClick={() => handleOpenInstructions(t.id)}
                              disabled={!hasQuestions}
                            >
                              {t.latest_attempt_status === 'in_progress' ? 'Resume Test &rarr;' : hasAttempted ? 'Take / Retake Test &rarr;' : 'Open Test Instructions &rarr;'}
                            </button>

                            {hasAttempted && t.latest_attempt_status === 'submitted' && t.latest_attempt_id && (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                                onClick={() => handleSubmitSuccess(t.latest_attempt_id)}
                              >
                                View Last Score & Solutions &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
