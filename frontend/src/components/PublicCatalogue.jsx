import React, { useState, useEffect } from 'react';
import { getPublicSubjects, getPublicChapters, getPublicTests } from '../api/client.js';

export default function PublicCatalogue({
  initialSubjectId = '',
  initialCategory = 'ALL',
  initialAccessType = 'ALL',
  onSelectTest,
  onNavigateHome,
}) {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);

  // Filter & Search states
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedAccessType, setSelectedAccessType] = useState(initialAccessType);
  const [searchQuery, setSearchQuery] = useState('');

  // Test results & pagination
  const [tests, setTests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial subjects
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await getPublicSubjects();
      setSubjects(data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  // Load chapters when selectedSubjectId changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setChapters([]);
      setSelectedChapterId('');
      return;
    }
    loadChapters(selectedSubjectId);
  }, [selectedSubjectId]);

  const loadChapters = async (subId) => {
    try {
      const data = await getPublicChapters(subId);
      setChapters(data || []);
      setSelectedChapterId('');
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setChapters([]);
    }
  };

  // Fetch tests whenever filters change or page changes
  useEffect(() => {
    loadTests(1);
  }, [selectedSubjectId, selectedChapterId, selectedCategory, selectedAccessType, searchQuery]);

  const loadTests = async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicTests({
        subjectId: selectedSubjectId || undefined,
        chapterId: selectedChapterId || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        accessType: selectedAccessType !== 'ALL' ? selectedAccessType : undefined,
        search: searchQuery.trim() || undefined,
        page: targetPage,
        limit: 12,
      });
      setTests(res.tests || []);
      setPagination(res.pagination || { page: targetPage, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load tests.');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedSubjectId('');
    setSelectedChapterId('');
    setSelectedCategory('ALL');
    setSelectedAccessType('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = Boolean(
    selectedSubjectId || selectedChapterId || (selectedCategory && selectedCategory !== 'ALL') || (selectedAccessType && selectedAccessType !== 'ALL') || searchQuery
  );

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--color-text-muted)' }}>
        <button
          type="button"
          onClick={onNavigateHome}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          Home
        </button>
        <span>&rsaquo;</span>
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>CUET PG Test Series Catalogue</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
          Explore CUET PG Test Series
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Browse published mock tests, chapter-wise sectionals, and previous-year papers across all 7 CUET PG disciplines.
        </p>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* 1. Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>Search Test, Subject or Chapter</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Political Thought, Sectional 1..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 2. Subject Filter */}
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

          {/* 3. Chapter Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>
              Chapter {selectedSubjectId ? `(${chapters.length})` : ''}
            </label>
            <select
              className="form-input"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              disabled={!selectedSubjectId || chapters.length === 0}
            >
              <option value="">All Chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_order ? `${c.display_order}. ` : ''}{c.name || c.title}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Category Filter */}
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

          {/* 5. Access Type Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.775rem' }}>Access Tier</label>
            <select
              className="form-input"
              value={selectedAccessType}
              onChange={(e) => setSelectedAccessType(e.target.value)}
            >
              <option value="ALL">Free & Paid</option>
              <option value="free">Free Tests Only</option>
              <option value="paid">Premium / Paid</option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Active Filters:</span>
            {selectedSubjectId && (
              <span className="status-pill status-primary" style={{ fontSize: '0.725rem' }}>
                Subject: {subjects.find((s) => s.id === selectedSubjectId)?.name || 'Selected'}
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId('')}
                  style={{ background: 'none', border: 'none', marginLeft: '0.35rem', cursor: 'pointer', color: 'inherit' }}
                >
                  ✕
                </button>
              </span>
            )}
            {selectedChapterId && (
              <span className="status-pill status-secondary" style={{ fontSize: '0.725rem' }}>
                Chapter: {chapters.find((c) => c.id === selectedChapterId)?.name || 'Selected'}
                <button
                  type="button"
                  onClick={() => setSelectedChapterId('')}
                  style={{ background: 'none', border: 'none', marginLeft: '0.35rem', cursor: 'pointer', color: 'inherit' }}
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCategory && selectedCategory !== 'ALL' && (
              <span className="status-pill status-secondary" style={{ fontSize: '0.725rem', textTransform: 'capitalize' }}>
                {selectedCategory.replace('_', ' ')}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  style={{ background: 'none', border: 'none', marginLeft: '0.35rem', cursor: 'pointer', color: 'inherit' }}
                >
                  ✕
                </button>
              </span>
            )}
            {selectedAccessType && selectedAccessType !== 'ALL' && (
              <span className="status-pill status-secondary" style={{ fontSize: '0.725rem', textTransform: 'capitalize' }}>
                Tier: {selectedAccessType}
                <button
                  type="button"
                  onClick={() => setSelectedAccessType('ALL')}
                  style={{ background: 'none', border: 'none', marginLeft: '0.35rem', cursor: 'pointer', color: 'inherit' }}
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="status-pill status-secondary" style={{ fontSize: '0.725rem' }}>
                Search: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', marginLeft: '0.35rem', cursor: 'pointer', color: 'inherit' }}
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* RESULTS COUNT & STATUS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Showing <strong>{tests.length}</strong> of <strong>{pagination.total}</strong> published tests
        </div>
      </div>

      {/* TESTS GRID */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading tests from PostgreSQL database...</p>
        </div>
      ) : error ? (
        <div className="card">
          <div className="status-pill status-error" style={{ display: 'block', padding: '1rem' }}>
            {error}
          </div>
        </div>
      ) : tests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Matching Tests Found
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
            No published tests matched your current filter criteria. Try choosing a different subject, clearing the search keyword, or resetting filters.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
          {tests.map((t) => {
            const isFree = t.access_type === 'free';
            const qCount = parseInt(t.question_count, 10) || 0;

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: isFree ? '3px solid #16a34a' : '3px solid #7c3aed',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Subject, Chapter & Tier Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="status-pill status-primary" style={{ fontSize: '0.675rem', textTransform: 'uppercase' }}>
                        {t.subject_name}
                      </span>
                      <span className="status-pill status-secondary" style={{ fontSize: '0.675rem', textTransform: 'capitalize' }}>
                        {t.test_type?.replace('_', ' ')} #{t.test_number || 1}
                      </span>
                    </div>

                    <span
                      className={`status-pill ${isFree ? 'status-success' : 'status-warning'}`}
                      style={{ fontSize: '0.675rem', fontWeight: 700, textTransform: 'uppercase' }}
                    >
                      {isFree ? 'FREE TEST' : 'PREMIUM'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                    {t.title}
                  </h3>

                  {/* Chapter */}
                  {t.chapter_name && (
                    <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
                      📖 {t.chapter_name}
                    </div>
                  )}

                  {/* Description */}
                  <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', lineHeight: 1.45, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description || 'Comprehensive CUET PG practice test based on official NTA curriculum.'}
                  </p>
                </div>

                {/* Test Specifications Summary */}
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      backgroundColor: '#f8fafc',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      marginBottom: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Questions</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>{qCount} Qs</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Duration</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>{t.duration_minutes}m</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Marking</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a' }}>+{t.positive_marks}/-{t.negative_marks}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, padding: '0.5rem' }}
                      onClick={() => onSelectTest(t.id)}
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            disabled={pagination.page <= 1}
            onClick={() => loadTests(pagination.page - 1)}
          >
            &larr; Previous
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </span>

          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadTests(pagination.page + 1)}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
