import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrentUser } from '../api/client.js';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [sessionCheck, setSessionCheck] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const testAuthEndpoint = async () => {
    setVerifying(true);
    try {
      const data = await getCurrentUser();
      setSessionCheck(data);
    } catch (err) {
      setSessionCheck({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      {/* Student Profile Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Welcome back, {user.fullName}!</h2>
            <p className="card-subtitle">Student Portal &bull; CUET PG Test Preparation</p>
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
              <td style={{ fontWeight: 600 }}>Assigned Role</td>
              <td><code>{user.role}</code> (Enforced server-side)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Account Status</td>
              <td>
                <span className="status-pill status-success">ACTIVE</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={testAuthEndpoint} disabled={verifying}>
            {verifying ? 'Verifying with /api/auth/me...' : 'Verify Session (/api/auth/me)'}
          </button>
          <button className="btn btn-outline" onClick={logout}>
            Sign Out
          </button>
        </div>

        {sessionCheck && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Live Server Session Verification Result:
            </span>
            <pre className="code-block" style={{ marginTop: '0.5rem' }}>
              {JSON.stringify(sessionCheck, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Available Subjects Preview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">CUET PG Subjects Track</h3>
          <p className="card-subtitle">Academic disciplines configured in PostgreSQL</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[
            'Political Science',
            'Philosophy',
            'Psychology',
            'History',
            'Economics',
            'Geography',
            'Disaster Management',
          ].map((subj, idx) => (
            <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>SUBJECT #{idx + 1}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0.25rem 0' }}>{subj}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sectional, Full-Length & PYQ Series</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
