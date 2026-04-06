import { useState, useEffect, useRef } from 'react';
import { getAvailablePlans, createSubscription, verifySubscriptionPayment, startFreeTrial } from '../services/paymentService.js';
import { deleteSite } from '../services/siteService.js';
import { ENTERPRISE_EMAIL } from '../config.js';

const DURATION_LABELS = { monthly: 'Monthly', '3months': '3 Months', '6months': '6 Months', yearly: 'Yearly' };
const DURATION_MONTHS = { monthly: 1, '3months': 3, '6months': 6, yearly: 12 };
const DURATION_TEXT = { monthly: 'month', '3months': '3 months', '6months': '6 months', yearly: '1 year' };

export default function PlanSelector({ siteId: initialSiteId, currentPlan, currentStatus, onUpgraded, isOverlay, hideTrial, onClose, isFirstTime, onCreateSite }) {
  const [duration, setDuration] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [plans, setPlans] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enterpriseConfig, setEnterpriseConfig] = useState({ enabled: false, message: '', email: '' });

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
      setError('Failed to load plans');
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

  const createdSiteIdRef = useRef(null);
  const paymentSucceededRef = useRef(false);

  const resolveSiteId = async () => {
    if (initialSiteId) return initialSiteId;
    if (onCreateSite) {
      const newSiteId = await onCreateSite();
      if (!newSiteId) throw new Error('Failed to create website');
      createdSiteIdRef.current = newSiteId;
      return newSiteId;
    }
    return null;
  };

  const cleanupOrphanSite = async () => {
    if (createdSiteIdRef.current && !paymentSucceededRef.current) {
      try {
        await deleteSite(createdSiteIdRef.current);
      } catch (e) {}
      createdSiteIdRef.current = null;
    }
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
    paymentSucceededRef.current = false;
    try {
      const resolvedSiteId = await resolveSiteId();
      const res = await createSubscription(selectedPlan.id, resolvedSiteId);

      if (!res.subscriptionId) {
        alert('Failed to create subscription: ' + (res.error || 'Unknown error'));
        await cleanupOrphanSite();
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
              paymentSucceededRef.current = true;
              alert('Payment successful! Your plan has been upgraded.');
              onUpgraded?.();
            } else {
              alert('Payment verification failed. Please contact support.');
              await cleanupOrphanSite();
            }
          } catch (verifyErr) {
            if (verifyErr?.message?.includes('already activated') || verifyErr?.message?.includes('will activate shortly')) {
              paymentSucceededRef.current = true;
              alert('Payment successful! Your plan is being activated. Please refresh the page in a moment.');
              onUpgraded?.();
            } else {
              alert('Payment verification failed. Please contact support.');
              await cleanupOrphanSite();
            }
          }
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: async function () {
            await cleanupOrphanSite();
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
      await cleanupOrphanSite();
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
            {hideTrial ? 'Choose a Plan for Your Website' : isFirstTime ? 'Choose a Plan to Get Started' : isExpired ? 'Your Plan Has Expired' : 'Start Your Free Trial'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {hideTrial
              ? 'Subscribe to a plan to create and activate your website.'
              : isFirstTime
                ? 'Start with a free trial or subscribe to a plan to create and manage your websites.'
                : isExpired
                  ? 'Your subscription has expired and all your websites are disabled. Subscribe to a plan for each site to restore access.'
                  : 'Start a 7-day free trial to create up to 5 websites. No credit card required.'}
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
              {upgrading === 'trial' ? 'Starting...' : 'Start Free Trial'}
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
              <h3 style={{ marginBottom: '0.5rem' }}>{planGroup.name}</h3>
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
                    <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', marginLeft: '0.5rem', fontWeight: 700 }}>
                      {savingsPercent}% OFF
                    </span>
                  )}
                </p>
                {DURATION_MONTHS[duration] > 1 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', fontWeight: 500 }}>
                    (₹{Math.round(price / DURATION_MONTHS[duration])}/month)
                  </p>
                )}
              </div>
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
                {enterpriseConfig.message || 'Need a custom solution for your business? Get in touch with our team for a tailored enterprise plan.'}
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
    );
  }

  return content;
}
