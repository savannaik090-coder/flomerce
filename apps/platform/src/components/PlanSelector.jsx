import { useState } from 'react';
import { initiateSubscriptionPayment } from '../services/paymentService.js';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    prices: { monthly: 99, '6months': 499, yearly: 899 },
    features: ['1 Website', 'Standard Templates', '24/7 Support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    popular: true,
    prices: { monthly: 299, '6months': 1499, yearly: 2499 },
    features: ['3 Websites', 'All Templates', 'Priority Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    prices: { monthly: 999, '6months': 4999, yearly: 8999 },
    features: ['Unlimited Websites', 'Custom Domain Ready', 'Dedicated Manager'],
  },
];

const DURATION_LABELS = { monthly: 'Monthly', '6months': '6 Months', yearly: 'Yearly' };
const PERIOD_SUFFIX = { monthly: '/mo', '6months': '/6mo', yearly: '/yr' };

export default function PlanSelector({ currentPlan, onUpgraded }) {
  const [duration, setDuration] = useState('monthly');
  const [upgrading, setUpgrading] = useState(null);

  const handleUpgrade = async (planId) => {
    setUpgrading(planId);
    try {
      const res = await initiateSubscriptionPayment(planId, duration);
      if (res.success) {
        alert('Payment successful! Your plan has been updated.');
        onUpgraded?.();
      } else {
        alert('Payment failed: ' + (res.error || 'payment verification failed'));
      }
    } catch (e) {
      alert('Failed to process upgrade. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const planTiers = { free: 0, trial: 0, basic: 1, premium: 2, pro: 3 };
  const currentTier = planTiers[currentPlan?.toLowerCase()] ?? -1;

  const getButtonText = (planId) => {
    const tier = planTiers[planId];
    if (planId === currentPlan?.toLowerCase()) return 'Current Plan';
    if (tier > currentTier) return 'Upgrade';
    return 'Lower Tier';
  };

  const isDisabled = (planId) => {
    if (planId === currentPlan?.toLowerCase()) return true;
    if (planTiers[planId] < currentTier) return true;
    return false;
  };

  return (
    <div>
      <div className="duration-selector">
        {Object.entries(DURATION_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`dur-btn${duration === key ? ' active' : ''}`}
            onClick={() => setDuration(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="plans-grid">
        {PLANS.map(plan => (
          <div key={plan.id} className="site-card plan-card" style={{ position: 'relative', ...(plan.popular ? { borderColor: 'var(--accent)' } : {}) }}>
            {plan.popular && <span className="popular-badge">POPULAR</span>}
            <h3 style={{ marginBottom: '0.5rem' }}>{plan.name}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              ₹{plan.prices[duration]}
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{PERIOD_SUFFIX[duration]}</span>
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>✓ {f}</li>
              ))}
            </ul>
            <button
              className={`btn ${isDisabled(plan.id) ? 'btn-outline' : 'btn-primary'}`}
              style={{ width: '100%', opacity: isDisabled(plan.id) ? 0.6 : 1 }}
              disabled={isDisabled(plan.id) || upgrading === plan.id}
              onClick={() => handleUpgrade(plan.id)}
            >
              {upgrading === plan.id ? 'Processing...' : getButtonText(plan.id)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
