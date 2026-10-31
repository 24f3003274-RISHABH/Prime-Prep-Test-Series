import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getPublicTestDetails, startStudentTest } from '../api/client.js';

export default function PublicTestDetails({
  testId,
  onBackToCatalogue,
  onRequireAuth,
  onStartExamSession,
}) {
  const { user, isAuthenticated } = useAuth();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [accessNotice, setAccessNotice] = useState(null);

  useEffect(() => {
    loadDetails();
  }, [testId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    setAccessNotice(null);
    try {
      const data = await getPublicTestDetails(testId);
      setTest(data);
    } catch (err) {
      if (err.status === 404 || err.status === 403) {
        setError('Test not found or not published. This test may be in draft mode or reserved for future releases.');
      } else {
        setError(err.message || 'Failed to load test details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartClick = async () => {
    setAccessNotice(null);

    // 1. If not authenticated, prompt sign-in / registration with returnTo
    if (!isAuthenticated) {
      onRequireAuth(testId);
      return;
    }

    // 2. If authenticated, try to start the test
    setStarting(true);
    try {
      const sessionData = await startStudentTest(testId);
      onStartExamSession(sessionData);
    } catch (err) {
      if (err.code === 'PAID_TEST_RESTRICTED' || err.status === 403) {
        setAccessNotice({
          type: 'paid_restricted',
          message: err.message || 'This is a premium / paid test. An active subscription or course enrollment is required to attempt this test.',
        });
      } else if (err.code === 'MAX_ATTEMPTS_EXCEEDED') {
        setAccessNotice({
          type: 'max_attempts',
          message: err.message || 'You have already exhausted your maximum allowed attempts for this test.',
        });
      } else {
        setAccessNotice({
          type: 'error',
          message: err.message || 'Failed to initiate examination session.',
        });
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading test specifications from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="card" style={{ maxWidth: '700px', margin: '2rem auto' }}>
        <div className="status-pill status-error" style={{ display: 'block', padding: '1rem', marginBottom: '1.25rem' }}>
          <strong>Unavailable:</strong> {error || 'Test not found.'}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Unpublished tests and drafts are never exposed to public visitors or students. Only tests explicitly published by platform administrators can be explored or attempted.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBackToCatalogue}>
          &larr; Back to Public Catalogue
        </button>
      </div>
    );
  }

  const isFree = test.access_type === 'free';
  const qCount = parseInt(test.question_count, 10) || 0;
  const isReady = qCount > 0;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--color-text-muted)' }}>
        <button
          type="button"
          onClick={onBackToCatalogue}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          &larr; Explore Test Series
        </button>
        <span>&rsaquo;</span>
        <span>{test.subject_name}</span>
        {test.chapter_name && (
          <>
            <span>&rsaquo;</span>
            <span>{test.chapter_name}</span>
          </>
        )}
      </div>

      <div className="card" style={{ borderTop: isFree ? '4px solid #16a34a' : '4px solid #7c3aed' }}>
        {/* Header */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-pill status-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {test.subject_name} {test.subject_paper_code ? `(${test.subject_paper_code})` : ''}
              </span>
              {test.chapter_name && (
                <span className="status-pill status-secondary" style={{ fontSize: '0.75rem' }}>
                  {test.chapter_name}
                </span>
              )}
              <span className="status-pill status-secondary" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                {test.test_type?.replace('_', ' ')} #{test.test_number || 1}
              </span>
              <span className={`status-pill ${isFree ? 'status-success' : 'status-warning'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {isFree ? 'FREE TEST' : 'PREMIUM'}
              </span>
            </div>

            <h1 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {test.title}
            </h1>
            <p className="card-subtitle" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {test.description || 'CUET PG Examination Mock Test based on official NTA curriculum.'}
            </p>
          </div>

          <button className="btn btn-outline" onClick={onBackToCatalogue} style={{ fontSize: '0.85rem' }}>
            Browse All Tests
          </button>
        </div>

        {/* Access Notices & Warnings */}
        {accessNotice && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              backgroundColor: accessNotice.type === 'paid_restricted' ? '#fef3c7' : '#fef2f2',
              color: accessNotice.type === 'paid_restricted' ? '#92400e' : '#991b1b',
              border: `1px solid ${accessNotice.type === 'paid_restricted' ? '#fde68a' : '#fecaca'}`,
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong>{accessNotice.type === 'paid_restricted' ? '🔒 Premium Test Enrollment Required:' : '⚠️ Notice:'}</strong>{' '}
            {accessNotice.message}
            {accessNotice.type === 'paid_restricted' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.825rem' }}>
                Free tests are available across all 7 subjects in the public catalogue. You can explore free mock tests anytime!
              </div>
            )}
          </div>
        )}

        {/* 4 Specifications Summary Metric Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Questions</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {qCount} Questions
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Test Duration</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {test.duration_minutes} Minutes
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Marking Scheme</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
              +{test.positive_marks} / -{test.negative_marks}
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Maximum Marks</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {test.total_marks || (qCount * 4).toFixed(2)} Marks
            </div>
          </div>
        </div>

        {/* Examination Instructions Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
            Official Examination Instructions & Rules:
          </h3>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: '1.65', margin: 0 }}>
            <li><strong>Timer Starts on Launch:</strong> Clicking the Start Test button initiates the server-synchronized countdown timer. The timer persists across browser reloads.</li>
            <li><strong>Single Choice Format:</strong> Each question contains 4 options (A, B, C, D) with exactly one correct option.</li>
            <li><strong>Marking Scheme:</strong> Each correct response awards <strong>+{test.positive_marks} marks</strong>. Each incorrect choice incurs a penalty of <strong>-{test.negative_marks} marks</strong>. Unanswered questions receive <strong>0 marks</strong>.</li>
            <li><strong>Instant Answer Persistence:</strong> Your answers are saved atomically in the database as you click each option. You can navigate back and forth using the question palette.</li>
            <li><strong>Auto-Submission:</strong> Once the countdown timer reaches 00:00, your test is automatically submitted by the server.</li>
            <li><strong>Review & Explanations:</strong> Comprehensive question-by-question explanations and performance metrics are available immediately post-submission.</li>
          </ul>

          {test.instructions && (
            <div style={{ marginTop: '1rem', padding: '0.85rem', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
              <strong>Admin Special Instructions:</strong> {test.instructions}
            </div>
          )}
        </div>

        {!isReady && (
          <div style={{ padding: '0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#991b1b', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            ⚠️ This test currently has 0 mapped questions. An administrator must upload questions via the Bulk Question Upload Engine before students can take it.
          </div>
        )}

        {/* Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {isAuthenticated ? (
              <span>Authenticated as <strong>{user.fullName}</strong> ({user.role})</span>
            ) : (
              <span>Guest visitor &bull; Sign in required before launching active attempt</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={onBackToCatalogue}>
              Cancel
            </button>

            <button
              className="btn btn-primary"
              onClick={handleStartClick}
              disabled={starting || !isReady}
              style={{ fontWeight: 700, padding: '0.65rem 1.75rem', fontSize: '1rem' }}
            >
              {starting
                ? 'Initiating Session...'
                : isAuthenticated
                ? 'I Am Ready &bull; Start Test &rarr;'
                : 'Sign In to Start Test &rarr;'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
