import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PublicNavbar from './components/PublicNavbar.jsx';
import PublicHomepage from './components/PublicHomepage.jsx';
import PublicCatalogue from './components/PublicCatalogue.jsx';
import PublicTestDetails from './components/PublicTestDetails.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import StudentExamInterface from './components/StudentExamInterface.jsx';
import StudentTestResult from './components/StudentTestResult.jsx';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import { getHealthStatus, startStudentTest } from './api/client.js';

function parseUrlPath() {
  const path = window.location.pathname;
  if (path.startsWith('/test-series/')) {
    const testId = path.replace('/test-series/', '').split('/')[0];
    if (testId) {
      return { view: 'test-details', testId };
    }
  }
  if (path === '/test-series' || path === '/catalogue') {
    return { view: 'catalogue', testId: null };
  }
  if (path === '/subjects') return { view: 'subjects', testId: null };
  if (path === '/my-results' || path === '/results') return { view: 'results', testId: null };
  if (path === '/profile') return { view: 'profile', testId: null };
  if (path === '/login') return { view: 'login', testId: null };
  if (path === '/register') return { view: 'register', testId: null };
  if (path === '/dashboard') return { view: 'dashboard', testId: null };
  if (path === '/admin') return { view: 'admin', testId: null };
  if (path === '/system') return { view: 'system', testId: null };

  return { view: 'home', testId: null };
}

function updateBrowserUrl(view, testId = null) {
  let targetPath = '/';
  if (view === 'catalogue') targetPath = '/test-series';
  else if (view === 'subjects') targetPath = '/subjects';
  else if (view === 'results') targetPath = '/my-results';
  else if (view === 'profile') targetPath = '/profile';
  else if (view === 'test-details' && testId) targetPath = `/test-series/${testId}`;
  else if (view === 'login') targetPath = '/login';
  else if (view === 'register') targetPath = '/register';
  else if (view === 'dashboard') targetPath = '/dashboard';
  else if (view === 'admin') targetPath = '/admin';
  else if (view === 'system') targetPath = '/system';

  if (window.location.pathname !== targetPath) {
    window.history.pushState({ view, testId }, '', targetPath);
  }
}

