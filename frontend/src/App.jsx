import React, { useState, useEffect } from 'react';
import { getHealthStatus } from './api/client.js';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div>
      <header className="app-header">
        <div className="brand-container">
          <span className="brand-title">PrimePrep</span>
          <span className="brand-badge">Phase 1: Foundation</span>
        </div>
        <nav className="nav-links">
          <a href="#overview" className="nav-link active">Architecture</a>
          <a href="#health" className="nav-link">System Health</a>
          <a href="#roadmap" className="nav-link">Phase Roadmap</a>
        </nav>
      </header>

      <main className="main-container">
        {/* Phase Status Banner */}
        <div className="alert alert-info">
          <strong>Phase 1: Project Initialization Active</strong> &mdash; Express backend and Vite frontend are initialized with decoupled standalone architectures, environment specifications, and native fetch client.
        </div>

        {/* Backend Health Check Card */}
        <section id="health" className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title">Backend API Health Verification</h2>
              <p className="card-subtitle">Endpoint: <code>GET /api/health</code> via Native Fetch Client</p>
            </div>
            <button className="btn btn-outline" onClick={fetchHealth} disabled={loading}>
              {loading ? 'Pinging API...' : 'Ping API Endpoint'}
            </button>
          </div>

          {loading && !health ? (
            <p style={{ color: 'var(--color-text-muted)', padding: '1rem 0' }}>Checking connection to backend server...</p>
          ) : error ? (
            <div className="alert alert-warning">
              <strong>Connection Warning:</strong> {error}
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                Ensure the backend is running. In standalone development, run <code>npm run dev:backend</code> or run <code>npm run dev</code> for full-stack mode.
              </p>
            </div>
          ) : health ? (
            <div>
              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ width: '220px', fontWeight: 600 }}>API Status</td>
                    <td>
                      <span className={`status-pill ${health.status === 'ok' ? 'status-success' : 'status-warning'}`}>
                        {health.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Service Name</td>
                    <td>{health.service} (v{health.version})</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Server Uptime</td>
                    <td>{health.uptimeSeconds} seconds</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Environment</td>
                    <td><code>{health.environment}</code></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Supabase PostgreSQL Status</td>
                    <td>
                      <span className={`status-pill ${health.database?.status === 'connected' ? 'status-success' : 'status-warning'}`}>
                        {health.database?.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {health.database?.status === 'unconfigured' 
                          ? 'Awaiting DATABASE_URL in backend/.env (Scheduled for Phase 2)' 
                          : health.database?.latencyMs ? `${health.database.latencyMs}ms latency` : ''}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Last Ping Verified</td>
                    <td>{lastChecked || 'Just now'}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1rem' }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                    View Raw Health JSON Response
                  </summary>
                  <pre className="code-block" style={{ marginTop: '0.5rem' }}>
                    {JSON.stringify(health, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ) : null}
        </section>

        {/* Project Architecture Overview */}
        <section id="overview" className="card">
          <div className="card-header">
            <h2 className="card-title">Architecture & Hierarchy Design</h2>
            <p className="card-subtitle">Decoupled PERN Stack (React + Vite + Express + Supabase PostgreSQL)</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                1. Subject & Test Hierarchy
              </h3>
              <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
                <li><strong>7 Initial Subjects:</strong> Political Science, Philosophy, Psychology, History, Economics, Geography, Disaster Management</li>
                <li><strong>Series Categories:</strong> Sectional, Full-Length, Previous Year Questions (PYQ)</li>
                <li><strong>Default Series Allocations:</strong> 15 Sectional, 10 Full-Length, 5 PYQ (Database configurable)</li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                2. Deployment Targets
              </h3>
              <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
                <li><strong>Frontend:</strong> Vercel (Single Page App on Vite)</li>
                <li><strong>Backend:</strong> Render (Node.js Express Modular Monolith)</li>
                <li><strong>Database:</strong> Supabase (Direct PostgreSQL via pg connection pool)</li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                3. Security & Integrity Guarantees
              </h3>
              <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
                <li>Parameterized SQL queries (zero string concatenation)</li>
                <li>Bcrypt hashed administrator and student credentials</li>
                <li>One-time CLI Administrator bootstrap with audit logging</li>
                <li>Server-authoritative timer & test scoring</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Phase Roadmap Tracker */}
        <section id="roadmap" className="card">
          <div className="card-header">
            <h2 className="card-title">Development Phases</h2>
            <p className="card-subtitle">Systematic incremental development track</p>
          </div>

          <div className="phase-grid">
            <div className="phase-item current">
              <span className="phase-number">Phase 1 &bull; Completed</span>
              <h3 className="phase-name">Project Initialization</h3>
              <p className="phase-desc">Workspace setup, independent Express & Vite configs, /api/health endpoint, docs & environment templates.</p>
            </div>

            <div className="phase-item">
              <span className="phase-number">Phase 2 &bull; Next</span>
              <h3 className="phase-name">PostgreSQL Schema</h3>
              <p className="phase-desc">Supabase migrations for 12 core tables: subjects, series, tests, questions, attempts, audit logs.</p>
            </div>

            <div className="phase-item">
              <span className="phase-number">Phase 3</span>
              <h3 className="phase-name">Admin Bootstrap & Auth</h3>
              <p className="phase-desc">CLI bootstrap script, JWT sessions, role middleware, student registration & login.</p>
            </div>

            <div className="phase-item">
              <span className="phase-number">Phase 4</span>
              <h3 className="phase-name">Subject & Test Management</h3>
              <p className="phase-desc">CRUD endpoints for subjects, test categories, series, and test metadata.</p>
            </div>

            <div className="phase-item">
              <span className="phase-number">Phase 5</span>
              <h3 className="phase-name">Excel Question Import</h3>
              <p className="phase-desc">XLSX file parser, preview validator, transactional bulk insertion, error reporting.</p>
            </div>

            <div className="phase-item">
              <span className="phase-number">Phase 6</span>
              <h3 className="phase-name">Student Test Engine</h3>
              <p className="phase-desc">Server-authoritative timers, response submission, single-attempt locking, review solutions.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
