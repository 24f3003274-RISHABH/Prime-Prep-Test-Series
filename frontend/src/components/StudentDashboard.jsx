import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getStudentSubjects,
  getStudentChapters,
  getStudentTests,
  getStudentAttemptsList,
  getStudentProfile,
} from '../api/client.js';
import StudentTestInstructions from './StudentTestInstructions.jsx';
import StudentExamInterface from './StudentExamInterface.jsx';
import StudentTestResult from './StudentTestResult.jsx';
import StudentAttemptHistory from './StudentAttemptHistory.jsx';
import StudentProfile from './StudentProfile.jsx';

export default function StudentDashboard({ initialSection = 'dashboard', initialSubjectId = null }) {
  const { user, logout } = useAuth();

  // Primary navigation: 'dashboard' | 'subjects' | 'results' | 'profile'
  // Sub-views for examination flow: 'instructions' | 'exam' | 'result'
  const [activeSection, setActiveSection] = useState(initialSection);

  // Sync if initialSection prop changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Overall subjects catalogue
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState(null);

  // Selected subject & category hierarchy
  // Category is one of: 'sectional' | 'full_length' | 'pyq'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('sectional');
  const [selectedChapterId, setSelectedChapterId] = useState('ALL');

  // Chapters & Tests for selected subject
  const [chapters, setChapters] = useState([]);
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsError, setTestsError] = useState(null);

  // Candidate Attempts & Stats overview
  const [attempts, setAttempts] = useState([]);
  const [profileStats, setProfileStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Active Exam / Result inspection state
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [initialExamData, setInitialExamData] = useState(null);
  const [activeResultAttemptId, setActiveResultAttemptId] = useState(null);

  // 1. Load subjects and student attempts on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingSubjects(true);
    setLoadingDashboard(true);
    try {
      const [subjectsData, attemptsData, profileData] = await Promise.all([
        getStudentSubjects().catch(() => []),
        getStudentAttemptsList().catch(() => []),
        getStudentProfile().catch(() => null),
      ]);

      setSubjects(subjectsData || []);
      setAttempts(attemptsData || []);
      setProfileStats(profileData || null);

      // Default selected subject
      if (subjectsData && subjectsData.length > 0) {
        if (initialSubjectId) {
          const matched = subjectsData.find((s) => s.id === initialSubjectId);
          setSelectedSubject(matched || subjectsData[0]);
        } else {
          // If user has a target subject preference, default to that subject
          const targetCode = profileData?.targetSubjectCode;
          const targetSubj = targetCode
            ? subjectsData.find((s) => s.paper_code === targetCode || s.code === targetCode)
            : null;
          setSelectedSubject(targetSubj || subjectsData[0]);
        }
      }
    } catch (err) {
      setSubjectsError(err.message || 'Failed to load initial data.');
    } finally {
      setLoadingSubjects(false);
      setLoadingDashboard(false);
    }
  };

  // 2. When selectedSubject or activeCategory changes, load tests and chapters
  useEffect(() => {
    if (selectedSubject) {
      loadSubjectDetails(selectedSubject.id);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      loadCategoryTests(selectedSubject.id, activeCategory, selectedChapterId);
    }
  }, [selectedSubject, activeCategory, selectedChapterId]);

  const loadSubjectDetails = async (subjId) => {
    try {
      const chapData = await getStudentChapters(subjId);
      setChapters(chapData || []);
      setSelectedChapterId('ALL');
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const loadCategoryTests = async (subjId, category, chapId) => {
    setLoadingTests(true);
    setTestsError(null);
    try {
      const testsData = await getStudentTests({
        subjectId: subjId,
        chapterId: chapId !== 'ALL' ? chapId : undefined,
        category: category,
      });
      setTests(testsData || []);
    } catch (err) {
      setTestsError(err.message || 'Failed to load tests.');
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  // Navigation handlers
  const handleSelectSubject = (subj, category = 'sectional') => {
    setSelectedSubject(subj);
    setActiveCategory(category);
    setSelectedChapterId('ALL');
    setActiveSection('subjects');
  };

  const handleOpenTestInstructions = (testId) => {
    setActiveTestId(testId);
    setActiveSection('instructions');
  };

  const handleStartExam = (sessionData) => {
    setActiveAttemptId(sessionData.attemptId);
    setInitialExamData(sessionData);
    setActiveSection('exam');
  };

  const handleSubmitSuccess = (attemptId) => {
    setActiveResultAttemptId(attemptId);
    setActiveSection('result');
    // Refresh attempts in background
    getStudentAttemptsList().then((data) => setAttempts(data || []));
  };

  const handleSelectHistoryAttempt = (attemptId, isInProgress, testId) => {
    if (isInProgress) {
      setActiveAttemptId(attemptId);
      setInitialExamData(null);
      setActiveSection('exam');
    } else {
      setActiveResultAttemptId(attemptId);
      setActiveSection('result');
    }
  };

  // Find any active in-progress attempt for candidate
  const inProgressAttempt = attempts.find((a) => a.status === 'in_progress');

  // Compute quick performance stats
  const completedAttempts = attempts.filter((a) => a.status === 'submitted');
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / completedAttempts.length).toFixed(1)
    : '0.0';
  const avgAccuracy = completedAttempts.length > 0
    ? (completedAttempts.reduce((acc, curr) => acc + (parseFloat(curr.accuracyPercentage) || 0), 0) / completedAttempts.length).toFixed(1)
    : '0.0';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* PrimePrep Student Top-level Sub-Header Navigation (hidden during active examination) */}
      {activeSection !== 'exam' && (
        <div
          className="card"
          style={{
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${activeSection === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                onClick={() => setActiveSection('dashboard')}
              >
                📊 Dashboard
              </button>

              <button
                type="button"
                className={`btn ${activeSection === 'subjects' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                onClick={() => setActiveSection('subjects')}
              >
                📚 Subjects
              </button>

              <button
                type="button"
                className={`btn ${activeSection === 'results' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                onClick={() => setActiveSection('results')}
              >
                🏆 My Results
              </button>

              <button
                type="button"
                className={`btn ${activeSection === 'profile' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                onClick={() => setActiveSection('profile')}
              >
                👤 Profile
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Candidate: <strong>{user?.fullName || user?.email}</strong>
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: DASHBOARD
         ========================================================================= */}
      {activeSection === 'dashboard' && (
        <div>
          {/* Welcome Greeting Banner */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
              color: '#ffffff',
              padding: '1.75rem 2rem',
              marginBottom: '1.5rem',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  CUET PG TEST PREPARATION
                </span>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0.5rem 0 0.35rem 0', color: '#ffffff' }}>
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Candidate'}!
                </h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>
                  Track your mastery across sectional modules, full-length simulations, and previous-year question papers.
                </p>
              </div>

              <button
                type="button"
                className="btn"
                style={{
                  backgroundColor: '#ffffff',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '0.6rem 1.25rem',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                onClick={() => setActiveSection('subjects')}
              >
                Practice Test Series &rarr;
              </button>
            </div>
          </div>

          {/* In-Progress Test Banner Callout */}
          {inProgressAttempt && (
            <div
              className="card"
              style={{
                backgroundColor: '#fffbeb',
                borderColor: '#fde68a',
                borderWidth: '2px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="status-pill status-warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    ACTIVE EXAM IN PROGRESS
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                    {inProgressAttempt.subjectName}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#78350f' }}>
                  {inProgressAttempt.testTitle}
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#92400e' }}>
                  Started on {new Date(inProgressAttempt.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  Your timer and answers are synchronized with PostgreSQL.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
                onClick={() => handleSelectHistoryAttempt(inProgressAttempt.id, true, inProgressAttempt.testId)}
              >
                Resume Examination &rarr;
              </button>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Total Attempts
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                {attempts.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {completedAttempts.length} Submitted &bull; {inProgressAttempt ? 1 : 0} Active
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Average Score
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                {avgScore}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Marking: +4 per correct, -1 per incorrect
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Accuracy Rate
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>
                {avgAccuracy}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Based on completed tests
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Target Discipline
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
                {profileStats?.targetSubjectCode ? (
                  subjects.find((s) => s.paper_code === profileStats.targetSubjectCode)?.name || profileStats.targetSubjectCode
                ) : (
                  'Not set'
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Edit in Profile &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Quick Subject Access: The 7 CUET PG Subjects with Sectional, Full-Length, and PYQ Links */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">CUET PG Subjects Catalogue</h3>
                <p className="card-subtitle">Select a subject to explore Sectional Tests (1–15), Full-Length Mocks (1–10), and PYQ Tests (1–5)</p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveSection('subjects')}
                style={{ fontSize: '0.85rem' }}
              >
                View Full Hierarchy &rarr;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {subjects.map((subj) => (
                <div
                  key={subj.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                      {subj.paper_code || subj.code || 'CUET PG'}
                    </span>
                    <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                      {subj.test_count || 0} Tests Available
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    {subj.name}
                  </h4>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', minHeight: '2.5rem' }}>
                    {subj.description || 'Comprehensive CUET PG preparation syllabus.'}
                  </p>

                  {/* 3 Categories Badges */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', flex: 1 }}
                      onClick={() => handleSelectSubject(subj, 'sectional')}
                    >
                      Sectional
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', flex: 1 }}
                      onClick={() => handleSelectSubject(subj, 'full_length')}
                    >
                      Full-Length
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', flex: 1 }}
                      onClick={() => handleSelectSubject(subj, 'pyq')}
                    >
                      PYQ Tests
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Test Attempts Table */}
          {completedAttempts.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">Recent Test Results</h3>
                  <p className="card-subtitle">Your latest examination submissions and scorecards</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveSection('results')}
                  style={{ fontSize: '0.85rem' }}
                >
                  View All Scorecards ({completedAttempts.length}) &rarr;
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Submitted</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedAttempts.slice(0, 5).map((att) => (
                      <tr key={att.id}>
                        <td><strong>{att.testTitle}</strong></td>
                        <td>{att.subjectName}</td>
                        <td>
                          <span className="status-pill status-secondary" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {att.testType?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {new Date(att.submittedAt || att.startedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <strong style={{ color: att.score >= 0 ? '#16a34a' : '#dc2626' }}>
                            {att.score}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}> / {att.maxPossibleMarks}</span>
                        </td>
                        <td>{att.accuracyPercentage}%</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleSelectHistoryAttempt(att.id, false, att.testId)}
                          >
                            View Solutions &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: SUBJECTS (Political Science, Philosophy, Psychology, etc. -> Sectional, Full-Length, PYQ)
         ========================================================================= */}
      {activeSection === 'subjects' && (
        <div>
          {/* Top Subjects Navigation Pills / Selector */}
          <div
            className="card"
            style={{
              padding: '1rem',
              marginBottom: '1.25rem',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Select CUET PG Subject:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {subjects.map((subj) => {
                const isSelected = selectedSubject?.id === subj.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                    onClick={() => handleSelectSubject(subj, activeCategory)}
                  >
                    <span>{subj.name}</span>
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        fontSize: '0.75rem',
                        opacity: 0.85,
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                      }}
                    >
                      {subj.paper_code || subj.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Subject Main Pane */}
          {selectedSubject && (
            <div className="card">
              {/* Subject Title & Description Header */}
              <div
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                      {selectedSubject.name}
                    </h2>
                    <span className="status-pill status-primary" style={{ fontWeight: 700 }}>
                      Paper Code: {selectedSubject.paper_code || selectedSubject.code || 'CUET PG'}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '750px' }}>
                    {selectedSubject.description || 'Comprehensive CUET PG preparation syllabus.'}
                  </p>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                  <div><strong>{chapters.length}</strong> Published Chapters</div>
                  <div><strong>{selectedSubject.test_count || tests.length}</strong> Total Tests</div>
                </div>
              </div>

              {/* THE 3 CATEGORIES: Sectional Tests, Full-Length Tests, PYQ Tests */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  borderBottom: '2px solid var(--color-border)',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.25rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory('sectional')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeCategory === 'sectional' ? '3px solid var(--color-primary)' : '3px solid transparent',
                    color: activeCategory === 'sectional' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: activeCategory === 'sectional' ? 700 : 500,
                    fontSize: '0.95rem',
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📑 Sectional Tests
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      backgroundColor: activeCategory === 'sectional' ? '#eff6ff' : '#f1f5f9',
                      color: activeCategory === 'sectional' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    1–15
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('full_length')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeCategory === 'full_length' ? '3px solid var(--color-primary)' : '3px solid transparent',
                    color: activeCategory === 'full_length' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: activeCategory === 'full_length' ? 700 : 500,
                    fontSize: '0.95rem',
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🎯 Full-Length Mocks
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      backgroundColor: activeCategory === 'full_length' ? '#eff6ff' : '#f1f5f9',
                      color: activeCategory === 'full_length' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    1–10
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('pyq')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeCategory === 'pyq' ? '3px solid var(--color-primary)' : '3px solid transparent',
                    color: activeCategory === 'pyq' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: activeCategory === 'pyq' ? 700 : 500,
                    fontSize: '0.95rem',
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📖 PYQ Tests
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      backgroundColor: activeCategory === 'pyq' ? '#eff6ff' : '#f1f5f9',
                      color: activeCategory === 'pyq' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    1–5
                  </span>
                </button>
              </div>

              {/* Sub-filter: Chapter Selector */}
              {chapters.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    Filter by Chapter:
                  </span>
                  <select
                    className="input-field"
                    style={{ maxWidth: '320px', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                  >
                    <option value="ALL">All Chapters ({chapters.length})</option>
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        Chapter {c.display_order}: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tests Grid */}
              {testsError && (
                <div className="status-pill status-error" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                  {testsError}
                </div>
              )}

              {loadingTests ? (
                <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-muted)' }}>
                  Loading {activeCategory.replace('_', ' ')} tests for {selectedSubject.name}...
                </div>
              ) : tests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-muted)' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    No published {activeCategory.replace('_', ' ')} tests available in this selection yet.
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    Please check another category or chapter.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {tests.map((t) => {
                    const hasQuestions = (t.question_count || 0) > 0;
                    const hasAttempted = Boolean(t.latest_attempt_id);
                    const isInProgress = t.latest_attempt_status === 'in_progress';
                    const isSubmitted = t.latest_attempt_status === 'submitted';

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
                          position: 'relative',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                              TEST #{t.test_number || '1'} &bull; {t.chapter_name || 'General'}
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              {t.access_type === 'free' ? (
                                <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>FREE</span>
                              ) : (
                                <span className="status-pill status-primary" style={{ fontSize: '0.7rem' }}>PAID</span>
                              )}
                              {isInProgress && (
                                <span className="status-pill status-warning" style={{ fontSize: '0.7rem' }}>RESUMABLE</span>
                              )}
                            </div>
                          </div>

                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                            {t.title}
                          </h4>

                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', minHeight: '2rem' }}>
                            {t.description || `${selectedSubject.name} examination test series.`}
                          </p>

                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <span>⏱️ {t.duration_minutes || 60} mins</span>
                            <span>❓ {t.question_count || 0} Questions</span>
                            <span>🎯 +{t.positive_marks || 4} / -{t.negative_marks || 1}</span>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                          {isSubmitted ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Score: <strong style={{ color: '#16a34a' }}>{t.latest_attempt_score}</strong>
                              </span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                  onClick={() => handleSelectHistoryAttempt(t.latest_attempt_id, false, t.id)}
                                >
                                  Solutions
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                  onClick={() => handleOpenTestInstructions(t.id)}
                                >
                                  Retake
                                </button>
                              </div>
                            </div>
                          ) : isInProgress ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem', backgroundColor: '#d97706', borderColor: '#b45309' }}
                              onClick={() => handleSelectHistoryAttempt(t.latest_attempt_id, true, t.id)}
                            >
                              Resume Attempt &rarr;
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={!hasQuestions}
                              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem' }}
                              onClick={() => handleOpenTestInstructions(t.id)}
                            >
                              {hasQuestions ? 'Start Test Series \u2192' : 'Questions Pending'}
                            </button>
                          )}
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

      {/* =========================================================================
          SECTION 3: MY RESULTS
         ========================================================================= */}
      {activeSection === 'results' && (
        <StudentAttemptHistory
          onSelectAttempt={handleSelectHistoryAttempt}
          onBackToCatalogue={() => setActiveSection('subjects')}
        />
      )}

      {/* =========================================================================
          SECTION 4: PROFILE
         ========================================================================= */}
      {activeSection === 'profile' && (
        <StudentProfile
          onNavigateToSubject={(subj) => handleSelectSubject(subj, 'sectional')}
          onNavigateToResults={() => setActiveSection('results')}
        />
      )}

      {/* =========================================================================
          EXAMINATION FLOW VIEWS: Instructions, Active Exam, and Solutions Result
         ========================================================================= */}
      {activeSection === 'instructions' && activeTestId && (
        <StudentTestInstructions
          testId={activeTestId}
          onStartExam={handleStartExam}
          onBack={() => setActiveSection('subjects')}
        />
      )}

      {activeSection === 'exam' && activeAttemptId && (
        <StudentExamInterface
          attemptId={activeAttemptId}
          initialData={initialExamData}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}

      {activeSection === 'result' && activeResultAttemptId && (
        <StudentTestResult
          attemptId={activeResultAttemptId}
          onBackToDashboard={() => setActiveSection('dashboard')}
          onViewHistory={() => setActiveSection('results')}
        />
      )}
    </div>
  );
}
