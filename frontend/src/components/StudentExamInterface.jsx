import React, { useState, useEffect, useRef } from 'react';
import {
  getStudentAttempt,
  saveStudentResponse,
  submitStudentAttempt,
} from '../api/client.js';

export default function StudentExamInterface({ attemptId, initialData, onSubmitSuccess }) {
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  // Exam attempt data
  const [test, setTest] = useState(initialData?.test || null);
  const [questions, setQuestions] = useState(initialData?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Map of questionId -> { selectedOption, isMarkedForReview, visited }
  const [responses, setResponses] = useState(initialData?.savedResponses || {});

  // Server-authoritative timer
  const [remainingSeconds, setRemainingSeconds] = useState(initialData?.remainingSeconds || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState(null);

  // Mobile drawer toggle for question palette
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);

  const timerRef = useRef(null);

  // Load / Restore attempt state on mount (or if page refreshed)
  useEffect(() => {
    if (!initialData) {
      loadAttemptState();
    }
  }, [attemptId]);

  const loadAttemptState = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAttempt(attemptId);
      if (data.isCompleted) {
        onSubmitSuccess(data.attemptId);
        return;
      }
      setTest(data.test);
      setQuestions(data.questions || []);
      setResponses(data.savedResponses || {});
      setRemainingSeconds(data.remainingSeconds);
    } catch (err) {
      setError(err.message || 'Failed to load examination attempt.');
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds]);

  // Auto-submit when time expires
  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitStudentAttempt(attemptId);
      onSubmitSuccess(attemptId, result);
    } catch (err) {
      alert(`Exam time expired. Submission message: ${err.message}`);
      onSubmitSuccess(attemptId);
    }
  };

  // Helper to persist answer to backend
  const persistResponse = async (qId, updatedFields) => {
    const current = responses[qId] || { selectedOption: null, isMarkedForReview: false, visited: true };
    const payload = {
      ...current,
      ...updatedFields,
      visited: true,
    };

    // Update local state immediately for fast UI feedback
    setResponses((prev) => ({
      ...prev,
      [qId]: payload,
    }));

    setSavingQuestionId(qId);
    try {
      await saveStudentResponse(attemptId, qId, payload);
    } catch (err) {
      console.error('Failed to save question response:', err);
    } finally {
      setSavingQuestionId(null);
    }
  };

  const currentQuestion = questions[currentIndex];
  const currentResp = currentQuestion ? responses[currentQuestion.id] || { selectedOption: null, isMarkedForReview: false, visited: false } : null;

  // Mark current question as visited on load/index change
  useEffect(() => {
    if (currentQuestion && (!currentResp || !currentResp.visited)) {
      persistResponse(currentQuestion.id, { visited: true });
    }
  }, [currentIndex, currentQuestion?.id]);

  // Option selection
  const handleSelectOption = (opt) => {
    if (!currentQuestion) return;
    const newOption = currentResp?.selectedOption === opt ? null : opt; // Toggle or set
    persistResponse(currentQuestion.id, { selectedOption: newOption, visited: true });
  };

  // Clear Response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
    persistResponse(currentQuestion.id, { selectedOption: null, visited: true });
  };

  // Toggle Mark for Review
  const handleToggleReview = () => {
    if (!currentQuestion) return;
    const nextReview = !currentResp?.isMarkedForReview;
    persistResponse(currentQuestion.id, { isMarkedForReview: nextReview, visited: true });
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleJumpToQuestion = (index) => {
    setCurrentIndex(index);
    setShowPaletteMobile(false);
  };

  // Final Submit confirmation
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitStudentAttempt(attemptId);
      setShowSubmitModal(false);
      onSubmitSuccess(attemptId, result);
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  // Question state classifier (1 of 5 states)
  const getQuestionState = (qId) => {
    const r = responses[qId];
    if (!r || !r.visited) return 'NOT_VISITED';
    const hasAnswer = Boolean(r.selectedOption);
    const isReview = Boolean(r.isMarkedForReview);

    if (hasAnswer && isReview) return 'ANSWERED_AND_REVIEW';
    if (isReview) return 'MARKED_FOR_REVIEW';
    if (hasAnswer) return 'ANSWERED';
    return 'NOT_ANSWERED';
  };

  // Format timer HH:MM:SS or MM:SS
  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Compute summary stats for the modal
  let answeredCount = 0;
  let reviewCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q) => {
    const state = getQuestionState(q.id);
    if (state === 'ANSWERED' || state === 'ANSWERED_AND_REVIEW') answeredCount++;
    if (state === 'MARKED_FOR_REVIEW' || state === 'ANSWERED_AND_REVIEW') reviewCount++;
    if (state === 'NOT_ANSWERED') notAnsweredCount++;
    if (state === 'NOT_VISITED') notVisitedCount++;
  });
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading examination session from PostgreSQL...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="status-pill status-error" style={{ display: 'block', padding: '1rem', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>
          Retry Examination Connection
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Test Header Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
            {test?.subjectName} {test?.chapterName ? `• ${test.chapterName}` : ''}
          </span>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.15rem 0 0 0', color: 'var(--color-primary)' }}>
            {test?.title}
          </h2>
        </div>

        {/* Live Authoritative Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: remainingSeconds <= 300 ? '#fef2f2' : '#f0fdf4',
              color: remainingSeconds <= 300 ? '#dc2626' : '#166534',
              border: `1px solid ${remainingSeconds <= 300 ? '#fca5a5' : '#86efac'}`,
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '1.1rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>⏱</span>
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSubmitModal(true)}
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700, padding: '0.45rem 1rem' }}
          >
            Submit Test
          </button>

          {/* Toggle palette on mobile */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowPaletteMobile(!showPaletteMobile)}
            style={{ display: 'none', padding: '0.4rem 0.65rem' }}
            id="mobile-palette-toggle"
          >
            {showPaletteMobile ? 'Hide Palette' : 'Show Palette'}
          </button>
        </div>
      </div>

      {/* Main Examination Layout: 2 Columns (Question Workspace + Question Palette) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Column: Active Question Workspace */}
        <div className="card" style={{ margin: 0, minHeight: '520px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Question Header & Marking Scheme */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Question {currentIndex + 1}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  of {questions.length}
                </span>
                {savingQuestionId === currentQuestion?.id && (
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', marginLeft: '0.5rem' }}>
                    saving...
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span className="status-pill status-success" style={{ fontWeight: 600 }}>
                  +{currentQuestion?.positiveMarks || 4.0}
                </span>
                <span className="status-pill status-error" style={{ fontWeight: 600 }}>
                  -{currentQuestion?.negativeMarks || 1.0}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {currentQuestion?.questionText}
            </div>

            {/* Multiple Choice Options (A, B, C, D) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['A', 'B', 'C', 'D'].map((optKey) => {
                const optText = currentQuestion?.[`option${optKey}`];
                const isSelected = currentResp?.selectedOption === optKey;

                return (
                  <div
                    key={optKey}
                    onClick={() => handleSelectOption(optKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1rem',
                      border: isSelected ? '2px solid #2563eb' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.1)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : 'var(--color-text)',
                        flexShrink: 0,
                      }}
                    >
                      {optKey}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: isSelected ? '#1e3a8a' : 'var(--color-text)', fontWeight: isSelected ? 600 : 400 }}>
                      {optText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation & Action Bar */}
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '1.25rem',
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            {/* Left Actions: Review & Clear */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${currentResp?.isMarkedForReview ? 'btn-primary' : 'btn-outline'}`}
                onClick={handleToggleReview}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.45rem 0.85rem',
                  backgroundColor: currentResp?.isMarkedForReview ? '#7c3aed' : undefined,
                  borderColor: currentResp?.isMarkedForReview ? '#7c3aed' : undefined,
                }}
              >
                {currentResp?.isMarkedForReview ? '★ Marked for Review' : '☆ Mark for Review'}
              </button>

              {currentResp?.selectedOption && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleClearResponse}
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', color: '#b91c1c', borderColor: '#fca5a5' }}
                >
                  Clear Response
                </button>
              )}
            </div>

            {/* Right Actions: Previous & Save/Next */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                &larr; Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                  style={{ fontSize: '0.85rem', padding: '0.45rem 1.25rem', fontWeight: 600 }}
                >
                  Save & Next &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowSubmitModal(true)}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontSize: '0.85rem', padding: '0.45rem 1.25rem', fontWeight: 700 }}
                >
                  Save & Review Exam &rarr;
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigation Palette */}
        <div className="card" style={{ margin: 0 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
            Question Palette ({questions.length})
          </h4>

          {/* Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#16a34a' }}></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }}></span>
              <span>Not Answered ({notAnsweredCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#7c3aed' }}></span>
              <span>Review ({reviewCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#94a3b8' }}></span>
              <span>Not Visited ({notVisitedCount})</span>
            </div>
          </div>

          {/* Question Number Grid */}
          <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem' }}>
              {questions.map((q, idx) => {
                const state = getQuestionState(q.id);
                const isCurrent = idx === currentIndex;

                let bg = '#94a3b8'; // Not visited
                let fg = '#ffffff';
                let border = 'none';

                if (state === 'ANSWERED') {
                  bg = '#16a34a';
                } else if (state === 'NOT_ANSWERED') {
                  bg = '#dc2626';
                } else if (state === 'MARKED_FOR_REVIEW') {
                  bg = '#7c3aed';
                } else if (state === 'ANSWERED_AND_REVIEW') {
                  bg = '#7c3aed';
                  border = '2px solid #22c55e';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    style={{
                      height: '36px',
                      borderRadius: '4px',
                      backgroundColor: bg,
                      color: fg,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: isCurrent ? '2px solid #1e3a8a' : border,
                      boxShadow: isCurrent ? '0 0 0 2px #3b82f6' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                    title={`Question ${idx + 1}: ${state.replace(/_/g, ' ')}`}
                  >
                    {idx + 1}
                    {state === 'ANSWERED_AND_REVIEW' && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#22c55e',
                        }}
                      ></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Test Submission Confirmation Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '100%', margin: 0 }}>
            <div className="card-header">
              <h3 className="card-title">Confirm Final Test Submission</h3>
              <p className="card-subtitle">Are you sure you want to finish and submit your exam?</p>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius)', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Total Questions:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{questions.length}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Remaining Time:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: remainingSeconds <= 300 ? '#dc2626' : 'var(--color-primary)' }}>
                    {formatTimer(remainingSeconds)}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <span style={{ color: '#166534' }}>✓ Answered:</span>
                  <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.1rem' }}>{answeredCount}</div>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <span style={{ color: '#991b1b' }}>✗ Unanswered:</span>
                  <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.1rem' }}>{unansweredCount}</div>
                </div>
                <div>
                  <span style={{ color: '#6d28d9' }}>★ Marked for Review:</span>
                  <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '1.1rem' }}>{reviewCount}</div>
                </div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.85rem', color: '#92400e', marginBottom: '1.25rem' }}>
                ⚠️ You still have <strong>{unansweredCount} unanswered questions</strong>. Once submitted, your exam will be evaluated immediately.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Return to Exam
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700, padding: '0.5rem 1.25rem' }}
              >
                {isSubmitting ? 'Evaluating & Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
