import { useState, useEffect } from 'react';
import { getAvailablePlans, createSubscription, verifySubscriptionPayment, startFreeTrial } from '../services/paymentService.js';

const DURATION_LABELS = { monthly: 'Monthly', '6months': '6 Months', yearly: 'Yearly' };
const PERIOD_SUFFIX = { monthly: '/mo', '6months': '/6mo', yearly: '/yr' };

export default function PlanSelector({ currentPlan, currentStatus, hadSubscription, onUpgraded, isOverlay }) {
  const [duration, setDuration] = useState('monthly');
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
      setPlans(data.plans || []);
      setRazorpayKeyId(data.razorpayKeyId || null);
    } catch (e) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    const key = plan.plan_name;
    if (!acc[key]) {
      acc[key] = {
        name: key,
        prices: {},
        features: plan.features || [],
        is_popular: false,
        plans: {},
        display_order: plan.display_order ?? 999,
      };
    }
    acc[key].prices[plan.billing_cycle] = plan.display_price;
    acc[key].plans[plan.billing_cycle] = plan;
    if (plan.is_popular) acc[key].is_popular = true;
    if (plan.display_order != null && plan.display_order < acc[key].display_order) {
      acc[key].display_order = plan.display_order;
    }
    return acc;
  }, {});

  const planList = Object.values(groupedPlans).sort((a, b) => a.display_order - b.display_order);

  const availableDurations = [...new Set(plans.map(p => p.billing_cycle))];

  const isActive = currentStatus === 'active';
  const currentPlanLower = (isActive && currentPlan) ? currentPlan.toLowerCase() : null;
  const currentPlanOrder = (() => {
    if (!currentPlanLower || currentPlanLower === 'trial') return -1;
    const match = planList.find(p => p.name.toLowerCase() === currentPlanLower);
    return match ? match.display_order : -1;
  })();

  const showTrialCard = !hadSubscription && currentPlanLower !== 'trial';
  const isExpired = currentStatus === 'expired' || currentStatus === 'none';

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
      const res = await createSubscription(selectedPlan.id);

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
      alert('Failed to process upgrade. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const getButtonText = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return 'Current Plan';
    if (!isActive || planGroup.display_order > currentPlanOrder) return 'Subscribe';
    return 'Lower Tier';
  };

  const isButtonDisabled = (planGroup) => {
    const planNameLower = planGroup.name.toLowerCase();
    if (isActive && planNameLower === currentPlanLower) return true;
    if (isActive && planGroup.display_order < currentPlanOrder) return true;
    return false;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading plans...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</div>;
  }

  if (planList.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No plans available at the moment.</div>;
  }

  const content = (
    <div>
      {isOverlay && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {isExpired && hadSubscription ? 'Your Plan Has Expired' : 'Choose Your Plan'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {isExpired && hadSubscription
              ? 'Your subscription has expired and your websites are currently disabled. Subscribe to a plan to restore access.'
              : 'Start with a 7-day free trial or pick a plan that fits your needs'}
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
              <li style={{ marginBottom: '0.5rem' }}>✓ Full access for 7 days</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ No credit card required</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Upgrade anytime during trial</li>
            </ul>
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
              disabled={upgrading !== null}
              onClick={async () => {
                setUpgrading('trial');
                try {
                  const data = await startFreeTrial();
                  if (data.success || data.message) {
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
              }}
            >
              {upgrading === 'trial' ? 'Starting...' : 'Start Free Trial'}
            </button>
          </div>
        )}

        {planList.map(planGroup => {
          const price = planGroup.prices[duration];
          const hasPlanForDuration = !!planGroup.plans[duration];

          return (
            <div key={planGroup.name} className="site-card plan-card" style={{ position: 'relative', ...(planGroup.is_popular ? { borderColor: 'var(--accent)' } : {}) }}>
              {planGroup.is_popular && <span className="popular-badge">POPULAR</span>}
              <h3 style={{ marginBottom: '0.5rem' }}>{planGroup.name}</h3>
              {price !== undefined ? (
                <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                  ₹{price}
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{PERIOD_SUFFIX[duration] || ''}</span>
                </p>
              ) : (
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Not available for this cycle
                </p>
              )}
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {planGroup.features.map((f, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>✓ {f}</li>
                ))}
              </ul>
              <button
                className={`btn ${isButtonDisabled(planGroup) || !hasPlanForDuration ? 'btn-outline' : 'btn-primary'}`}
                style={{ width: '100%', opacity: isButtonDisabled(planGroup) || !hasPlanForDuration ? 0.6 : 1 }}
                disabled={isButtonDisabled(planGroup) || !hasPlanForDuration || upgrading !== null}
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
        <div className="modal-content" style={{ maxWidth: '900px' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
