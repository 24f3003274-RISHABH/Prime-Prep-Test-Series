import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminSetupForm({ onSuccess, onSwitchToLogin }) {
  const { setupAdmin } = useAuth();
  const [setupSecret, setSetupSecret] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!setupSecret || !fullName || !email || !password) {
      setError('Please provide setup secret, full name, email, and password.');
      return;
    }

    if (password.length < 8) {
      setError('Admin password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await setupAdmin(setupSecret, fullName, email, password);
      if (onSuccess) onSuccess(user);
    } catch (err) {
      setError(err.message || 'Administrator bootstrap failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">Initial Administrator Bootstrap</h2>
        <p className="card-subtitle">
          One-time setup for the platform administrator. Requires <code>ADMIN_SETUP_SECRET</code>.
        </p>
      </div>

      <div className="alert alert-warning" style={{ fontSize: '0.85rem' }}>
        <strong>Security Notice:</strong> This endpoint only succeeds once when no administrator exists. Subsequent calls are permanently blocked.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="setup-secret">Setup Secret (ADMIN_SETUP_SECRET)</label>
          <input
            id="setup-secret"
            type="password"
            className="form-input"
            placeholder="Enter ADMIN_SETUP_SECRET configured in backend/.env"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-name">Administrator Full Name</label>
          <input
            id="admin-name"
            type="text"
            className="form-input"
            placeholder="e.g. Platform Administrator"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">Administrator Email</label>
          <input
            id="admin-email"
            type="email"
            className="form-input"
            placeholder="e.g. admin@primeprep.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-password">Administrator Password</label>
          <input
            id="admin-password"
            type="password"
            className="form-input"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
          {submitting ? 'Creating Administrator...' : 'Bootstrap Administrator Account'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Return to regular sign in
        </button>
      </div>
    </div>
  );
}
