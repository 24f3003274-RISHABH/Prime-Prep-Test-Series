import React, { useState, useEffect } from 'react';
import {
  getSubjects,
  getQuestionBank,
  updateQuestion,
  deleteQuestion,
} from '../api/client.js';

export default function AdminQuestionBank() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Questions and pagination
  const [questions, setQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Question Editor Modal State
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    positiveMarks: 4,
    negativeMarks: 1,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const showMsg = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
  };

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  useEffect(() => {
    loadQuestions(1);
  }, [selectedSubjectId, selectedCategory, searchQuery]);

  const loadQuestions = async (targetPage = 1) => {
    setLoading(true);
    try {
      const offset = (targetPage - 1) * limit;
      const res = await getQuestionBank({
        subjectId: selectedSubjectId || undefined,
        testType: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        limit,
        offset,
      });

      setQuestions(res.questions || []);
      setTotalCount(res.total || 0);
      setPage(targetPage);
    } catch (err) {
      showMsg(err.message || 'Failed to load question bank', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Editor Modal
  const startEditQuestion = (q) => {
    setEditingQuestion(q);
    setEditForm({
      questionText: q.question_text || '',
      optionA: q.option_a || '',
      optionB: q.option_b || '',
      optionC: q.option_c || '',
      optionD: q.option_d || '',
      correctOption: q.correct_option || 'A',
      explanation: q.explanation || '',
      positiveMarks: q.positive_marks || 4,
      negativeMarks: q.negative_marks || 1,
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setSavingEdit(true);
    try {
      await updateQuestion(editingQuestion.id, {
        questionText: editForm.questionText.trim(),
        optionA: editForm.optionA.trim(),
        optionB: editForm.optionB.trim(),
        optionC: editForm.optionC.trim(),
        optionD: editForm.optionD.trim(),
        correctOption: editForm.correctOption.toUpperCase(),
        explanation: editForm.explanation.trim() || undefined,
        positiveMarks: parseFloat(editForm.positiveMarks) || 4.0,
        negativeMarks: parseFloat(editForm.negativeMarks) || 1.0,
      });

      showMsg('Question updated successfully!');
      setEditingQuestion(null);
      loadQuestions(page);
    } catch (err) {
      showMsg(err.message || 'Failed to update question', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Safe Delete Question
  const handleDeleteQuestion = async (qId) => {
    setDeleting(true);
    try {
      await deleteQuestion(qId);
      showMsg('Question deleted from bank successfully.');
      setDeleteConfirmation(null);
      loadQuestions(page);
    } catch (err) {
      showMsg(err.message || 'Failed to delete question.', 'error');
      setDeleteConfirmation(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`status-pill ${feedback.type === 'error' ? 'status-error' : 'status-success'}`}
          style={{
            display: 'block',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
              CUET PG Question Bank & Editor
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
              Search, inspect, edit options, verify answer keys, and manage questions across all test series.
            </p>
          </div>
          <span className="status-pill status-primary" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            {totalCount} Total Questions
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>Search Question Text or Solutions</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Constitution, Plato, Keynes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>Subject Discipline</label>
            <select
              className="form-input"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="">All Subjects (7 Disciplines)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.paper_code || 'CUET'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>Test Category</label>
            <select
              className="form-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="sectional">Sectional Tests</option>
              <option value="full_length">Full-Length Mocks</option>
              <option value="pyq">PYQ Papers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading question bank records...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
            No Questions Found
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Try clearing the search query or changing the subject filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q, idx) => {
            const hasAttempts = parseInt(q.attempt_count, 10) > 0;
            const globalIndex = (page - 1) * limit + idx + 1;

            return (
              <div
                key={q.id}
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  borderLeft: '4px solid var(--color-primary)',
                  transition: 'box-shadow 0.15s ease',
                }}
              >
                {/* Badges & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      #{globalIndex}
                    </span>
                    <span className="status-pill status-primary" style={{ fontSize: '0.7rem' }}>
                      {q.subject_name}
                    </span>
                    {q.test_title && (
                      <span className="status-pill status-secondary" style={{ fontSize: '0.7rem' }}>
                        Test: {q.test_title}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                      +{q.positive_marks} / -{q.negative_marks}
                    </span>
                    {hasAttempts && (
                      <span className="status-pill status-warning" style={{ fontSize: '0.675rem' }}>
                        {q.attempt_count} Student Attempts
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                      onClick={() => startEditQuestion(q)}
                    >
                      ✏️ Edit Question
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: '#dc2626', borderColor: '#fca5a5' }}
                      onClick={() => setDeleteConfirmation({ id: q.id, text: q.question_text, hasAttempts })}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--color-text)', lineHeight: 1.45 }}>
                  {q.question_text}
                </h4>

                {/* 4 Options Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {['A', 'B', 'C', 'D'].map((optKey) => {
                    const optText = q[`option_${optKey.toLowerCase()}`];
                    const isCorrect = q.correct_option === optKey;

                    return (
                      <div
                        key={optKey}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: isCorrect ? '2px solid #16a34a' : '1px solid var(--color-border)',
                          backgroundColor: isCorrect ? '#f0fdf4' : '#f8fafc',
                          color: isCorrect ? '#166534' : 'var(--color-text)',
                          fontSize: '0.85rem',
                          fontWeight: isCorrect ? 700 : 400,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontWeight: 800, color: isCorrect ? '#15803d' : 'var(--color-primary)' }}>
                          {optKey}.
                        </span>
                        <span>{optText}</span>
                        {isCorrect && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#16a34a', fontWeight: 800 }}>
                            ✓ Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      backgroundColor: '#eff6ff',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: '#1e40af',
                      borderLeft: '3px solid #3b82f6',
                    }}
                  >
                    💡 <strong>Official Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '2rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => loadQuestions(page - 1)}
            style={{ fontSize: '0.85rem' }}
          >
            &larr; Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} questions)
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => loadQuestions(page + 1)}
            style={{ fontSize: '0.85rem' }}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LIVE QUESTION EDITOR */}
      {/* ======================================================== */}
      {editingQuestion && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '850px', width: '100%', maxHeight: '92vh', overflowY: 'auto', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Question Editor & Live Preview
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Discipline: {editingQuestion.subject_name}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setEditingQuestion(null)}
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* Question Text */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Question Text *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  value={editForm.questionText}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                />
              </div>

              {/* 4 Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Option A *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editForm.optionA}
                    onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Option B *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editForm.optionB}
                    onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Option C *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editForm.optionC}
                    onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Option D *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editForm.optionD}
                    onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })}
                  />
                </div>
              </div>

              {/* Correct Option & Marking Scheme */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Correct Option *</label>
                  <select
                    className="form-input"
                    value={editForm.correctOption}
                    onChange={(e) => setEditForm({ ...editForm, correctOption: e.target.value })}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Positive (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={editForm.positiveMarks}
                    onChange={(e) => setEditForm({ ...editForm, positiveMarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Negative (-)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={editForm.negativeMarks}
                    onChange={(e) => setEditForm({ ...editForm, negativeMarks: e.target.value })}
                  />
                </div>
              </div>

              {/* Explanation / Solution */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Detailed Solution / Explanation</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Official NTA curriculum rationale for this question..."
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                />
              </div>

              {/* LIVE STUDENT PREVIEW BOX */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Live Examination Preview (How Students Will See It):
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {editForm.questionText || 'Your question text will appear here...'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <div
                      key={letter}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: editForm.correctOption === letter ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        backgroundColor: editForm.correctOption === letter ? '#f0fdf4' : '#ffffff',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong>{letter}.</strong> {editForm[`option${letter}`] || `Option ${letter} text`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingQuestion(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save & Update Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE QUESTION CONFIRMATION */}
      {/* ======================================================== */}
      {deleteConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Confirm Question Deletion
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Are you sure you want to delete this question?
            </p>
            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '1.25rem', textAlign: 'left', maxHeight: '90px', overflowY: 'auto' }}>
              "{deleteConfirmation.text}"
            </div>

            {deleteConfirmation.hasAttempts && (
              <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'left' }}>
                <strong>Note:</strong> This question has existing student attempt records. The database will safely prevent deletion to protect historical exam integrity.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleDeleteQuestion(deleteConfirmation.id)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
