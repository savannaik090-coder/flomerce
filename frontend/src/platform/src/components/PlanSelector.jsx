import { useState, useEffect } from 'react';
import { getAvailablePlans, createSubscription, verifySubscriptionPayment } from '../services/paymentService.js';

const DURATION_LABELS = { monthly: 'Monthly', '6months': '6 Months', yearly: 'Yearly' };
const PERIOD_SUFFIX = { monthly: '/mo', '6months': '/6mo', yearly: '/yr' };

export default function PlanSelector({ currentPlan, onUpgraded }) {
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
      acc[key] = { name: key, prices: {}, features: plan.features || [], is_popular: false, plans: {} };
    }
    acc[key].prices[plan.billing_cycle] = plan.display_price;
    acc[key].plans[plan.billing_cycle] = plan;
    if (plan.is_popular) acc[key].is_popular = true;
    return acc;
  }, {});

  const planList = Object.values(groupedPlans);

  const availableDurations = [...new Set(plans.map(p => p.billing_cycle))];

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

  const planTiers = { free: 0, trial: 0, basic: 1, premium: 2, pro: 3 };
  const currentTier = planTiers[currentPlan?.toLowerCase()] ?? -1;

  const getButtonText = (planName) => {
    const tier = planTiers[planName.toLowerCase()] ?? -1;
    if (planName.toLowerCase() === currentPlan?.toLowerCase()) return 'Current Plan';
    if (tier > currentTier) return 'Upgrade';
    return 'Lower Tier';
  };

  const isDisabled = (planName) => {
    if (planName.toLowerCase() === currentPlan?.toLowerCase()) return true;
    const tier = planTiers[planName.toLowerCase()] ?? -1;
    if (tier < currentTier) return true;
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

  return (
    <div>
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
                className={`btn ${isDisabled(planGroup.name) || !hasPlanForDuration ? 'btn-outline' : 'btn-primary'}`}
                style={{ width: '100%', opacity: isDisabled(planGroup.name) || !hasPlanForDuration ? 0.6 : 1 }}
                disabled={isDisabled(planGroup.name) || !hasPlanForDuration || upgrading !== null}
                onClick={() => handleUpgrade(planGroup)}
              >
                {upgrading === planGroup.plans[duration]?.id ? 'Processing...' : getButtonText(planGroup.name)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
