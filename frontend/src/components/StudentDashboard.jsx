import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getStudentSubjects,
  getSubjectCategoryStats,
  getSubjectTests,
  getSubjectTestHistory,
  getStudentAttemptsList,
  getStudentProfile,
} from '../api/client.js';
import StudentTestInstructions from './StudentTestInstructions.jsx';
import StudentExamInterface from './StudentExamInterface.jsx';
import StudentTestResult from './StudentTestResult.jsx';
import StudentAttemptHistory from './StudentAttemptHistory.jsx';
import StudentProfile from './StudentProfile.jsx';
import StudentPurchaseHistory from './StudentPurchaseHistory.jsx';
import SubjectPurchasePage from './SubjectPurchasePage.jsx';


// Subtle, professional academic icons for the 7 CUET PG disciplines
const SUBJECT_ICONS = {
  'Political Science': '🏛️',
  'Philosophy': '💭',
  'Psychology': '🧠',
  'History': '📜',
  'Economics': '📈',
  'Geography': '🌍',
  'Disaster Management': '🛡️',
};

const DEFAULT_SUBJECT_NAMES = [
  'Political Science',
  'Philosophy',
  'Psychology',
  'History',
  'Economics',
  'Geography',
  'Disaster Management',
];

export default function StudentDashboard({ initialSection = 'dashboard', initialSubjectId = null }) {
  const { user, logout } = useAuth();

  // Navigation tabs: 'dashboard' | 'subjects' | 'results' | 'profile'
  const [activeSection, setActiveSection] = useState(initialSection);

  // Level 1, 2, 3 Hierarchy State
  // Level 1: selectedSubject === null
  // Level 2: selectedSubject !== null && selectedCategory === null
  // Level 3: selectedSubject !== null && selectedCategory !== null ('sectional' | 'full_length' | 'pyq')
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState(null);

  // Level 2 Category stats for selected subject
  const [categoryStats, setCategoryStats] = useState([]);
  const [loadingCategoryStats, setLoadingCategoryStats] = useState(false);

  // Subject-specific attempt history
  const [subjectHistory, setSubjectHistory] = useState([]);
  const [loadingSubjectHistory, setLoadingSubjectHistory] = useState(false);

  // Level 3 Tests for selected subject & category
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testsError, setTestsError] = useState(null);

  // Overall student stats & attempts
  const [allAttempts, setAllAttempts] = useState([]);
  const [profileStats, setProfileStats] = useState(null);

  // Active Exam & Result inspection states (Level 4 & 5)
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [initialExamData, setInitialExamData] = useState(null);
  const [activeResultAttemptId, setActiveResultAttemptId] = useState(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isResultActive, setIsResultActive] = useState(false);
  const [isInstructionsActive, setIsInstructionsActive] = useState(false);

  // Subject Series Purchase State
  const [purchaseSubjectId, setPurchaseSubjectId] = useState(null);
  const [purchaseReturnTestId, setPurchaseReturnTestId] = useState(null);

  const handleNavigateToPurchase = (subjectId, returnTestId = null) => {
    setPurchaseSubjectId(subjectId);
    setPurchaseReturnTestId(returnTestId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  useEffect(() => {
    loadSubjects();
    loadOverallData();
  }, []);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const data = await getStudentSubjects();
      // Ensure the 7 CUET PG subjects are prioritized in order
      const sorted = (data || []).sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
      setSubjects(sorted);

      if (initialSubjectId) {
        const found = sorted.find((s) => s.id === initialSubjectId);
        if (found) {
          handleSelectSubject(found);
        }
      }
    } catch (err) {
      setSubjectsError(err.message || 'Failed to load CUET PG subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadOverallData = async () => {
    try {
      const [attemptsData, profileData] = await Promise.all([
        getStudentAttemptsList().catch(() => []),
        getStudentProfile().catch(() => null),
      ]);
      setAllAttempts(attemptsData || []);
      setProfileStats(profileData || null);
    } catch (err) {
      console.error('Error loading overall metrics:', err);
    }
  };

  // Level 1 -> Level 2: When student clicks a Subject
  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject);
    setSelectedCategory(null);
    setTests([]);
    setLoadingCategoryStats(true);
    setLoadingSubjectHistory(true);

    try {
      const [catData, histData] = await Promise.all([
        getSubjectCategoryStats(subject.id).catch(() => []),
        getSubjectTestHistory(subject.id).catch(() => []),
      ]);
      setCategoryStats(catData || []);
      setSubjectHistory(histData || []);
    } catch (err) {
      console.error('Failed to load subject category stats:', err);
    } finally {
      setLoadingCategoryStats(false);
      setLoadingSubjectHistory(false);
    }
  };

  // Level 2 -> Level 3: When student clicks a Category
  const handleSelectCategory = async (catType) => {
    setSelectedCategory(catType);
    if (!selectedSubject) return;

    setLoadingTests(true);
    setTestsError(null);
    try {
      const testList = await getSubjectTests(selectedSubject.id, catType);
      setTests(testList || []);
    } catch (err) {
      setTestsError(err.message || 'Failed to load test series.');
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  // Level 3 -> Level 4: Start Test Flow
  const handleOpenInstructions = (testId) => {
    setActiveTestId(testId);
    setIsInstructionsActive(true);
  };

  const handleStartExam = (sessionData) => {
    setActiveAttemptId(sessionData.attemptId);
    setInitialExamData(sessionData);
    setIsInstructionsActive(false);
    setIsExamActive(true);
  };

  const handleSubmitSuccess = (attemptId) => {
    setActiveResultAttemptId(attemptId);
    setIsExamActive(false);
    setIsResultActive(true);
    // Refresh student metrics
    loadSubjects();
    loadOverallData();
    if (selectedSubject) {
      getSubjectCategoryStats(selectedSubject.id).then(setCategoryStats);
      getSubjectTestHistory(selectedSubject.id).then(setSubjectHistory);
    }
  };

  const handleSelectHistoryAttempt = (attemptId, inProgress, testId) => {
    if (inProgress) {
      setActiveAttemptId(attemptId);
      setInitialExamData(null);
      setIsExamActive(true);
    } else {
      setActiveResultAttemptId(attemptId);
      setIsResultActive(true);
    }
  };

  // Check for in-progress attempt
  const activeSession = allAttempts.find((a) => a.status === 'in_progress');

  // Filter 7 predefined subjects
  const sevenSubjects = subjects.filter((s) => DEFAULT_SUBJECT_NAMES.includes(s.name));
  const displaySubjects = sevenSubjects.length > 0 ? sevenSubjects : subjects.slice(0, 7);

  // =========================================================================
  // VIEW: LEVEL 4 - EXAM INTERFACE
  // =========================================================================
  if (isExamActive && activeAttemptId) {
    return (
      <StudentExamInterface
        attemptId={activeAttemptId}
        initialData={initialExamData}
        onSubmitSuccess={handleSubmitSuccess}
      />
    );
  }

  // =========================================================================
  // VIEW: LEVEL 5 - RESULT & ANALYSIS
  // =========================================================================
  if (isResultActive && activeResultAttemptId) {
    return (
      <StudentTestResult
        attemptId={activeResultAttemptId}
        onBackToDashboard={() => {
          setIsResultActive(false);
          setActiveResultAttemptId(null);
        }}
        onViewHistory={() => {
          setIsResultActive(false);
          setActiveResultAttemptId(null);
          setActiveSection('results');
        }}
      />
    );
  }

  // =========================================================================
  // VIEW: SUBJECT PURCHASE PAGE (Direct access & locked test redirect)
  // =========================================================================
  if (purchaseSubjectId) {
    return (
      <SubjectPurchasePage
        subjectId={purchaseSubjectId}
        returnTestId={purchaseReturnTestId}
        onBack={() => {
          setPurchaseSubjectId(null);
          setPurchaseReturnTestId(null);
        }}
        onNavigateToTest={(testId) => {
          setPurchaseSubjectId(null);
          setPurchaseReturnTestId(null);
          handleOpenInstructions(testId);
        }}
        onRequireAuth={() => {}}
      />
    );
  }

  // =========================================================================
  // VIEW: TEST INSTRUCTIONS (Acceptance Dialog)
  // =========================================================================
  if (isInstructionsActive && activeTestId) {
    return (
      <StudentTestInstructions
        testId={activeTestId}
        onStartExam={handleStartExam}
        onNavigateToPurchase={(subjId) => handleNavigateToPurchase(subjId, activeTestId)}
        onBack={() => {
          setIsInstructionsActive(false);
          setActiveTestId(null);
        }}
      />
    );
  }


  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* PrimePrep Header Sub-Navigation */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeSection === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setActiveSection('dashboard');
                setSelectedSubject(null);
                setSelectedCategory(null);
              }}
            >
              📊 Dashboard
            </button>

            <button
              type="button"
              className={`btn ${activeSection === 'subjects' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setActiveSection('subjects');
                setSelectedSubject(null);
                setSelectedCategory(null);
              }}
            >
              📚 Subjects
            </button>

            <button
              type="button"
              className={`btn ${activeSection === 'results' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setActiveSection('results');
                setSelectedSubject(null);
                setSelectedCategory(null);
              }}
            >
              🏆 My Results
            </button>

            <button
              type="button"
              className={`btn ${activeSection === 'purchases' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setActiveSection('purchases');
                setSelectedSubject(null);
                setSelectedCategory(null);
              }}
            >
              💳 My Purchases
            </button>

            <button
              type="button"
              className={`btn ${activeSection === 'profile' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => {
                setActiveSection('profile');
                setSelectedSubject(null);
                setSelectedCategory(null);
              }}
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
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Active Exam in Progress Callout */}
      {activeSession && (
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
                {activeSession.subjectName}
              </span>
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#78350f' }}>
              {activeSession.testTitle}
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#92400e' }}>
              Started on {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              Your answers and timer are saved in real-time.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
            onClick={() => handleSelectHistoryAttempt(activeSession.id, true, activeSession.testId)}
          >
            Resume Examination &rarr;
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW: MY RESULTS TAB
         ========================================================================= */}
      {activeSection === 'results' && (
        <StudentAttemptHistory
          onSelectAttempt={handleSelectHistoryAttempt}
          onBackToCatalogue={() => setActiveSection('subjects')}
        />
      )}

      {/* =========================================================================
          VIEW: MY PURCHASES TAB
         ========================================================================= */}
      {activeSection === 'purchases' && (
        <StudentPurchaseHistory
          onExploreSubject={(subjId) => {
            setActiveSection('subjects');
            if (subjId) {
              const found = subjects.find((s) => s.id === subjId);
              if (found) {
                handleSelectSubject(found);
              }
            }
          }}
        />
      )}

      {/* =========================================================================
          VIEW: PROFILE TAB
         ========================================================================= */}

      {activeSection === 'profile' && (
        <StudentProfile
          onNavigateToSubject={(subj) => {
            setActiveSection('subjects');
            handleSelectSubject(subj);
          }}
          onNavigateToResults={() => setActiveSection('results')}
        />
      )}

      {/* =========================================================================
          LEVEL 1: SUBJECT SELECTION (Default Dashboard & Subjects root)
         ========================================================================= */}
      {(activeSection === 'dashboard' || activeSection === 'subjects') && !selectedSubject && (
        <div>
          {/* Welcome Section */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
              color: '#ffffff',
              padding: '2rem',
              marginBottom: '1.75rem',
              borderRadius: '12px',
            }}
          >
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
              CUET PG TEST PREPARATION PLATFORM
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0 0.4rem 0', color: '#ffffff' }}>
              Welcome, {user?.fullName?.split(' ')[0] || 'Candidate'}!
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', maxWidth: '750px' }}>
              Select your CUET PG examination discipline below to access Sectional Tests, Full-Length Mocks, and Previous Year Questions.
            </p>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
              CUET PG Examination Disciplines
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Choose a subject to explore its three test categories and track your performance
            </p>
          </div>

          {subjectsError && (
            <div className="status-pill status-error" style={{ display: 'block', padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
              {subjectsError}
            </div>
          )}

          {loadingSubjects ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>Loading CUET PG subjects from database...</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {displaySubjects.map((subj) => {
                const icon = SUBJECT_ICONS[subj.name] || '📚';
                const totalTests = parseInt(subj.total_tests || subj.test_count || 0, 10);
                const completedCount = parseInt(subj.completed_tests || 0, 10);
                const bestScore = subj.best_score !== null && subj.best_score !== undefined
                  ? parseFloat(subj.best_score)
                  : null;

                return (
                  <div
                    key={subj.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                      transition: 'all 0.15s ease',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.6rem' }}>{icon}</span>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: '#eff6ff',
                              color: 'var(--color-primary)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {subj.paper_code || subj.code || 'CUET PG'}
                          </span>
                          <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                            {totalTests} Tests
                          </span>
                        </div>
                      </div>

                      {/* Subject Name */}
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                        {subj.name}
                      </h3>

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', minHeight: '2.5rem' }}>
                        {subj.description || `Comprehensive CUET PG preparation modules for ${subj.name}.`}
                      </p>

                      {/* Category Breakdown Badges */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          <span>Sectional: <strong>{subj.sectional_count || 0}</strong></span>
                          <span>Full-Length: <strong>{subj.full_length_count || 0}</strong></span>
                          <span>PYQ: <strong>{subj.pyq_count || 0}</strong></span>
                        </div>
                      </div>

                      {/* Performance Summary if student attempted */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                        <span>
                          Completed: <strong>{completedCount}</strong> test{completedCount === 1 ? '' : 's'}
                        </span>
                        {bestScore !== null ? (
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>
                            Best Score: {bestScore}
                          </span>
                        ) : (
                          <span>Not attempted yet</span>
                        )}
                      </div>
                    </div>

                    {/* View Tests Action */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.9rem', fontWeight: 700 }}
                      onClick={() => handleSelectSubject(subj)}
                    >
                      View Tests &rarr;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LEVEL 2: THREE TEST CATEGORIES FOR SELECTED SUBJECT
         ========================================================================= */}
      {selectedSubject && !selectedCategory && (
        <div>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              &larr; All Subjects
            </button>
            <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{selectedSubject.name}</span>
          </div>

          {/* Subject Banner Header */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              marginBottom: '1.5rem',
              borderLeft: '5px solid var(--color-primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>{SUBJECT_ICONS[selectedSubject.name] || '📚'}</span>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                    {selectedSubject.name}
                  </h1>
                  <span className="status-pill status-primary" style={{ fontWeight: 700 }}>
                    {selectedSubject.paper_code || selectedSubject.code || 'CUET PG'}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '750px' }}>
                  {selectedSubject.description || `Prepare confidently for CUET PG ${selectedSubject.name} across Sectional, Full-Length, and PYQ tests.`}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedSubject(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Change Subject
              </button>
            </div>
          </div>

          {/* LEVEL 2: Exactly Three Test Categories */}
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 0.35rem 0' }}>
              Select Test Category
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Choose a category to view individual tests, attempt exams, and inspect solutions
            </p>
          </div>

          {loadingCategoryStats ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>Loading {selectedSubject.name} categories and statistics...</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {categoryStats.map((cat) => {
                const isSectional = cat.testType === 'sectional';
                const isFullLength = cat.testType === 'full_length';
                const isPyq = cat.testType === 'pyq';

                const catBadge = isSectional
                  ? { icon: '📑', label: 'SECTIONAL' }
                  : isFullLength
                  ? { icon: '🎯', label: 'FULL-LENGTH' }
                  : { icon: '📖', label: 'PYQ PAPERS' };

                return (
                  <div
                    key={cat.testType}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{catBadge.icon}</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#eff6ff',
                            color: 'var(--color-primary)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                          }}
                        >
                          {catBadge.label}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.4rem' }}>
                        {cat.title}
                      </h3>

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', minHeight: '2.5rem' }}>
                        {cat.description}
                      </p>

                      {/* Category-specific statistics isolated to selected subject */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '0.85rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          marginBottom: '1.25rem',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AVAILABLE</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                              {cat.availableTests} Tests
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>COMPLETED</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
                              {cat.completedTests} Tests
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>BEST SCORE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: cat.bestScore !== null ? '#16a34a' : 'var(--color-text-muted)' }}>
                              {cat.bestScore !== null ? cat.bestScore : '—'}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AVERAGE SCORE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: cat.averageScore !== null ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                              {cat.averageScore !== null ? cat.averageScore : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.55rem', fontWeight: 700, fontSize: '0.9rem' }}
                      onClick={() => handleSelectCategory(cat.testType)}
                    >
                      View Tests &rarr;
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subject-Wise Test History and Scores (Section 7 Requirement) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">My {selectedSubject.name} Test History</h3>
                <p className="card-subtitle">Previous attempts and performance strictly isolated to {selectedSubject.name}</p>
              </div>
            </div>

            {loadingSubjectHistory ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                Loading {selectedSubject.name} history...
              </p>
            ) : subjectHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  No previous attempts found for {selectedSubject.name} yet.
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Select one of the three test categories above to take your first test!
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Category</th>
                      <th>Attempt Date</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Time Taken</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectHistory.map((att) => {
                      const isCompleted = att.status === 'submitted';
                      const mins = Math.floor((att.timeTakenSeconds || 0) / 60);
                      const secs = (att.timeTakenSeconds || 0) % 60;
                      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                      return (
                        <tr key={att.id}>
                          <td><strong>{att.testTitle}</strong></td>
                          <td>
                            <span className="status-pill status-secondary" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                              {att.testType?.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date(att.startedAt).toLocaleDateString()} {new Date(att.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            {isCompleted ? (
                              <div>
                                <strong style={{ color: att.score >= 0 ? '#16a34a' : '#dc2626' }}>
                                  {att.score}
                                </strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}> / {att.maxPossibleMarks}</span>
                              </div>
                            ) : (
                              <span className="status-pill status-warning" style={{ fontSize: '0.75rem' }}>IN PROGRESS</span>
                            )}
                          </td>
                          <td>{isCompleted ? `${att.accuracyPercentage}%` : '—'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{isCompleted ? timeStr : '—'}</td>
                          <td>
                            {isCompleted ? (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => handleSelectHistoryAttempt(att.id, false, att.testId)}
                              >
                                View Solutions &rarr;
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', backgroundColor: '#d97706', borderColor: '#b45309' }}
                                onClick={() => handleSelectHistoryAttempt(att.id, true, att.testId)}
                              >
                                Resume &rarr;
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LEVEL 3: INDIVIDUAL TEST SERIES
         ========================================================================= */}
      {selectedSubject && selectedCategory && (
        <div>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Subjects
            </button>
            <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {selectedSubject.name}
            </button>
            <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize' }}>
              {selectedCategory.replace('_', ' ')} Tests
            </span>
          </div>

          {/* Test Category Header & Switcher */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                  {selectedSubject.name} &bull; {selectedCategory === 'sectional' ? 'Sectional Tests' : selectedCategory === 'full_length' ? 'Full-Length Mock Tests' : 'PYQ Tests'}
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  {selectedSubject.paper_code || 'CUET PG'} &bull; Practicing under actual examination conditions
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedCategory(null)}
                style={{ fontSize: '0.85rem' }}
              >
                &larr; Back to Categories
              </button>
            </div>

            {/* Quick Category Switcher Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${selectedCategory === 'sectional' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => handleSelectCategory('sectional')}
              >
                📑 Sectional Tests
              </button>
              <button
                type="button"
                className={`btn ${selectedCategory === 'full_length' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => handleSelectCategory('full_length')}
              >
                🎯 Full-Length Tests
              </button>
              <button
                type="button"
                className={`btn ${selectedCategory === 'pyq' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => handleSelectCategory('pyq')}
              >
                📖 PYQ Tests
              </button>
            </div>
          </div>

          {testsError && (
            <div className="status-pill status-error" style={{ display: 'block', padding: '0.85rem', marginBottom: '1.25rem' }}>
              {testsError}
            </div>
          )}

          {/* Test List */}
          {loadingTests ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>Loading {selectedCategory.replace('_', ' ')} tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                No published {selectedCategory.replace('_', ' ')} tests available yet for {selectedSubject.name}.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Please check Sectional, Full-Length, or PYQ tabs.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {tests.map((t, idx) => {
                const hasQuestions = (t.question_count || 0) > 0;
                const isInProgress = t.latest_attempt_status === 'in_progress';
                const isSubmitted = t.latest_attempt_status === 'submitted';
                const score = t.latest_attempt_score !== null && t.latest_attempt_score !== undefined
                  ? parseFloat(t.latest_attempt_score)
                  : null;

                return (
                  <div
                    key={t.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Top Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                          TEST #{String(t.test_number || idx + 1).padStart(2, '0')}
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {t.is_free || t.access_type === 'free' ? (
                            <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>FREE</span>
                          ) : t.is_unlocked ? (
                            <span className="status-pill status-primary" style={{ fontSize: '0.7rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              UNLOCKED ✓
                            </span>
                          ) : (
                            <span className="status-pill status-warning" style={{ fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                              LOCKED 🔒
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>COMPLETED</span>
                          )}
                          {isInProgress && (
                            <span className="status-pill status-warning" style={{ fontSize: '0.7rem' }}>IN PROGRESS</span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.4rem' }}>
                        {t.title}
                      </h3>

                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', minHeight: '2.2rem' }}>
                        {t.description || `${selectedSubject.name} examination test series.`}
                      </p>

                      {/* Specifications Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.5rem',
                          backgroundColor: '#f8fafc',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.8rem',
                          color: 'var(--color-text-muted)',
                          marginBottom: '1rem',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>QUESTIONS</div>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.question_count || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>DURATION</div>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.duration_minutes || 45}m</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>MARKING</div>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>+{t.positive_marks || 4}/-{t.negative_marks || 1}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                      {isSubmitted ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem' }}>
                            Score: <strong style={{ color: '#16a34a' }}>{score}</strong>
                          </span>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => handleSelectHistoryAttempt(t.latest_attempt_id, false, t.id)}
                          >
                            View Result &rarr;
                          </button>
                        </div>
                      ) : isInProgress ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', backgroundColor: '#d97706', borderColor: '#b45309' }}
                          onClick={() => handleSelectHistoryAttempt(t.latest_attempt_id, true, t.id)}
                        >
                          Resume Test &rarr;
                        </button>
                      ) : (!t.is_unlocked && !t.is_free && t.access_type !== 'free') ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            fontSize: '0.85rem',
                            backgroundColor: '#16a34a',
                            borderColor: '#15803d',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          }}
                          onClick={() => handleNavigateToPurchase(selectedSubject.id, t.id)}
                        >
                          Unlock Series (₹499) 🔒 &rarr;
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!hasQuestions}
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                          onClick={() => handleOpenInstructions(t.id)}
                        >
                          {hasQuestions ? 'Start Test \u2192' : 'Questions Pending'}
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
  );
}
