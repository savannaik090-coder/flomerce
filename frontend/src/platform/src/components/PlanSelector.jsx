import { useState, useEffect } from 'react';
import { getAvailablePlans, createSubscription, verifySubscriptionPayment, startFreeTrial } from '../services/paymentService.js';

const DURATION_LABELS = { '3months': '3 Months', '6months': '6 Months', yearly: 'Yearly', '3years': '3 Years' };
const PERIOD_SUFFIX = { '3months': '/3mo', '6months': '/6mo', yearly: '/yr', '3years': '/3yr' };

export default function PlanSelector({ siteId: initialSiteId, currentPlan, currentStatus, onUpgraded, isOverlay, hideTrial, onClose, isFirstTime, onCreateSite }) {
  const [duration, setDuration] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [plans, setPlans] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      if (!duration && loadedPlans.length > 0) {
        const cycles = [...new Set(loadedPlans.map(p => p.billing_cycle))];
        const cycleOrder = ['3months', '6months', 'yearly', '3years'];
        const sorted = cycles.sort((a, b) => cycleOrder.indexOf(a) - cycleOrder.indexOf(b));
        setDuration(sorted[0]);
      }
    } catch (e) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const availableDurations = [...new Set(plans.map(p => p.billing_cycle))].sort((a, b) => {
    const order = ['3months', '6months', 'yearly', '3years'];
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
      };
    }
    acc[key].prices[plan.billing_cycle] = plan.display_price;
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

  const resolveSiteId = async () => {
    if (initialSiteId) return initialSiteId;
    if (onCreateSite) {
      const newSiteId = await onCreateSite();
      if (!newSiteId) throw new Error('Failed to create website');
      return newSiteId;
    }
    return null;
  };

  const handleUpgrade = async (planGroup) => {
    const selectedPlan = planGroup.plans[duration];
    if (!selectedPlan) {
      alert('This plan is not available for the selected billing cycle.');
      return;
    }

    if (!razorpayKeyId) {
      alert('Payment is not configured. Please contact the administrator.');
      return;
    }

    setUpgrading(selectedPlan.id);
    try {
      const resolvedSiteId = await resolveSiteId();
      const res = await createSubscription(selectedPlan.id, resolvedSiteId);

      if (!res.subscriptionId) {
        alert('Failed to create subscription: ' + (res.error || 'Unknown error'));
        return;
      }

      const options = {
        key: razorpayKeyId,
        subscription_id: res.subscriptionId,
        name: 'Fluxe',
        description: `${res.planName} - ${DURATION_LABELS[res.billingCycle] || res.billingCycle}`,
        handler: async function (response) {
          try {
            const verifyRes = await verifySubscriptionPayment({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.verified || verifyRes.success) {
              alert('Payment successful! Your plan has been upgraded.');
              onUpgraded?.();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (verifyErr) {
            alert('Payment verification failed. Please contact support.');
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
      alert('Failed to process: ' + (e.message || 'Please try again.'));
    } finally {
      setUpgrading(null);
    }
  };

  const handleStartTrial = async () => {
    setUpgrading('trial');
    try {
      const data = await startFreeTrial();
      if (data.success || data.message) {
        if (onCreateSite) {
          await onCreateSite();
        }
        alert('Your 7-day free trial has started!');
        onUpgraded?.();
      } else {
        alert(data.error || 'Failed to start trial');
      }
    } catch (e) {
      alert(e.message || 'Failed to start trial. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const getButtonText = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return 'Current Plan';
    if (!isActive || planGroup.plan_tier > currentPlanTier) return planGroup.plan_tier > currentPlanTier && isActive ? 'Upgrade' : 'Subscribe';
    if (planGroup.plan_tier < currentPlanTier) return 'Lower Tier';
    return 'Subscribe';
  };

  const isButtonDisabled = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return true;
    if (isActive && planGroup.plan_tier < currentPlanTier) return true;
    return false;
  };

  if (loading || error || planList.length === 0) {
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
          <div className="modal-content" style={{ maxWidth: '900px', position: 'relative' }}>
            {onClose && (
              <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
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
            {hideTrial ? 'Choose a Plan for Your Website' : isFirstTime ? 'Choose a Plan to Get Started' : isExpired ? 'Your Plan Has Expired' : 'Start Your Free Trial'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {hideTrial
              ? 'Your website has been created! Subscribe to a plan to activate it.'
              : isFirstTime
                ? 'Start with a free trial or subscribe to a plan to create and manage your websites.'
                : isExpired
                  ? 'Your subscription has expired and all your websites are disabled. Subscribe to a plan for each site to restore access.'
                  : 'Start a 7-day free trial to create unlimited websites. No credit card required.'}
          </p>
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
              {DURATION_LABELS[key] || key}
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
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'left', fontSize: '0.875rem', color: '#64748b' }}>
              <li style={{ marginBottom: '0.5rem' }}>✓ Create unlimited websites</li>
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
              {upgrading === 'trial' ? 'Starting...' : 'Start Free Trial'}
            </button>
          </div>
        )}

        {planList.map(planGroup => {
          const price = planGroup.prices[duration];

          return (
            <div key={planGroup.name} className="site-card plan-card" style={{ position: 'relative', ...(planGroup.is_popular ? { borderColor: 'var(--accent)' } : {}) }}>
              {planGroup.is_popular && <span className="popular-badge">POPULAR</span>}
              <h3 style={{ marginBottom: '0.5rem' }}>{planGroup.name}</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                ₹{price}
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{PERIOD_SUFFIX[duration] || ''}</span>
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {planGroup.features.map((f, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>✓ {f}</li>
                ))}
              </ul>
              <button
                className={`btn ${isButtonDisabled(planGroup) ? 'btn-outline' : 'btn-primary'}`}
                style={{ width: '100%', opacity: isButtonDisabled(planGroup) ? 0.6 : 1 }}
                disabled={isButtonDisabled(planGroup) || upgrading !== null}
                onClick={() => handleUpgrade(planGroup)}
              >
                {upgrading === planGroup.plans[duration]?.id ? 'Processing...' : getButtonText(planGroup)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '900px', position: 'relative' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', fontSize: '1.5rem',
                cursor: 'pointer', color: '#64748b', lineHeight: 1
              }}
            >
              ×
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  return content;
}
