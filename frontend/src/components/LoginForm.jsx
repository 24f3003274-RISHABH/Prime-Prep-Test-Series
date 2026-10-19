import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(cleanEmail, password);
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
            placeholder="e.g. student@example.com or admin@primeprep.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
            autoComplete="email"
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
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={async () => {
            setEmail('priya.sharma@example.com');
            setPassword('Student@8218');
            setError(null);
            setSubmitting(true);
            try {
              const user = await login('priya.sharma@example.com', 'Student@8218');
              if (onSuccess) onSuccess(user);
            } catch (err) {
              setError(err.message || 'Student login failed.');
            } finally {
              setSubmitting(false);
            }
          }}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '0.75rem', borderColor: '#16a34a', color: '#166534', fontWeight: 600 }}
          disabled={submitting}
        >
          🎓 1-Click Sign In as Student (Priya Sharma)
        </button>

        <button
          type="button"
          onClick={async () => {
            setEmail('rishabhmyp@gmail.com');
            setPassword('Admin@8218');
            setError(null);
            setSubmitting(true);
            try {
              const user = await login('rishabhmyp@gmail.com', 'Admin@8218');
              if (onSuccess) onSuccess(user);
            } catch (err) {
              setError(err.message || 'Admin login failed.');
            } finally {
              setSubmitting(false);
            }
          }}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', fontWeight: 600 }}
          disabled={submitting}
        >
          ⚡ 1-Click Sign In as Administrator (Rishabh Keshari)
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
    </div>
  );
}
