import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import AdminSetupForm from './components/AdminSetupForm.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { getHealthStatus } from './api/client.js';

function AppContent() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'admin-setup' | 'system'
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

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
      <header className="app-header">
        <div className="brand-container">
          <span className="brand-title">PrimePrep</span>
          <span className="brand-badge">Phase 3: Auth & RBAC</span>
        </div>

        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Signed in as <strong>{user.fullName}</strong> (<code>{user.role}</code>)
              </span>
              <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Sign In
              </button>
              <button
                className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
              <button
                className={`nav-btn ${activeTab === 'system' ? 'active' : ''}`}
                onClick={() => setActiveTab('system')}
              >
                System Health
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="main-container">
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Verifying session identity...</p>
          </div>
        ) : isAuthenticated ? (
          // Authenticated view: Route based on verified server role
          isAdmin ? <AdminDashboard /> : <StudentDashboard />
        ) : (
          // Unauthenticated view
          <div>
            <div className="auth-tabs" style={{ maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
              <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Student Registration
              </button>
              <button
                className={`auth-tab ${activeTab === 'admin-setup' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-setup')}
              >
                Admin Bootstrap
              </button>
              <button
                className={`auth-tab ${activeTab === 'system' ? 'active' : ''}`}
                onClick={() => setActiveTab('system')}
              >
                Architecture & Health
              </button>
            </div>

            <div className="card" style={{ maxWidth: activeTab === 'system' ? '100%' : '500px', margin: '0 auto' }}>
              {activeTab === 'login' && (
                <LoginForm
                  onSuccess={() => {}}
                  onSwitchToRegister={() => setActiveTab('register')}
                  onSwitchToAdminSetup={() => setActiveTab('admin-setup')}
                />
              )}

              {activeTab === 'register' && (
                <RegisterForm
                  onSuccess={() => {}}
                  onSwitchToLogin={() => setActiveTab('login')}
                />
              )}

              {activeTab === 'admin-setup' && (
                <AdminSetupForm
                  onSuccess={() => {}}
                  onSwitchToLogin={() => setActiveTab('login')}
                />
              )}

              {activeTab === 'system' && (
                <div>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="card-title">Backend API & Database Connectivity</h3>
                      <p className="card-subtitle">Direct PostgreSQL connection via Node <code>pg</code> connection pool</p>
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
            </div>
          </div>
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
