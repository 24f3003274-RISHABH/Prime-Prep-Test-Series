import React, { useState, useEffect } from 'react';
import { getStudentProfile, updateStudentProfile, getStudentSubjects } from '../api/client.js';

export default function StudentProfile({ onNavigateToSubject, onNavigateToResults }) {
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [targetSubjectCode, setTargetSubjectCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, subjectsData] = await Promise.all([
        getStudentProfile(),
        getStudentSubjects(),
      ]);

      setProfile(profileData);
      setSubjects(subjectsData || []);
      setFullName(profileData.fullName || '');
      setTargetSubjectCode(profileData.targetSubjectCode || '');
      setPhone(profileData.phone || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await updateStudentProfile({
        fullName,
        targetSubjectCode,
        phone,
      });
      setSuccessMsg('Profile updated successfully!');
      setProfile((prev) => ({
        ...prev,
        fullName: updated.full_name || fullName,
        targetSubjectCode: updated.target_subject_code || targetSubjectCode,
        phone: updated.phone || phone,
      }));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading student profile from PostgreSQL...</p>
      </div>
    );
  }

  const selectedSubjectObj = subjects.find(
    (s) => s.paper_code === targetSubjectCode || s.code === targetSubjectCode
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '2rem',
          marginBottom: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 14px 0 rgba(37,99,235,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              color: '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {profile?.fullName || 'Student Candidate'}
              </h2>
              <span
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {profile?.role || 'STUDENT'}
              </span>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              {profile?.email} &bull; Member since{' '}
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Preparation Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
            TESTS ATTEMPTED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            {profile?.stats?.totalAttempts || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {profile?.stats?.completedAttempts || 0} Completed &bull; {profile?.stats?.inProgressAttempts || 0} Active
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
            AVERAGE SCORE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>
            {profile?.stats?.averageScore || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Highest: <strong>{profile?.stats?.highestScore || 0}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
            ACCURACY RATE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
            {profile?.stats?.overallAccuracy || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {profile?.stats?.totalCorrect || 0} / {profile?.stats?.totalAttempted || 0} Correct
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
            TARGET DISCIPLINE
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.35rem' }}>
            {selectedSubjectObj?.name || targetSubjectCode || 'Not Selected'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {selectedSubjectObj?.paper_code || 'CUET PG'}
          </div>
        </div>
      </div>

      {/* Main Profile Edit Card */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1.25rem' }}>
          <h3 className="card-title">Profile & Preferences</h3>
          <p className="card-subtitle">Manage your candidate identity and CUET PG examination discipline</p>
        </div>

        {error && (
          <div className="status-pill status-error" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="status-pill status-success" style={{ display: 'block', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                value={profile?.email || ''}
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: 'var(--color-text-muted)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Registered email cannot be modified.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Target CUET PG Subject
              </label>
              <select
                className="input-field"
                value={targetSubjectCode}
                onChange={(e) => setTargetSubjectCode(e.target.value)}
              >
                <option value="">-- Select Your Target Subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.paper_code || s.code}>
                    {s.name} ({s.paper_code || s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedSubjectObj && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigateToSubject && onNavigateToSubject(selectedSubjectObj)}
                >
                  🎯 Practice {selectedSubjectObj.name} Tests
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={onNavigateToResults}
              >
                📊 My Results & Solutions
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '130px' }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
