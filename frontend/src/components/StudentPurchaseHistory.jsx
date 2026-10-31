import React, { useState, useEffect } from 'react';
import { getMyPurchases } from '../api/client.js';

const SUBJECT_ICONS = {
  'Political Science': '🏛️',
  'Philosophy': '💭',
  'Psychology': '🧠',
  'History': '📜',
  'Economics': '📈',
  'Geography': '🌍',
  'Disaster Management': '🛡️',
};

export default function StudentPurchaseHistory({ onExploreSubject }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPurchases();
      setPurchases(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load purchase history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
              My Purchases &amp; Active Subscriptions
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Your unlocked subject test series packages and payment receipts
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={loadPurchases} style={{ fontSize: '0.85rem' }}>
            Refresh Receipts
          </button>
        </div>
      </div>

      {error && (
        <div className="status-pill status-error" style={{ display: 'block', padding: '0.85rem', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading your test series entitlements...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛒</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            No Purchases Yet
          </h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
            You haven't purchased any premium subject test series yet. Explore the 7 CUET PG disciplines to unlock complete sectional, full-length, and PYQ tests.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onExploreSubject && onExploreSubject(null)}
            style={{ fontWeight: 700 }}
          >
            Explore Subjects &rarr;
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {purchases.map((p) => {
            const icon = SUBJECT_ICONS[p.subject_name] || '📚';
            const isPaid = p.order_status === 'paid';
            const dateStr = p.purchased_at ? new Date(p.purchased_at).toLocaleDateString() : '—';

            return (
              <div
                key={p.order_id || p.order_table_id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  borderLeft: '5px solid #16a34a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>{icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        {p.subject_name} Test Series
                      </h3>
                      <span className="status-pill status-success" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                        ACTIVE ACCESS
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Purchased on {dateStr} &bull; Order ID: <code>{p.order_id}</code> &bull; Amount: <strong>₹{p.amount_inr}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>UNLOCKED CONTENT</div>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                      Sectional, Full-Length &amp; PYQs
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
                    onClick={() => onExploreSubject && onExploreSubject(p.subject_id)}
                  >
                    Open Tests &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
