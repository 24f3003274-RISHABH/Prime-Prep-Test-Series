import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorInfo(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setErrorInfo({
        type: 'validation',
        message: 'Please fill in all required fields (Full Name, Email, Password).',
      });
      return;
    }

    if (trimmedName.length < 2) {
      setErrorInfo({
        type: 'validation',
        message: 'Full name must be at least 2 characters.',
      });
      return;
    }

    if (password.length < 8) {
      setErrorInfo({
        type: 'validation',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const user = await register(trimmedName, trimmedEmail, password);
      if (onSuccess) onSuccess(user);
    } catch (err) {
      // Categorize error for clear user guidance
      if (err.code === 'EMAIL_ALREADY_EXISTS') {
        setErrorInfo({
          type: 'duplicate',
          message: 'An account with this email already exists. Please sign in or use another email.',
        });
      } else if (err.code === 'NETWORK_UNAVAILABLE' || err.isNetwork) {
        setErrorInfo({
          type: 'network',
          message: err.message || 'Cannot reach the PrimePrep backend server. Please check your network.',
        });
      } else if (err.code === 'DATABASE_OR_SERVER_ERROR' || err.status >= 500) {
        setErrorInfo({
          type: 'server',
          message: 'The database server is temporarily unavailable. Please try again shortly.',
        });
      } else {
        setErrorInfo({
          type: 'general',
          message: err.message || 'Registration failed. Please check your details.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">Create Student Account</h2>
        <p className="card-subtitle">Register to begin preparing for CUET PG test series</p>
      </div>

      {errorInfo && (
        <div
          className={`alert ${errorInfo.type === 'duplicate' ? 'alert-warning' : 'alert-error'}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
        >
          <div><strong>{errorInfo.type === 'duplicate' ? 'Notice:' : 'Error:'}</strong> {errorInfo.message}</div>
          {errorInfo.type === 'duplicate' && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.25rem 0',
                fontSize: '0.85rem',
              }}
            >
              Click here to sign in with this email &rarr;
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-fullname">Full Name</label>
          <input
            id="reg-fullname"
            type="text"
            className="form-input"
            placeholder="e.g. Aditi Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            required
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            placeholder="e.g. aditi@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
            autoComplete="email"
          />
          <span className="form-help">Normalized to lowercase automatically</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
            autoComplete="new-password"
          />
          <span className="form-help">Must be at least 8 characters</span>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
          {submitting ? 'Creating Account...' : 'Register as Student'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
