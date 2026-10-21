import React, { useState, useEffect } from 'react';
import { getPublicStats, getPublicSubjects, getFeaturedFreeTest } from '../api/client.js';

export default function PublicHomepage({ onNavigateToCatalogue, onSelectSubject, onSelectCategory, onOpenTestDetails }) {
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredTest, setFeaturedTest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, subjectsData, freeTestData] = await Promise.all([
        getPublicStats().catch(() => null),
        getPublicSubjects().catch(() => []),
        getFeaturedFreeTest().catch(() => null),
      ]);
      setStats(statsData);
      setSubjects(subjectsData || []);
      setFeaturedTest(freeTestData);
    } catch (err) {
      setError('Failed to load catalogue data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleTryFreeTest = () => {
    if (featuredTest && featuredTest.id) {
      onOpenTestDetails(featuredTest.id);
    } else {
      // Navigate to catalogue filtered by free tests
      onNavigateToCatalogue({ accessType: 'free' });
    }
  };

  return (
    <div>
      {/* 1. HERO SECTION */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: '3.5rem 1.5rem',
          borderRadius: 'var(--radius)',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ maxWidth: '850px', margin: '0 auto', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            India's Dedicated CUET PG Mock Test Portal
          </span>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '1.25rem',
              color: '#ffffff',
            }}
          >
            Prepare Smarter for CUET PG with PrimePrep
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto 2rem auto',
            }}
          >
            Practice chapter-wise tests, full-length mock examinations, and previous-year questions to prepare confidently for CUET PG.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigateToCatalogue()}
              style={{
                fontSize: '1rem',
                padding: '0.75rem 1.8rem',
                fontWeight: 700,
                backgroundColor: '#2563eb',
                borderColor: '#2563eb',
                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
              }}
            >
              Explore Test Series &rarr;
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleTryFreeTest}
              style={{
                fontSize: '1rem',
                padding: '0.75rem 1.8rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              🎯 Try a Free Test
            </button>
          </div>
        </div>
      </section>

      {/* 2. REAL DATABASE STATISTICS */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Real-Time CUET PG Examination Question Bank
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Authoritative, syllabus-aligned test series updated continuously by academic mentors
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', margin: 0, borderTop: '3px solid #2563eb' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>
              {stats ? stats.subjectsCount : (loading ? '...' : 7)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
              Published Subjects
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Core postgraduate disciplines
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', margin: 0, borderTop: '3px solid #059669' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
              {stats ? stats.chaptersCount : (loading ? '...' : 25)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
              Published Chapters
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Structured syllabus units
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', margin: 0, borderTop: '3px solid #7c3aed' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>
              {stats ? stats.testsCount : (loading ? '...' : 30)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
              Available Tests
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Sectional, Full-Length & PYQ
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', margin: 0, borderTop: '3px solid #ea580c' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ea580c', lineHeight: 1 }}>
              {stats ? stats.questionsCount : (loading ? '...' : 250)}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
              Questions Available
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              With verified answers & solutions
            </div>
          </div>
        </div>
      </section>

      {/* 3. TEST CATEGORIES */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              Test Series Categories
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Targeted practice designed for each phase of your CUET PG preparation
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            onClick={() => onNavigateToCatalogue()}
          >
            View All Tests &rarr;
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Card 1: Sectional Tests */}
          <div
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onClick={() => onSelectCategory('sectional')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="status-pill status-primary" style={{ fontSize: '0.75rem' }}>
                  Chapter-Wise
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Up to 15 / Chapter
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Sectional Tests
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Focused 30–45 minute tests covering single chapter topics. Master individual syllabus concepts with granular feedback and explanations.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('sectional');
              }}
            >
              Explore Sectional Tests &rarr;
            </button>
          </div>

          {/* Card 2: Full-Length Mock Tests */}
          <div
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onClick={() => onSelectCategory('full_length')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="status-pill status-success" style={{ fontSize: '0.75rem' }}>
                  NTA Exam Pattern
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Up to 10 / Chapter
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Full-Length Mock Tests
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Full-syllabus comprehensive mocks matching the exact CUET PG question distribution, +4 / -1 marking scheme, and time limit.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('full_length');
              }}
            >
              Explore Full-Length Mocks &rarr;
            </button>
          </div>

          {/* Card 3: PYQ Tests */}
          <div
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onClick={() => onSelectCategory('pyq')}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="status-pill status-warning" style={{ fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e' }}>
                  Past Papers
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Up to 5 / Chapter
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Previous-Year Questions (PYQ)
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Actual past year exam papers from previous CUET PG cycles. Experience actual question trends and difficulty levels with detailed solutions.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('pyq');
              }}
            >
              Explore PYQ Tests &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC SUBJECTS SECTION */}
      <section id="subjects-section" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              CUET PG Master Disciplines
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Comprehensive test series available for 7 major postgraduate entrance subjects
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Loading subjects from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="card">
            <div className="status-pill status-error" style={{ display: 'block', padding: '1rem' }}>
              {error}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {subjects.map((subj) => (
              <div
                key={subj.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: '3px solid var(--color-primary)',
                }}
                onClick={() => onSelectSubject(subj.id)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: '#eff6ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {subj.paper_code || subj.code || 'CUET PG'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      #{subj.display_order || 1}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                    {subj.name}
                  </h3>

                  <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {subj.description || `Comprehensive test series for CUET PG ${subj.name}.`}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span className="status-pill status-secondary" style={{ fontSize: '0.725rem' }}>
                      📚 {subj.chapter_count || 0} Chapters
                    </span>
                    <span className="status-pill status-secondary" style={{ fontSize: '0.725rem' }}>
                      📝 {subj.test_count || 0} Tests
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSubject(subj.id);
                    }}
                  >
                    Explore Subject &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. PLATFORM FEATURES / WHY PRIMEPREP */}
      <section className="card" style={{ backgroundColor: '#f8fafc', padding: '2rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 1.75rem auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Engineered for Authentic Examination Practice
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Everything you need to build speed, accuracy, and examination stamina
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>⏱️</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Server-Side Timer</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Countdown synced directly with the server so time never resets on browser refresh.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>💾</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Answer Persistence</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Every response is saved atomically to PostgreSQL, ensuring no lost answers.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>📊</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>Detailed Solutions</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Step-by-step explanations revealed after submission to learn from every mistake.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>🎯</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>5-State Question Palette</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Review marked, answered, and unvisited questions just like the actual NTA exam.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
