import React, { useState, useEffect } from 'react';
import {
  getSubjectPackages,
  updateAdminSubjectPackage,
  getAdminFreeTests,
  setAdminFreeTest,
  getAdminPaymentAnalytics,
} from '../api/client.js';

export default function AdminPricingManager() {
  const [packages, setPackages] = useState([]);
  const [freeTestsConfig, setFreeTestsConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Editing state for package price
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editPriceInr, setEditPriceInr] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);

  // Selected free tests
  const [selectedSectionalId, setSelectedSectionalId] = useState('');
  const [selectedPyqId, setSelectedPyqId] = useState('');
  const [savingFreeTests, setSavingFreeTests] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pkgs, freeData, analyticsData] = await Promise.all([
        getSubjectPackages(),
        getAdminFreeTests(),
        getAdminPaymentAnalytics(),
      ]);

      setPackages(pkgs || []);
      setFreeTestsConfig(freeData || null);
      setAnalytics(analyticsData || null);

      if (freeData?.current) {
        const sec = freeData.current.find((c) => c.test_type === 'sectional');
        const pyq = freeData.current.find((c) => c.test_type === 'pyq');
        if (sec?.test_id) setSelectedSectionalId(sec.test_id);
        if (pyq?.test_id) setSelectedPyqId(pyq.test_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pricing and analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditPrice = (pkg) => {
    setEditingSubjectId(pkg.subject_id);
    setEditPriceInr(String(pkg.price_inr || Math.round(pkg.price_paise / 100)));
  };

  const handleSavePrice = async (subjectId) => {
    const inr = parseInt(editPriceInr, 10);
    if (isNaN(inr) || inr < 0) {
      setError('Please enter a valid price in INR.');
      return;
    }

    setSavingPackage(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await updateAdminSubjectPackage(subjectId, { priceInr: inr });
      setSuccessMsg(`Subject price successfully updated to ₹${inr}.`);
      setEditingSubjectId(null);
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to update package price.');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleSaveFreeTests = async () => {
    setSavingFreeTests(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (selectedSectionalId) {
        await setAdminFreeTest('sectional', selectedSectionalId);
      }
      if (selectedPyqId) {
        await setAdminFreeTest('pyq', selectedPyqId);
      }
      setSuccessMsg('Global free test designations updated successfully.');
      await loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to update free test designations.');
    } finally {
      setSavingFreeTests(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading pricing models &amp; free test configuration...</p>
      </div>
    );
  }

  const sectionalCandidates = (freeTestsConfig?.candidates || []).filter((c) => c.test_type === 'sectional');
  const pyqCandidates = (freeTestsConfig?.candidates || []).filter((c) => c.test_type === 'pyq');

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      {/* Notifications */}
      {successMsg && (
        <div className="status-pill status-success" style={{ display: 'block', padding: '0.85rem 1.25rem' }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="status-pill status-error" style={{ display: 'block', padding: '0.85rem 1.25rem' }}>
          {error}
        </div>
      )}

      {/* SECTION 1: Revenue & Order Analytics */}
      {analytics && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h3 className="card-title">Payment &amp; Revenue Overview</h3>
            <p className="card-subtitle">Real-time financial analytics from Razorpay test orders</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>TOTAL REVENUE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', margin: '0.2rem 0' }}>
                ₹{analytics.totalRevenueInr.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{analytics.totalRevenuePaise} paise</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PAID ORDERS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary)', margin: '0.2rem 0' }}>
                {analytics.totalPaidOrders}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>of {analytics.totalOrdersCreated} initiated</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PAYING STUDENTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary)', margin: '0.2rem 0' }}>
                {analytics.totalPayingStudents}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Unique enrolled students</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Subject Packages & Pricing */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Subject-Wise Test Series Pricing</h3>
            <p className="card-subtitle">Manage prices for all 7 CUET PG subject packages (Stored in paise)</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={loadAllData} style={{ fontSize: '0.85rem' }}>
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Paper Code</th>
                <th>Content Scope</th>
                <th>Price (INR)</th>
                <th>Price (Paise)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const isEditing = editingSubjectId === pkg.subject_id;
                return (
                  <tr key={pkg.id || pkg.subject_id}>
                    <td><strong>{pkg.subject_name}</strong></td>
                    <td>
                      <span className="status-pill status-secondary" style={{ fontSize: '0.75rem' }}>
                        {pkg.subject_paper_code || pkg.subject_code || 'CUET PG'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {pkg.sectional_test_count || 0} Sectional &bull; {pkg.full_length_test_count || 0} Full &bull; {pkg.pyq_test_count || 0} PYQ
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span>₹</span>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                            value={editPriceInr}
                            onChange={(e) => setEditPriceInr(e.target.value)}
                            min="0"
                          />
                        </div>
                      ) : (
                        <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                          ₹{pkg.price_inr}
                        </strong>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {pkg.price_paise} paise
                    </td>
                    <td>
                      <span className="status-pill status-success" style={{ fontSize: '0.7rem' }}>
                        ACTIVE
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', backgroundColor: '#16a34a' }}
                            disabled={savingPackage}
                            onClick={() => handleSavePrice(pkg.subject_id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setEditingSubjectId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleStartEditPrice(pkg)}
                        >
                          Edit Price
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Two Global Free Tests Configuration */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Two Platform-Wide Designated Free Tests</h3>
          <p className="card-subtitle">
            Rule 2 Compliance: Exactly one Sectional Test and one PYQ Test are globally accessible for free across PrimePrep.
            No Full-Length Mock is free by default.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Sectional Free Test Selector */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📑</span>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                Designated Free Sectional Test
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              The single sectional test open to all registered students without requiring subject purchase.
            </p>
            <select
              className="form-control"
              value={selectedSectionalId}
              onChange={(e) => setSelectedSectionalId(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">-- Select Sectional Test --</option>
              {sectionalCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject_name} &bull; {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* PYQ Free Test Selector */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📖</span>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                Designated Free PYQ Test
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              The single Previous Year Question test open to all registered students.
            </p>
            <select
              className="form-control"
              value={selectedPyqId}
              onChange={(e) => setSelectedPyqId(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">-- Select PYQ Test --</option>
              {pyqCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject_name} &bull; {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={savingFreeTests}
            onClick={handleSaveFreeTests}
            style={{ fontWeight: 700 }}
          >
            {savingFreeTests ? 'Saving Configuration...' : 'Save Free Test Designations'}
          </button>
        </div>
      </div>
    </div>
  );
}
