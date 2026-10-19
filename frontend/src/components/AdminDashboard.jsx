import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { checkAdminPrivileges } from '../api/client.js';
import AdminBulkQuestionUpload from './AdminBulkQuestionUpload.jsx';
import AdminHierarchyManager from './AdminHierarchyManager.jsx';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState('upload'); // 'upload' | 'hierarchy' | 'security'
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

        {/* Admin Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginTop: '0.75rem', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeAdminTab === 'upload' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            onClick={() => setActiveAdminTab('upload')}
          >
            Bulk Question Upload (Excel / CSV)
          </button>
          <button
            className={`btn ${activeAdminTab === 'hierarchy' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            onClick={() => setActiveAdminTab('hierarchy')}
          >
            Academic Structure (Subjects, Chapters & Tests)
          </button>
          <button
            className={`btn ${activeAdminTab === 'security' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
            onClick={() => setActiveAdminTab('security')}
          >
            Admin Security & Account Scope
          </button>
        </div>
      </div>

      {/* Tab 1: Bulk Question Upload Engine */}
      {activeAdminTab === 'upload' && <AdminBulkQuestionUpload />}

      {/* Tab 2: Academic Hierarchy Management */}
      {activeAdminTab === 'hierarchy' && <AdminHierarchyManager />}

      {/* Tab 2: Security & Verification */}
      {activeAdminTab === 'security' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Administrator Verification & Database Roles</h3>
            <p className="card-subtitle">Server-enforced authorization status</p>
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
                <td><code>{user.role}</code> (Enforced by requireAdmin middleware)</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Access Scope</td>
                <td>Full Platform Administration (Subjects, Chapters, Tests, Questions, Excel Imports)</td>
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
      )}
    </div>
  );
}

