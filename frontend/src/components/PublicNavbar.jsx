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

      <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => onNavigate('dashboard')}
              style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'dashboard' ? 700 : 500, cursor: 'pointer', color: currentView === 'dashboard' ? 'var(--color-primary)' : 'var(--color-text)' }}
            >
              Dashboard
            </button>

            <button
              type="button"
              className={`nav-btn ${currentView === 'subjects' || currentView === 'catalogue' ? 'active' : ''}`}
              onClick={() => onNavigate('subjects')}
              style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'subjects' || currentView === 'catalogue' ? 700 : 500, cursor: 'pointer', color: currentView === 'subjects' || currentView === 'catalogue' ? 'var(--color-primary)' : 'var(--color-text)' }}
            >
              Subjects
            </button>

            <button
              type="button"
              className={`nav-btn ${currentView === 'results' ? 'active' : ''}`}
              onClick={() => onNavigate('results')}
              style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'results' ? 700 : 500, cursor: 'pointer', color: currentView === 'results' ? 'var(--color-primary)' : 'var(--color-text)' }}
            >
              My Results
            </button>

            <button
              type="button"
              className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => onNavigate('profile')}
              style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: currentView === 'profile' ? 700 : 500, cursor: 'pointer', color: currentView === 'profile' ? 'var(--color-primary)' : 'var(--color-text)' }}
            >
              Profile
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`btn ${currentView === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', marginLeft: '0.25rem' }}
                onClick={() => onNavigate('admin')}
              >
                ⚙️ Admin Portal
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {user.fullName?.split(' ')[0] || user.email}
              </span>

              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </nav>
    </header>
  );
}
