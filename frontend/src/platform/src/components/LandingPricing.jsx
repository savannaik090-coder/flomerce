import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailablePlans } from '../services/paymentService.js';

const DURATION_LABELS = { '3months': '3 Months', '6months': '6 Months', yearly: 'Yearly', '3years': '3 Years' };
const DURATION_MONTHS = { '3months': 3, '6months': 6, yearly: 12, '3years': 36 };
const DURATION_TEXT = { '3months': '3 months', '6months': '6 months', yearly: '1 year', '3years': '3 years' };

export default function LandingPricing() {
  const [duration, setDuration] = useState(null);
  const [plans, setPlans] = useState([]);
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
      if (data.enterpriseConfig) setEnterpriseConfig(data.enterpriseConfig);
      if (!duration && loadedPlans.length > 0) {
        const cycles = [...new Set(loadedPlans.map(p => p.billing_cycle))];
        const cycleOrder = ['3months', '6months', 'yearly', '3years'];
        const sorted = cycles.sort((a, b) => cycleOrder.indexOf(a) - cycleOrder.indexOf(b));
        setDuration(sorted[0]);
      }
    } catch (e) {
      setError('Unable to load pricing. Please try again later.');
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

  if (loading) {
    return (
      <div className="landing-pricing-loading">
        <div className="spinner" />
        <p>Loading plans...</p>
      </div>
    );
  }

  if (error) {
    return <div className="landing-pricing-error">{error}</div>;
  }

  if (planList.length === 0 && !enterpriseConfig.enabled) {
    return <div className="landing-pricing-error">No plans available at the moment.</div>;
  }

  return (
    <div className="landing-pricing">
      {availableDurations.length > 1 && (
        <div className="lp-duration-selector">
          {availableDurations.map(key => (
            <button
              key={key}
              className={`lp-dur-btn${duration === key ? ' active' : ''}`}
              onClick={() => setDuration(key)}
            >
              {DURATION_LABELS[key] || key}
            </button>
          ))}
        </div>
      )}

      <div className="lp-plans-grid">
        <div className="lp-plan-card lp-plan-trial">
          <div className="lp-plan-badge lp-badge-trial">FREE TRIAL</div>
          <h3>7-Day Free Trial</h3>
          <div className="lp-plan-price">
            <span className="lp-price-amount">&#8377;0</span>
            <span className="lp-price-period">for 7 days</span>
          </div>
          <ul className="lp-plan-features">
            <li>Create up to 5 websites</li>
            <li>Full access for 7 days</li>
            <li>No credit card required</li>
            <li>Upgrade anytime</li>
          </ul>
          <Link to="/signup" className="btn lp-btn-trial">Start Free Trial</Link>
        </div>

        {planList.filter(p => p.plan_tier < 4).map(planGroup => {
          const price = planGroup.prices[duration];
          const originalPrice = planGroup.original_prices?.[duration];
          const savingsPercent = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

          return (
            <div key={planGroup.name} className={`lp-plan-card${planGroup.is_popular ? ' lp-plan-popular' : ''}`}>
              {planGroup.is_popular && <div className="lp-plan-badge lp-badge-popular">POPULAR</div>}
              <h3>{planGroup.name}</h3>
              <div className="lp-plan-price">
                {originalPrice && (
                  <span className="lp-price-original">&#8377;{originalPrice}</span>
                )}
                <span className="lp-price-amount">&#8377;{price}</span>
                <span className="lp-price-period">/ {DURATION_TEXT[duration] || duration}</span>
                {savingsPercent > 0 && (
                  <span className="lp-price-save">{savingsPercent}% OFF</span>
                )}
              </div>
              {DURATION_MONTHS[duration] > 1 && (
                <p className="lp-price-monthly">&#8377;{Math.round(price / DURATION_MONTHS[duration])}/month</p>
              )}
              <ul className="lp-plan-features">
                {planGroup.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <Link to="/signup" className="btn lp-btn-subscribe">Get Started</Link>
            </div>
          );
        })}

        {enterpriseConfig.enabled && (
          <div className="lp-plan-card lp-plan-enterprise">
            <div className="lp-plan-badge lp-badge-enterprise">ENTERPRISE</div>
            <h3>Enterprise</h3>
            <div className="lp-plan-price">
              <span className="lp-price-amount">Custom</span>
            </div>
            <p className="lp-enterprise-desc">
              {enterpriseConfig.message || 'Need a custom solution for your business? Get in touch for a tailored plan.'}
            </p>
            <a href={`mailto:${enterpriseConfig.email || 'support@fluxe.in'}`} className="btn lp-btn-enterprise">Contact Us</a>
          </div>
        )}
      </div>
    </div>
  );
}
