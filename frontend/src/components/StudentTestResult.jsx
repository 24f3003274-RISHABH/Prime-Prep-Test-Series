import React, { useState, useEffect } from 'react';
import { getStudentAttemptResult } from '../api/client.js';

export default function StudentTestResult({ attemptId, initialResult, onBackToDashboard, onViewHistory }) {
  const [result, setResult] = useState(initialResult || null);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNANSWERED'

  useEffect(() => {
    if (!initialResult) {
      loadResult();
    }
  }, [attemptId]);

  const loadResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAttemptResult(attemptId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to load test results.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Calculating score and generating solutions report...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="card">
        <div className="status-pill status-error" style={{ display: 'block', padding: '1rem', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error || 'Could not find attempt results.'}
        </div>
        <button className="btn btn-outline" onClick={onBackToDashboard}>
          &larr; Back to Dashboard
        </button>
      </div>
    );
  }

  const formatSeconds = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const filteredQuestions = (result.questions || []).filter((q) => {
    if (activeFilter === 'CORRECT') return q.isCorrect;
    if (activeFilter === 'INCORRECT') return q.isAttempted && !q.isCorrect;
    if (activeFilter === 'UNANSWERED') return !q.isAttempted;
    return true;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Result Header & Score Card */}
      <div className="card" style={{ borderTop: '4px solid #16a34a' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="status-pill status-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {result.subjectName}
              </span>
              {result.chapterName && (
                <span className="status-pill status-secondary" style={{ fontSize: '0.75rem' }}>
                  {result.chapterName}
                </span>
              )}
              <span className="status-pill status-success" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {result.testType?.replace('_', ' ')} #{result.testNumber || 1}
              </span>
            </div>
            <h2 className="card-title" style={{ fontSize: '1.4rem' }}>{result.testTitle}</h2>
            <p className="card-subtitle">
              Attempt completed on {new Date(result.submittedAt || Date.now()).toLocaleString()} &bull; Time taken: {formatSeconds(result.timeTakenSeconds)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={onViewHistory} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
              View All Attempts
            </button>
            <button className="btn btn-primary" onClick={onBackToDashboard} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Score & Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {/* Final Score */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Final Score</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
              {result.score} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/ {result.maxPossibleMarks}</span>
            </div>
          </div>

          {/* Accuracy */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {result.accuracyPercentage}%
            </div>
          </div>

          {/* Correct */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Correct</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
              {result.correctAnswers}
            </div>
          </div>

          {/* Incorrect */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#991b1b', textTransform: 'uppercase', fontWeight: 600 }}>Incorrect</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
              {result.incorrectAnswers}
            </div>
          </div>

          {/* Unanswered */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unanswered</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.2rem' }}>
              {result.unansweredQuestions}
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={() => setActiveFilter('ALL')}
          >
            All Questions ({result.questions?.length || 0})
          </button>
          <button
            type="button"
            className={`btn ${activeFilter === 'CORRECT' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: '#86efac', color: activeFilter === 'CORRECT' ? '#ffffff' : '#16a34a' }}
            onClick={() => setActiveFilter('CORRECT')}
          >
            ✓ Correct ({result.correctAnswers})
          </button>
          <button
            type="button"
            className={`btn ${activeFilter === 'INCORRECT' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: '#fca5a5', color: activeFilter === 'INCORRECT' ? '#ffffff' : '#dc2626' }}
            onClick={() => setActiveFilter('INCORRECT')}
          >
            ✗ Incorrect ({result.incorrectAnswers})
          </button>
          <button
            type="button"
            className={`btn ${activeFilter === 'UNANSWERED' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={() => setActiveFilter('UNANSWERED')}
          >
            Unanswered ({result.unansweredQuestions})
          </button>
        </div>

        {/* Question-by-Question Review List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredQuestions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              No questions match the selected filter.
            </p>
          ) : (
            filteredQuestions.map((q, idx) => {
              const isCorrect = q.isCorrect;
              const isAttempted = q.isAttempted;

              let statusBadgeColor = '#94a3b8';
              let statusText = 'Not Answered (0 marks)';
              if (isCorrect) {
                statusBadgeColor = '#16a34a';
                statusText = `Correct (+${q.positiveMarks})`;
              } else if (isAttempted) {
                statusBadgeColor = '#dc2626';
                statusText = `Incorrect (-${q.negativeMarks})`;
              }

              return (
                <div
                  key={q.id}
                  style={{
                    border: `1px solid ${isCorrect ? '#86efac' : isAttempted ? '#fca5a5' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    backgroundColor: isCorrect ? '#f0fdf4' : isAttempted ? '#fef2f2' : '#ffffff',
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                      Q{q.displayOrder || idx + 1}. {q.questionText}
                    </span>
                    <span
                      className="status-pill"
                      style={{
                        backgroundColor: isCorrect ? '#dcfce7' : isAttempted ? '#fee2e2' : '#f1f5f9',
                        color: statusBadgeColor,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Options List */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {['A', 'B', 'C', 'D'].map((optKey) => {
                      const optText = q[`option${optKey}`];
                      const isStudentSelected = q.selectedOption === optKey;
                      const isCorrectOption = q.correctOption === optKey;

                      let optBg = '#ffffff';
                      let optBorder = '1px solid #e2e8f0';
                      let optColor = 'var(--color-text)';

                      if (isCorrectOption) {
                        optBg = '#dcfce7';
                        optBorder = '2px solid #16a34a';
                        optColor = '#166534';
                      } else if (isStudentSelected && !isCorrect) {
                        optBg = '#fee2e2';
                        optBorder = '2px solid #dc2626';
                        optColor = '#991b1b';
                      }

                      return (
                        <div
                          key={optKey}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '4px',
                            backgroundColor: optBg,
                            border: optBorder,
                            color: optColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <strong>({optKey})</strong> {optText}
                          </div>
                          <div>
                            {isStudentSelected && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: '0.5rem' }}>
                                [Your Answer]
                              </span>
                            )}
                            {isCorrectOption && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', marginLeft: '0.5rem' }}>
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation / Solution Section */}
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      borderLeft: '3px solid var(--color-primary)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    <strong style={{ color: 'var(--color-primary)' }}>Solution / Explanation:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', lineHeight: '1.5' }}>
                      {q.explanation || 'Solution not available.'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
