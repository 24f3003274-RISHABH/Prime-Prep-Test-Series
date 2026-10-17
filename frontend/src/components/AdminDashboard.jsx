import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { checkAdminPrivileges } from '../api/client.js';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [adminCheckResult, setAdminCheckResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const testAdminRoute = async () => {
    setVerifying(true);
    try {
      const data = await checkAdminPrivileges();
      setAdminCheckResult(data);
    } catch (err) {
      setAdminCheckResult({ error: err.message, status: err.status });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      {/* Administrator Header Card */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Administrator Management Portal</h2>
            <p className="card-subtitle">Authenticated as {user.fullName} ({user.email})</p>
          </div>
          <span className="status-pill status-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
            ADMINISTRATOR PRIVILEGES
          </span>
        </div>

        <table className="data-table">
          <tbody>
            <tr>
              <td style={{ width: '220px', fontWeight: 600 }}>Administrator ID</td>
              <td><code>{user.id}</code></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Email</td>
              <td>{user.email}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Database Role</td>
              <td><code>{user.role}</code> (Verified by requireAdmin middleware)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Access Scope</td>
              <td>Full Platform Administration (Subjects, Chapters, Tests, Questions, Imports)</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={testAdminRoute} disabled={verifying}>
            {verifying ? 'Testing Admin Guard...' : 'Verify requireAdmin Middleware (/api/auth/admin-check)'}
          </button>
          <button className="btn btn-outline" onClick={logout}>
            Sign Out
          </button>
        </div>

        {adminCheckResult && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Protected Route Server Verification:
            </span>
            <pre className="code-block" style={{ marginTop: '0.5rem' }}>
              {JSON.stringify(adminCheckResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Admin Modules Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Management Modules Roadmap</h3>
          <p className="card-subtitle">Upcoming administrative functional workflows</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              Phase 4 &bull; Subjects & Chapters
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Add, edit, deactivate, and reorder subjects and chapter modules.
            </p>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              Phase 5 &bull; Excel Import Engine
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Upload and preview XLSX question spreadsheets with atomic database insertion.
            </p>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              Phase 6 &bull; Audit & Analytics
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              View administrative audit trail and student score distributions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
