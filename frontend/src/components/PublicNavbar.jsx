import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PublicNavbar({ currentView, onNavigate }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', borderBottom: '1px solid var(--color-border)' }}>
      <div className="brand-container" style={{ cursor: 'pointer' }} onClick={() => onNavigate('home')}>
        <span className="brand-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
          PrimePrep
        </span>
        <span className="brand-badge" style={{ backgroundColor: '#eff6ff', color: 'var(--color-primary)', border: '1px solid #bfdbfe' }}>
          CUET PG
        </span>
      </div>

      <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
          style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'home' ? 700 : 500, cursor: 'pointer', color: currentView === 'home' ? 'var(--color-primary)' : 'var(--color-text)' }}
        >
          Home
        </button>

        <button
          type="button"
          className={`nav-btn ${currentView === 'catalogue' ? 'active' : ''}`}
          onClick={() => onNavigate('catalogue')}
          style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'catalogue' ? 700 : 500, cursor: 'pointer', color: currentView === 'catalogue' ? 'var(--color-primary)' : 'var(--color-text)' }}
        >
          Explore Test Series
        </button>

        <button
          type="button"
          className="nav-btn"
          onClick={() => onNavigate('subjects')}
          style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', color: 'var(--color-text)' }}
        >
          Subjects
        </button>

        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: '0.5rem' }}>
            {isAdmin ? (
              <button
                type="button"
                className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}
                onClick={() => onNavigate('admin')}
              >
                ⚙️ Admin Portal
              </button>
            ) : (
              <button
                type="button"
                className={`btn ${currentView === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}
                onClick={() => onNavigate('dashboard')}
              >
                📊 My Dashboard
              </button>
            )}

            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {user.fullName?.split(' ')[0] || user.email}
            </span>

            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${currentView === 'login' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
              onClick={() => onNavigate('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
              onClick={() => onNavigate('register')}
            >
              Register Free
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
