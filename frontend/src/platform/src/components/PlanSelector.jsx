import { useState, useEffect } from 'react';
import { getAvailablePlans, createSubscription, verifySubscriptionPayment, startFreeTrial } from '../services/paymentService.js';
import { ENTERPRISE_EMAIL } from '../config.js';
import { useConfirm } from '../../../shared/ui/ConfirmDialog.jsx';

const DURATION_KEYS = ['monthly', '3months', '6months', 'yearly'];
const DURATION_MONTHS = { monthly: 1, '3months': 3, '6months': 6, yearly: 12 };
const DURATION_LABEL = { monthly: 'Monthly', '3months': '3 Months', '6months': '6 Months', yearly: 'Yearly' };
const DURATION_TEXT = { monthly: 'month', '3months': '3 months', '6months': '6 months', yearly: '1 year' };

function PaymentProcessingOverlay({ state, message, onDone }) {
  if (!state) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'ppOverlayIn 0.3s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        maxWidth: 420, width: '90%', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        animation: 'ppCardIn 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {(state === 'verifying' || state === 'creating-site') && (
          <>
            <div style={{
              width: 64, height: 64, margin: '0 auto 24px',
              border: '4px solid #e5e7eb', borderTopColor: '#2563eb',
              borderRadius: '50%', animation: 'ppSpin 0.8s linear infinite',
            }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              {state === 'verifying' ? "Verifying Payment" : "Setting Up Your Store"}
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              {state === 'verifying' ? "Please wait while we confirm your payment..." : "Creating your website and activating your plan..."}
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px',
              background: '#dcfce7', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ppBounce 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Payment Successful!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              {message || "Your plan has been activated. You can now start building your store."}
            </p>
            <button
              onClick={onDone}
              style={{
                width: '100%', padding: '14px 24px',
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
            >
              Go to Dashboard
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{
              width: 72, height: 72, margin: '0 auto 24px',
              background: '#fef2f2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              Something Went Wrong
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
              {message || "Payment verification failed. Please contact support if you were charged."}
            </p>
            <button
              onClick={onDone}
              style={{
                width: '100%', padding: '14px 24px',
                background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0',
                borderRadius: 12, fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Close
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes ppOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ppCardIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ppSpin { to { transform: rotate(360deg); } }
        @keyframes ppBounce { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

export default function PlanSelector({ siteId: initialSiteId, currentPlan, currentStatus, scheduledPlan, scheduledStartAt, onUpgraded, isOverlay, hideTrial, onClose, isFirstTime, onCreateSite }) {
  const confirm = useConfirm();
  const [duration, setDuration] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [plans, setPlans] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enterpriseConfig, setEnterpriseConfig] = useState({ enabled: false, message: '', email: '' });
  const [postPayment, setPostPayment] = useState({ state: null, message: '' });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getAvailablePlans();
      const loadedPlans = data.plans || [];
      setPlans(loadedPlans);
      setRazorpayKeyId(data.razorpayKeyId || null);
      if (data.enterpriseConfig) setEnterpriseConfig(data.enterpriseConfig);
      if (!duration && loadedPlans.length > 0) {
        const cycles = [...new Set(loadedPlans.map(p => p.billing_cycle))];
        const cycleOrder = ['monthly', '3months', '6months', 'yearly'];
        const sorted = cycles.sort((a, b) => cycleOrder.indexOf(a) - cycleOrder.indexOf(b));
        setDuration(sorted[0]);
      }
    } catch (e) {
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const availableDurations = [...new Set(plans.map(p => p.billing_cycle))].sort((a, b) => {
    const order = ['monthly', '3months', '6months', 'yearly'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const plansForDuration = plans.filter(p => p.billing_cycle === duration);

  const groupedPlans = plansForDuration.reduce((acc, plan) => {
    const key = plan.plan_name;
    if (!acc[key]) {
      acc[key] = {
        name: key,
        prices: {},
        features: plan.features || [],
        is_popular: false,
        plans: {},
        display_order: plan.display_order ?? 999,
        plan_tier: plan.plan_tier ?? 1,
        tagline: plan.tagline || '',
      };
    }
    acc[key].prices[plan.billing_cycle] = plan.display_price;
    acc[key].original_prices = acc[key].original_prices || {};
    if (plan.original_price) acc[key].original_prices[plan.billing_cycle] = plan.original_price;
    acc[key].plans[plan.billing_cycle] = plan;
    if (plan.is_popular) acc[key].is_popular = true;
    if (plan.display_order != null && plan.display_order < acc[key].display_order) {
      acc[key].display_order = plan.display_order;
    }
    if (plan.plan_tier != null && plan.plan_tier > acc[key].plan_tier) {
      acc[key].plan_tier = plan.plan_tier;
    }
    return acc;
  }, {});

  const planList = Object.values(groupedPlans).sort((a, b) => a.display_order - b.display_order);

  const isActive = currentStatus === 'active';
  const currentPlanLower = (isActive && currentPlan) ? currentPlan.toLowerCase() : null;
  const currentPlanTier = (() => {
    if (!currentPlanLower || currentPlanLower === 'trial') return 0;
    const match = planList.find(p => p.name.toLowerCase() === currentPlanLower);
    return match ? match.plan_tier : 0;
  })();

  const isExpired = currentStatus === 'expired' || currentStatus === 'none';
  const showTrialCard = !hideTrial && isExpired && currentPlanLower !== 'trial' && currentPlan !== 'trial';

  const handlePostPaymentDone = () => {
    setPostPayment({ state: null, message: '' });
    onUpgraded?.();
  };

  const handleUpgrade = async (planGroup) => {
    const selectedPlan = planGroup.plans[duration];
    if (!selectedPlan) {
      setPostPayment({ state: 'error', message: "This plan is not available for the selected billing cycle." });
      return;
    }

    if (!razorpayKeyId) {
      setPostPayment({ state: 'error', message: "Payment is not configured. Please contact the administrator." });
      return;
    }

    setUpgrading(selectedPlan.id);
    try {
      const siteId = initialSiteId || null;
      const res = await createSubscription(selectedPlan.id, siteId);

      if (!res.subscriptionId) {
        setPostPayment({ state: 'error', message: res.error || "Failed to create subscription. Please try again." });
        return;
      }

      const options = {
        key: razorpayKeyId,
        subscription_id: res.subscriptionId,
        name: 'Flomerce',
        description: `${res.planName} - ${DURATION_LABEL[res.billingCycle] || res.billingCycle}`,
        handler: async function (response) {
          setPostPayment({ state: 'verifying', message: '' });
          try {
            const verifyRes = await verifySubscriptionPayment({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.verified || verifyRes.success) {
              if (!initialSiteId && onCreateSite) {
                setPostPayment({ state: 'creating-site', message: '' });
                try {
                  await onCreateSite();
                } catch (siteErr) {
                  console.error('Site creation after payment failed:', siteErr);
                  setPostPayment({ state: 'success', message: "Your payment was successful and your plan is active! Your website will be created when you return to the dashboard." });
                  return;
                }
              }
              setPostPayment({ state: 'success', message: "Your plan has been activated successfully. You can now start building your store!" });
            } else {
              setPostPayment({ state: 'error', message: "Payment verification failed. If you were charged, please contact support." });
            }
          } catch (verifyErr) {
            if (verifyErr?.message?.includes('already activated') || verifyErr?.message?.includes('will activate shortly')) {
              if (!initialSiteId && onCreateSite) {
                setPostPayment({ state: 'creating-site', message: '' });
                try { await onCreateSite(); } catch (e) { console.error('Site creation after payment failed:', e); }
              }
              setPostPayment({ state: 'success', message: "Your plan has been activated successfully!" });
            } else {
              setPostPayment({ state: 'error', message: "Payment verification failed. If you were charged, please contact support." });
            }
          }
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: function () {
            setUpgrading(null);
          },
        },
      };

      if (typeof window.Razorpay === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (e) {
      setPostPayment({ state: 'error', message: e.message || "Failed to process payment. Please try again." });
    } finally {
      setUpgrading(null);
    }
  };

  const handleStartTrial = async () => {
    setUpgrading('trial');
    try {
      setPostPayment({ state: 'verifying', message: '' });
      const data = await startFreeTrial();
      if (data.success || data.message) {
        if (onCreateSite) {
          setPostPayment({ state: 'creating-site', message: '' });
          await onCreateSite();
        }
        setPostPayment({ state: 'success', message: "Your 7-day free trial has started! Enjoy full access to all features." });
      } else {
        setPostPayment({ state: 'error', message: data.error || "Failed to start trial. Please try again." });
      }
    } catch (e) {
      setPostPayment({ state: 'error', message: e.message || "Failed to start trial. Please try again." });
    } finally {
      setUpgrading(null);
    }
  };

  const getButtonText = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return "Current Plan";
    if (!isActive || planGroup.plan_tier > currentPlanTier) return planGroup.plan_tier > currentPlanTier && isActive ? "Upgrade" : "Subscribe";
    if (planGroup.plan_tier < currentPlanTier) return "Downgrade";
    return "Subscribe";
  };

  const isButtonDisabled = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return true;
    return false;
  };

  const isDowngrade = (planGroup) => {
    return isActive && planGroup.plan_tier < currentPlanTier;
  };

  // Any paid → paid plan change (upgrade OR downgrade) is now scheduled to take
  // effect at the end of the current billing period to avoid double-billing the
  // user. Trial → paid is NOT scheduled (trial is free, no money to lose).
  const isScheduledPlanChange = (planGroup) => {
    if (!isActive) return false;
    if (currentPlanLower === 'trial') return false;
    if (planGroup.name.toLowerCase() === currentPlanLower) return false;
    return true;
  };

  const hasContent = planList.filter(p => p.plan_tier < 4).length > 0 || enterpriseConfig.enabled;

  if (loading || error || (!hasContent && planList.length === 0)) {
    const inner = loading
      ? <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          Loading plans...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      : error
        ? <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#dc2626' }}>{error}</div>
        : <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#64748b' }}>No plans available at the moment.</div>;

    if (isOverlay) {
      return (
        <div className="modal-overlay">
          <div className="modal-content plan-overlay-modal" style={{ maxWidth: '900px', position: 'relative' }}>
            {onClose && (
              <button onClick={onClose} className="plan-overlay-close">×</button>
            )}
            {inner}
          </div>
        </div>
      );
    }
    return inner;
  }

  const content = (
    <div>
      {isOverlay && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {hideTrial ? "Choose a Plan for Your Website" : isFirstTime ? "Choose a Plan to Get Started" : isExpired ? "Your Plan Has Expired" : "Start Your Free Trial"}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {hideTrial
              ? "Subscribe to a plan to create and activate your website."
              : isFirstTime
                ? "Start with a free trial or subscribe to a plan to create and manage your websites."
                : isExpired
                  ? "Your subscription has expired and all your websites are disabled. Subscribe to a plan for each site to restore access."
                  : "Start a 7-day free trial to create up to 5 websites. No credit card required."}
          </p>
        </div>
      )}

      {scheduledPlan && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: '#fef3c7', border: '1px solid #fcd34d',
          borderRadius: 12, padding: '14px 16px', marginBottom: '1.5rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div style={{ fontSize: '0.875rem', color: '#78350f', lineHeight: 1.5 }}>
            <strong style={{ fontWeight: 700 }}>Scheduled plan change:</strong>{' '}
            {scheduledStartAt ? (
              <>
                Your subscription will switch to <strong>{scheduledPlan}</strong> on{' '}
                <strong>{new Date(scheduledStartAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                . Your current plan stays active until then. To cancel this change, please contact support.
              </>
            ) : (
              <>
                Your subscription will switch to <strong>{scheduledPlan}</strong> at the end of your current billing period. Your current plan stays active until then. To cancel this change, please contact support.
              </>
            )}
          </div>
        </div>
      )}

      {availableDurations.length > 1 && (
        <div className="duration-selector">
          {availableDurations.map(key => (
            <button
              key={key}
              className={`dur-btn${duration === key ? ' active' : ''}`}
              onClick={() => setDuration(key)}
            >
              {DURATION_LABEL[key] || key}
            </button>
          ))}
        </div>
      )}

      <div className="plans-grid">
        {showTrialCard && (
          <div className="site-card plan-card" style={{ position: 'relative', borderColor: '#10b981', borderWidth: '2px' }}>
            <span style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              background: '#10b981', color: 'white', padding: '2px 12px', borderRadius: '12px',
              fontSize: '0.75rem', fontWeight: 700
            }}>FREE TRIAL</span>
            <h3 style={{ marginBottom: '0.5rem' }}>7-Day Free Trial</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              ₹0
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}> for 7 days</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'start', fontSize: '0.875rem', color: '#64748b' }}>
              <li style={{ marginBottom: '0.5rem' }}>✓ Create up to 5 websites</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Full access for 7 days</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ No credit card required</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Upgrade anytime during trial</li>
            </ul>
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
              disabled={upgrading !== null}
              onClick={handleStartTrial}
            >
              {upgrading === 'trial' ? "Starting..." : "Start Free Trial"}
            </button>
          </div>
        )}

        {planList.filter(p => p.plan_tier < 4).map(planGroup => {
          const price = planGroup.prices[duration];
          const originalPrice = planGroup.original_prices?.[duration];
          const savingsPercent = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

          return (
            <div key={planGroup.name} className="site-card plan-card" style={{ position: 'relative', ...(planGroup.is_popular ? { borderColor: 'var(--accent)' } : {}) }}>
              {planGroup.is_popular && <span className="popular-badge">POPULAR</span>}
              <h3 style={{ marginBottom: planGroup.tagline ? '0.25rem' : '0.5rem' }}>{planGroup.name}</h3>
              {planGroup.tagline && (
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem', fontWeight: 500 }}>{planGroup.tagline}</p>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                {originalPrice ? (
                  <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0 0 0.15rem', fontWeight: 500 }}>
                    <span style={{ textDecoration: 'line-through' }}>₹{originalPrice}</span>
                  </p>
                ) : null}
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                  ₹{price}
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {DURATION_TEXT[duration] || duration}</span>
                  {savingsPercent > 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', marginInlineStart: '0.5rem', fontWeight: 700 }}>
                      {`${savingsPercent}% OFF`}
                    </span>
                  )}
                </p>
                {DURATION_MONTHS[duration] > 1 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontWeight: 500 }}>
                    ({`₹${Math.round(price / DURATION_MONTHS[duration])}/month`})
                  </p>
                )}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'start', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {planGroup.features.map((f, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>✓ {f}</li>
                ))}
              </ul>
              <button
                className={`btn ${isButtonDisabled(planGroup) ? 'btn-outline' : isDowngrade(planGroup) ? 'btn-outline' : 'btn-primary'}`}
                style={{ width: '100%', opacity: isButtonDisabled(planGroup) ? 0.6 : 1 }}
                disabled={isButtonDisabled(planGroup) || upgrading !== null}
                onClick={async () => {
                  if (isScheduledPlanChange(planGroup)) {
                    const actionLabel = isDowngrade(planGroup) ? "downgrade" : "switch";
                    const ok = await confirm({
                      title: `Schedule ${actionLabel}?`,
                      message: `Schedule a ${actionLabel} to ${planGroup.name}? Your current plan keeps running until the end of your billing period, then ${planGroup.name} starts automatically. You won't be charged twice.`,
                      confirmText: `Schedule ${actionLabel}`,
                    });
                    if (ok) handleUpgrade(planGroup);
                  } else {
                    handleUpgrade(planGroup);
                  }
                }}
              >
                {upgrading === planGroup.plans[duration]?.id ? "Processing..." : getButtonText(planGroup)}
              </button>
              {isScheduledPlanChange(planGroup) && !scheduledPlan && (
                <p style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '0.5rem', textAlign: 'center' }}>
                  Takes effect at the end of your current billing period. Your current plan keeps running until then.
                </p>
              )}
            </div>
          );
        })}

        {enterpriseConfig.enabled && (
          <div className="site-card plan-card" style={{ position: 'relative', borderColor: '#6366f1', borderWidth: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              background: '#6366f1', color: 'white', padding: '2px 12px', borderRadius: '12px',
              fontSize: '0.75rem', fontWeight: 700
            }}>ENTERPRISE</span>
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>Enterprise</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
                Custom
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {enterpriseConfig.message || "Need a custom solution for your business? Get in touch with our team for a tailored enterprise plan."}
              </p>
            </div>
            <a
              href={`mailto:${enterpriseConfig.email || ENTERPRISE_EMAIL}`}
              className="btn btn-primary"
              style={{ width: '100%', textAlign: 'center', textDecoration: 'none', background: '#6366f1', borderColor: '#6366f1' }}
            >
              Contact Us
            </a>
          </div>
        )}
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <>
        <div className="modal-overlay">
          <div className="modal-content plan-overlay-modal" style={{ maxWidth: '900px', position: 'relative' }}>
            {onClose && (
              <button
                onClick={onClose}
                className="plan-overlay-close"
              >
                ×
              </button>
            )}
            {content}
          </div>
        </div>
        <PaymentProcessingOverlay state={postPayment.state} message={postPayment.message} onDone={handlePostPaymentDone} />
      </>
    );
  }

  return (
    <>
      {content}
      <PaymentProcessingOverlay state={postPayment.state} message={postPayment.message} onDone={handlePostPaymentDone} />
    </>
  );
}
