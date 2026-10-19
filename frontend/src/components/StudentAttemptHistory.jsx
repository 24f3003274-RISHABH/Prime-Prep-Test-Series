import React, { useState, useEffect } from 'react';
import { getStudentAttemptsList } from '../api/client.js';

export default function StudentAttemptHistory({ onSelectAttempt, onBackToCatalogue }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentAttemptsList();
      setAttempts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load attempt history.');
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (totalSecs) => {
    if (!totalSecs) return '—';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading previous attempts history from PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="card-title">My Test Attempts History</h3>
            <p className="card-subtitle">Review scores, accuracy, and detailed solutions for completed exams</p>
          </div>
          <button className="btn btn-outline" onClick={onBackToCatalogue}>
            &larr; Back to Catalogue
          </button>
        </div>

        {error && (
          <div className="status-pill status-error" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {attempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No test attempts found on your account yet.</p>
            <button className="btn btn-primary" onClick={onBackToCatalogue}>
              Explore CUET PG Subjects & Take a Test &rarr;
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Subject & Chapter</th>
                  <th>Category</th>
                  <th>Attempt Date</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Time Taken</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td>
                      <strong>{att.testTitle}</strong>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div><strong>{att.subjectName}</strong></div>
                        <div style={{ color: 'var(--color-text-muted)' }}>{att.chapterName || 'Comprehensive'}</div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill status-secondary" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        {att.testType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(att.startedAt).toLocaleDateString()} {new Date(att.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {att.status === 'in_progress' ? (
                        <span className="status-pill status-warning" style={{ fontSize: '0.75rem' }}>IN PROGRESS</span>
                      ) : (
                        <div style={{ fontWeight: 700, color: att.score >= 0 ? '#16a34a' : '#dc2626' }}>
                          {att.score} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>/ {att.maxPossibleMarks}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {att.status === 'in_progress' ? '—' : `${att.accuracyPercentage}%`}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {formatSeconds(att.timeTakenSeconds)}
                    </td>
                    <td>
                      {att.status === 'in_progress' ? (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => onSelectAttempt(att.id, true, att.testId)}
                        >
                          Resume Test
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => onSelectAttempt(att.id, false, att.testId)}
                        >
                          View Solutions
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
