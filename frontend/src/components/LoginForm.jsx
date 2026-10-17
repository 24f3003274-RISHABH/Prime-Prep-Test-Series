import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToAdminSetup }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (onSuccess) onSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">Sign In to PrimePrep</h2>
        <p className="card-subtitle">Students and Administrators sign in using your account credentials</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="e.g. student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        New student?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
        >
          Create student account
        </button>
      </div>

      <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        First-time setup?{' '}
        <button
          type="button"
          onClick={onSwitchToAdminSetup}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Bootstrap Initial Admin
        </button>
      </div>
    </div>
  );
}
