import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSubjectPackage, createPaymentOrder, verifyPaymentOrder } from '../api/client.js';

const SUBJECT_ICONS = {
  'Political Science': '🏛️',
  'Philosophy': '💭',
  'Psychology': '🧠',
  'History': '📜',
  'Economics': '📈',
  'Geography': '🌍',
  'Disaster Management': '🛡️',
};

export default function SubjectPurchasePage({
  subjectId,
  returnTestId = null,
  onBack,
  onNavigateToTest,
  onRequireAuth,
}) {
  const { user, isAuthenticated } = useAuth();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checkout states
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadPackageDetails();
  }, [subjectId]);

  const loadPackageDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubjectPackage(subjectId);
      setPkg(data);
    } catch (err) {
      setError(err.message || 'Failed to load subject package information.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePurchase = async () => {
    if (!isAuthenticated) {
      onRequireAuth(returnTestId || subjectId);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderData = await createPaymentOrder(subjectId);
      setActiveOrder(orderData);

      // Attempt to load Razorpay official checkout SDK
      if (window.Razorpay && !orderData.isTestMode) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency || 'INR',
          name: 'PrimePrep',
          description: orderData.packageName,
          order_id: orderData.orderId,
          prefill: {
            name: user?.fullName || '',
            email: user?.email || '',
          },
          theme: {
            color: '#1e3a8a',
          },
          handler: async (response) => {
            await handlePaymentVerification({
              orderId: orderData.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test Mode / Sandbox Simulation Modal
        setCheckoutModalOpen(true);
      }
    } catch (err) {
      if (err.code === 'ALREADY_PURCHASED') {
        setPkg((prev) => (prev ? { ...prev, is_purchased: true } : prev));
      } else {
        setError(err.message || 'Could not initiate test series order. Please try again.');
      }
      setIsProcessing(false);
    }
  };

  const handlePaymentVerification = async (payload) => {
    setIsProcessing(true);
    setError(null);
    try {
      await verifyPaymentOrder(payload);
      setPaymentSuccess(true);
      setCheckoutModalOpen(false);
      setPkg((prev) => (prev ? { ...prev, is_purchased: true } : prev));

      // After 2 seconds, redirect to test or subject tests
      setTimeout(() => {
        if (returnTestId) {
          onNavigateToTest(returnTestId);
        } else {
          onBack();
        }
      }, 1800);
    } catch (err) {
      setError(err.message || 'Payment verification failed. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
          Loading {pkg?.subject_name || 'Subject'} Test Series details...
        </p>
      </div>
    );
  }

  if (error && !pkg) {
    return (
      <div className="card" style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem' }}>
        <div className="status-pill status-error" style={{ display: 'block', padding: '1rem', marginBottom: '1.25rem' }}>
          <strong>Error:</strong> {error}
        </div>
        <button type="button" className="btn btn-outline" onClick={onBack}>
          &larr; Back to Subjects
        </button>
      </div>
    );
  }

  const subjectName = pkg?.subject_name || 'Subject';
  const icon = SUBJECT_ICONS[subjectName] || '📚';
  const priceInr = pkg?.price_inr || 499;
  const isPurchased = Boolean(pkg?.is_purchased);
  const features = Array.isArray(pkg?.features)
    ? pkg.features
    : [
        'All Sectional Tests with in-depth topic coverage',
        'All Full-Length Mock Tests mirroring CUET PG exam timing',
        'All Previous Year Question (PYQ) Tests with official keys',
        'Instant All-India Percentile & Subject Rank analysis',
        'Comprehensive Answer Keys & Detailed Explanations',
      ];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          &larr; Subjects
        </button>
        <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{subjectName}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>&gt;</span>
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Premium Test Series</span>
      </div>

      {/* Success Banner */}
      {paymentSuccess && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '2px solid #10b981',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: '#065f46',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            Payment Verified & Series Unlocked!
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            You now have unlimited access to all Sectional, Full-Length, and PYQ tests for <strong>{subjectName}</strong>.
            Redirecting you to the exam workspace...
          </p>
        </div>
      )}

      {/* Main Pricing & Series Card */}
      <div
        className="card"
        style={{
          borderTop: '5px solid var(--color-primary)',
          padding: '2.25rem 2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2.2rem' }}>{icon}</span>
              <div>
                <span className="status-pill status-primary" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {pkg?.subject_paper_code || pkg?.subject_code || 'CUET PG'}
                </span>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--color-primary)', margin: '0.2rem 0 0 0' }}>
                  {subjectName} Test Series
                </h1>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '580px' }}>
              Unlock the entire {subjectName} examination series once. Gain unrestricted access to every Sectional Test, Full-Length Mock Test, and Previous Year Exam Paper.
            </p>
          </div>

          {/* Pricing Box */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem 1.75rem',
              textAlign: 'center',
              minWidth: '200px',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              COMPLETE ACCESS
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1.1, margin: '0.35rem 0' }}>
              ₹{priceInr}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
              One-Time Purchase &bull; No Monthly Fees
            </div>
          </div>
        </div>

        {error && (
          <div className="status-pill status-error" style={{ display: 'block', padding: '0.85rem 1rem', marginBottom: '1.5rem' }}>
            <strong>Notice:</strong> {error}
          </div>
        )}

        {/* Content Scope Breakdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            backgroundColor: '#f1f5f9',
            padding: '1.25rem',
            borderRadius: '10px',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>SECTIONAL TESTS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {pkg?.sectional_test_count || 10}+
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Deep Unit Mastery</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>FULL-LENGTH MOCKS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {pkg?.full_length_test_count || 5}+
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Real CBT Simulation</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PYQ PAPERS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {pkg?.pyq_test_count || 5}+
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Official CUET Trends</div>
          </div>
        </div>

        {/* Features Checklist */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.85rem' }}>
            What Is Included in this Test Series:
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {features.map((feat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button Area */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              🔒 256-Bit SSL Encrypted &bull; Razorpay Secure Payment &bull; Instant Access
            </div>
          </div>

          <div>
            {isPurchased ? (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span className="status-pill status-success" style={{ fontWeight: 700, padding: '0.5rem 1rem' }}>
                  ✓ SERIES UNLOCKED
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onBack}
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
                >
                  Start Practicing &rarr;
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={handleInitiatePurchase}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  backgroundColor: '#16a34a',
                  borderColor: '#15803d',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                {isProcessing
                  ? 'Initiating Secure Checkout...'
                  : isAuthenticated
                  ? `Unlock ${subjectName} Test Series (₹${priceInr}) \u2192`
                  : `Sign In to Unlock Series (₹${priceInr}) \u2192`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Sandbox Simulation Modal */}
      {checkoutModalOpen && activeOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>💳</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  Razorpay Checkout
                </h3>
              </div>
              <span className="status-pill status-primary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                TEST MODE
              </span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Package:</span>
                <strong>{activeOrder.packageName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Order ID:</span>
                <code>{activeOrder.orderId}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                <span>Amount:</span>
                <span style={{ color: 'var(--color-primary)' }}>₹{activeOrder.amountInr}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Razorpay sandbox test mode is active. Click <strong>"Confirm Test Payment"</strong> to simulate instant bank authorization and verify entitlement access.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isProcessing}
                onClick={() => {
                  setCheckoutModalOpen(false);
                  setIsProcessing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={() =>
                  handlePaymentVerification({
                    orderId: activeOrder.orderId,
                    razorpayPaymentId: `pay_test_${Date.now()}`,
                    razorpaySignature: 'simulated_test_signature',
                  })
                }
                style={{ backgroundColor: '#16a34a', borderColor: '#15803d', fontWeight: 700 }}
              >
                {isProcessing ? 'Verifying...' : `Confirm Test Payment (₹${activeOrder.amountInr})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