function AppContent() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState(() => parseUrlPath().view);
  const [activeTestId, setActiveTestId] = useState(() => parseUrlPath().testId);
  const [catalogueFilters, setCatalogueFilters] = useState({ subjectId: '', category: 'ALL', accessType: 'ALL' });
  const [returnToTestId, setReturnToTestId] = useState(null);

  // Active Exam Session State
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [initialExamData, setInitialExamData] = useState(null);
  const [resultAttemptId, setResultAttemptId] = useState(null);

  // System Health state
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Listen to browser popstate (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlPath();
      setCurrentView(parsed.view);
      setActiveTestId(parsed.testId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view, testId = null, extraParams = {}) => {
    setCurrentView(view);
    setActiveTestId(testId);
    if (extraParams.subjectId || extraParams.category || extraParams.accessType) {
      setCatalogueFilters({
        subjectId: extraParams.subjectId || '',
        category: extraParams.category || 'ALL',
        accessType: extraParams.accessType || 'ALL',
      });
    }
    updateBrowserUrl(view, testId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTestDetails = (testId) => {
    navigateTo('test-details', testId);
  };

  const handleRequireAuth = (testId) => {
    setReturnToTestId(testId);
    navigateTo('login');
  };

  const handleLoginSuccess = async (authenticatedUser) => {
    if (returnToTestId) {
      const targetId = returnToTestId;
      setReturnToTestId(null);
      // Navigate to test details for that test
      navigateTo('test-details', targetId);
    } else {
      if (authenticatedUser.role === 'admin') {
        navigateTo('admin');
      } else {
        navigateTo('dashboard');
      }
    }
  };

  const handleStartExamSession = (sessionData) => {
    setActiveAttemptId(sessionData.attemptId);
    setInitialExamData(sessionData);
    setCurrentView('exam');
  };

  const handleSubmitSuccess = (attemptId) => {
    setResultAttemptId(attemptId);
    setCurrentView('result');
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await getHealthStatus();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div>
      {/* Top Navbar visible on all views except during active examination */}
      {currentView !== 'exam' && (
        <PublicNavbar
          currentView={currentView}
          onNavigate={(target) => {
            if (target === 'subjects') {
              if (isAuthenticated) {
                navigateTo('subjects');
              } else {
                navigateTo('catalogue');
              }
            } else {
              navigateTo(target);
            }
          }}
        />
      )}

      <main className="main-container" style={{ padding: currentView === 'exam' ? '1rem 0' : '1.5rem 1rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Verifying session identity...</p>
          </div>
        ) : (
          <>
            {/* VIEW 1: Public Homepage */}
            {currentView === 'home' && (
              <PublicHomepage
                onNavigateToCatalogue={(filters) => navigateTo('catalogue', null, filters || {})}
                onSelectSubject={(subjectId) => {
                  if (isAuthenticated) {
                    navigateTo('subjects', null, { subjectId });
                  } else {
                    navigateTo('catalogue', null, { subjectId });
                  }
                }}
                onSelectCategory={(category) => navigateTo('catalogue', null, { category })}
                onOpenTestDetails={handleOpenTestDetails}
              />
            )}

            {/* VIEW 2: Public Test Series Catalogue */}
            {currentView === 'catalogue' && (
              <PublicCatalogue
                initialSubjectId={catalogueFilters.subjectId}
                initialCategory={catalogueFilters.category}
                initialAccessType={catalogueFilters.accessType}
                onSelectTest={handleOpenTestDetails}
                onNavigateHome={() => navigateTo('home')}
              />
            )}

            {/* VIEW 3: Public Test Details Page */}
            {currentView === 'test-details' && activeTestId && (
              <PublicTestDetails
                testId={activeTestId}
                onBackToCatalogue={() => navigateTo('catalogue')}
                onRequireAuth={handleRequireAuth}
                onStartExamSession={handleStartExamSession}
              />
            )}

            {/* VIEW 4: Active Examination Workspace */}
            {currentView === 'exam' && activeAttemptId && (
              <StudentExamInterface
                attemptId={activeAttemptId}
                initialData={initialExamData}
                onSubmitSuccess={handleSubmitSuccess}
              />
            )}

            {/* VIEW 5: Examination Results & Solutions */}
            {currentView === 'result' && resultAttemptId && (
              <StudentTestResult
                attemptId={resultAttemptId}
                onBackToDashboard={() => navigateTo('dashboard')}
                onViewHistory={() => navigateTo('results')}
              />
            )}

            {/* VIEW 6: PrimePrep Student Portal (Dashboard, Subjects, My Results, Profile) */}
            {(currentView === 'dashboard' || currentView === 'subjects' || currentView === 'results' || currentView === 'profile') && (
              isAuthenticated ? (
                <StudentDashboard
                  initialSection={
                    currentView === 'results' ? 'results' :
                    currentView === 'profile' ? 'profile' :
                    currentView === 'subjects' ? 'subjects' : 'dashboard'
                  }
                  initialSubjectId={catalogueFilters.subjectId}
                />
              ) : currentView === 'subjects' ? (
                <PublicCatalogue
                  initialSubjectId={catalogueFilters.subjectId}
                  initialCategory={catalogueFilters.category}
                  initialAccessType={catalogueFilters.accessType}
                  onSelectTest={handleOpenTestDetails}
                  onNavigateHome={() => navigateTo('home')}
                />
              ) : (
                <div className="card" style={{ maxWidth: '480px', margin: '2rem auto' }}>
                  <h3 className="card-title">Authentication Required</h3>
                  <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
                    Please sign in to access your student dashboard, test attempt history, and scores.
                  </p>
                  <button className="btn btn-primary" onClick={() => navigateTo('login')}>
                    Sign In
                  </button>
                </div>
              )
            )}

            {/* VIEW 7: Administrator Management Portal */}
            {currentView === 'admin' && (
              isAuthenticated && isAdmin ? (
                <AdminDashboard />
              ) : (
                <div className="card" style={{ maxWidth: '480px', margin: '2rem auto' }}>
                  <h3 className="card-title" style={{ color: '#dc2626' }}>Administrator Access Required</h3>
                  <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
                    This section requires authenticated administrator privileges.
                  </p>
                  <button className="btn btn-outline" onClick={() => navigateTo('login')}>
                    Sign In as Administrator
                  </button>
                </div>
              )
            )}

            {/* VIEW 8: Sign In Form */}
            {currentView === 'login' && (
              <div className="card" style={{ maxWidth: '460px', margin: '2rem auto' }}>
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onSwitchToRegister={() => navigateTo('register')}
                />
              </div>
            )}

            {/* VIEW 9: Student Registration Form */}
            {currentView === 'register' && (
              <div className="card" style={{ maxWidth: '500px', margin: '2rem auto' }}>
                <RegisterForm
                  onSuccess={handleLoginSuccess}
                  onSwitchToLogin={() => navigateTo('login')}
                />
              </div>
            )}

            {/* VIEW 10: Architecture & System Health */}
            {currentView === 'system' && (
              <div className="card" style={{ maxWidth: '800px', margin: '1.5rem auto' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="card-title">Backend API & Database Connectivity</h3>
                    <p className="card-subtitle">Direct PostgreSQL connection via Node <code>pg</code> connection pool & Supabase Auth</p>
                  </div>
                  <button className="btn btn-outline" onClick={fetchHealth} disabled={healthLoading}>
                    {healthLoading ? 'Pinging...' : 'Ping Health Endpoint'}
                  </button>
                </div>

                {health ? (
                  <table className="data-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '200px', fontWeight: 600 }}>API Status</td>
                        <td>
                          <span className="status-pill status-success">{health.status.toUpperCase()}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>PostgreSQL Connection</td>
                        <td>
                          <span className="status-pill status-success">
                            {health.database?.status?.toUpperCase() || 'CONNECTED'}
                          </span>
                          {health.database?.latencyMs && (
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                              {health.database.latencyMs}ms latency
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Server Uptime</td>
                        <td>{health.uptimeSeconds} seconds</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Environment</td>
                        <td><code>{health.environment}</code></td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Click "Ping Health Endpoint" to check live backend connectivity.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
