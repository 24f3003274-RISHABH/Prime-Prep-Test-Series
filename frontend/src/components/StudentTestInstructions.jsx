import React, { useState, useEffect } from 'react';
import { getStudentTestInstructions, startStudentTest } from '../api/client.js';

export default function StudentTestInstructions({ testId, onStartExam, onBack }) {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInstructions();
  }, [testId]);

  const loadInstructions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentTestInstructions(testId);
      setTest(data);
    } catch (err) {
      setError(err.message || 'Failed to load test instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const session = await startStudentTest(testId);
      onStartExam(session);
    } catch (err) {
      setError(err.message || 'Failed to start test attempt.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading test examination instructions...</p>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="card">
        <div className="status-pill status-error" style={{ display: 'block', padding: '1rem', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
        <button className="btn btn-outline" onClick={onBack}>
          &larr; Back to Test Catalogue
        </button>
      </div>
    );
  }

  const qCount = parseInt(test?.question_count, 10) || 0;
  const isReady = qCount > 0;
  const hasActiveAttempt = Boolean(test?.active_attempt);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card">
        {/* Header */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="status-pill status-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {test.subject_name}
              </span>
              {test.chapter_name && (
                <span className="status-pill status-secondary" style={{ fontSize: '0.75rem' }}>
                  {test.chapter_name}
                </span>
              )}
              <span className="status-pill status-success" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {test.test_type?.replace('_', ' ')} #{test.test_number || 1}
              </span>
            </div>
            <h2 className="card-title" style={{ fontSize: '1.4rem' }}>{test.title}</h2>
            <p className="card-subtitle">{test.description || 'CUET PG Examination Mock Test'}</p>
          </div>
          <button className="btn btn-outline" onClick={onBack} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
            &larr; Back to Catalogue
          </button>
        </div>

        {error && (
          <div className="status-pill status-error" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {hasActiveAttempt && (
          <div style={{ padding: '0.85rem 1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', marginBottom: '1.25rem', color: '#1e40af' }}>
            <strong>In-Progress Attempt Detected:</strong> You have an active attempt started at {new Date(test.active_attempt.startedAt).toLocaleTimeString()}. Click "Resume Test" below to continue where you left off.
          </div>
        )}

        {/* Test Specifications Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Questions</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {qCount} Questions
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Test Duration</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {test.duration_minutes} Minutes
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase' }}>Marking Scheme</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>
              +{test.positive_marks} / -{test.negative_marks}
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Maximum Marks</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {test.total_marks} Marks
            </div>
          </div>
        </div>

        {/* Examination Instructions Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
            Standard Examination Rules & Instructions:
          </h4>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: '1.6', margin: 0 }}>
            <li><strong>Timer Begins:</strong> The countdown timer will start immediately once you click the <em>{hasActiveAttempt ? 'Resume Test' : 'Start Test'}</em> button below.</li>
            <li><strong>Single Choice:</strong> Each question has 4 options (A, B, C, D) with exactly one correct answer.</li>
            <li><strong>Negative Marking:</strong> Each correct response awards <strong>+{test.positive_marks} marks</strong>, while each incorrect answer deducts <strong>-{test.negative_marks} marks</strong>. Unanswered questions receive <strong>0 marks</strong>.</li>
            <li><strong>Answer Persistence:</strong> Clicking <em>Save & Next</em> or selecting an option saves your answer in the database. Saved answers and remaining time are preserved if you reload or refresh the browser.</li>
            <li><strong>Review Palette:</strong> You can mark questions for review using the <em>Mark for Review</em> button. You can jump directly to any question by clicking its number in the navigation palette.</li>
            <li><strong>Automatic Submission:</strong> When the timer reaches 00:00, your exam will be automatically locked and submitted.</li>
            <li><strong>Solutions & Score:</strong> After final submission, the full score, accuracy, and question-by-question solutions will be displayed.</li>
          </ul>

          {test.instructions && (
            <div style={{ marginTop: '1rem', padding: '0.85rem', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
              <strong>Admin Instructions:</strong> {test.instructions}
            </div>
          )}
        </div>

        {!isReady && (
          <div style={{ padding: '0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#991b1b', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            ⚠️ This test currently has 0 mapped questions. An administrator must upload questions via the Bulk Question Upload Engine before students can take it.
          </div>
        )}

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <button className="btn btn-outline" onClick={onBack}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={starting || !isReady}
            style={{ fontWeight: 700, padding: '0.65rem 1.75rem', fontSize: '1rem' }}
          >
            {starting ? 'Initiating Exam Session...' : hasActiveAttempt ? 'Resume Test &rarr;' : 'I Am Ready &bull; Start Test &rarr;'}
          </button>
        </div>
      </div>
    </div>
  );
}
