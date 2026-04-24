import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAvailablePlans, getPlanTranslations } from '../services/paymentService.js';
import { SUPPORT_EMAIL } from '../config.js';

const DURATION_MONTHS = { monthly: 1, '3months': 3, '6months': 6, yearly: 12 };

// Apply a per-language translation overlay (loaded from /api/i18n/plans/:lang)
// onto the raw plans array returned by /api/payments/plans. The overlay only
// covers strings: plan_name (group key), tagline, and the features list. The
// raw row's price / billing_cycle / razorpay_plan_id stay untouched so the
// checkout flow always references the canonical English plan_name on the
// server side. The visible plan_name is replaced ONLY for rendering; we keep
// the original under `_original_plan_name` so future logic that needs the
// raw key (e.g. analytics or a switch to a Razorpay flow) can still find it.
function applyPlanTranslations(rawPlans, overlay) {
  if (!overlay || !overlay.planTranslations) return rawPlans;
  return rawPlans.map((p) => {
    const t = overlay.planTranslations[p.plan_name];
    if (!t) return p;
    return {
      ...p,
      _original_plan_name: p.plan_name,
      plan_name: t.plan_name || p.plan_name,
      tagline: t.tagline || p.tagline,
      features: Array.isArray(t.features) && t.features.length ? t.features : p.features,
    };
  });
}

export default function LandingPricing() {
  const { t, i18n } = useTranslation('landing');
  const [duration, setDuration] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enterpriseConfig, setEnterpriseConfig] = useState({ enabled: false, message: '', email: '' });

  const durationLabel = (key) => t(`pricing.duration.${key}`, { defaultValue: key });
  const durationText = (key) => t(`pricing.duration.${key}Per`, { defaultValue: key });

  // Re-fetch whenever the active language changes so the visitor sees the
  // pricing tiles in their selected language. The translation overlay endpoint
  // is long-cached at the Cloudflare edge (~7d) and purged automatically when
  // the admin saves a plan, so this fetch costs effectively zero worker time
  // in steady state — see backend/workers/platform/i18n-worker.js
  // handlePlansLocale.
  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const lang = (i18n.language || 'en').split('-')[0] === 'en' ? 'en' : i18n.language;
      const [plansData, overlayResp] = await Promise.all([
        getAvailablePlans(),
        lang && lang !== 'en'
          ? getPlanTranslations(lang).catch((e) => {
              // Translation failure must NEVER break the page — fall back to
              // English plan strings silently. The visitor still sees the rest
              // of the UI in their language; only the plan tiles stay English.
              console.warn('[pricing] plan translations fetch failed:', e?.message || e);
              return null;
            })
          : Promise.resolve(null),
      ]);
      const rawPlans = plansData.plans || [];
      const translated = overlayResp ? applyPlanTranslations(rawPlans, overlayResp) : rawPlans;
      setPlans(translated);
      if (plansData.enterpriseConfig) {
        // Overlay the enterprise banner message too. enterprise_enabled and
        // enterprise_email are not translated (boolean + raw email).
        const ent = { ...plansData.enterpriseConfig };
        if (overlayResp && overlayResp.enterpriseMessage) {
          ent.message = overlayResp.enterpriseMessage;
        }
        setEnterpriseConfig(ent);
      }
      if (!duration && rawPlans.length > 0) {
        const cycles = [...new Set(rawPlans.map(p => p.billing_cycle))];
        const cycleOrder = ['monthly', '3months', '6months', 'yearly'];
        const sorted = cycles.sort((a, b) => cycleOrder.indexOf(a) - cycleOrder.indexOf(b));
        setDuration(sorted[0]);
      }
    } catch (e) {
      setError(t('pricing.loadError'));
    } finally {
      setLoading(false);
    }
  }, [i18n.language, t, duration]);

  useEffect(() => {
    loadPlans();
    // Re-run whenever i18n.language changes (visitor switches language).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

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

  if (loading) {
    return (
      <div className="landing-pricing-loading">
        <div className="spinner" />
        <p>{t('pricing.loading')}</p>
      </div>
    );
  }

  if (error) {
    return <div className="landing-pricing-error">{error}</div>;
  }

  if (planList.length === 0 && !enterpriseConfig.enabled) {
    return <div className="landing-pricing-error">{t('pricing.noPlans')}</div>;
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
              {durationLabel(key)}
            </button>
          ))}
        </div>
      )}

      <div className="lp-plans-grid">
        <div className="lp-plan-card lp-plan-trial">
          <div className="lp-plan-badge lp-badge-trial">{t('pricing.trialBadge')}</div>
          <h3>{t('pricing.trialTitle')}</h3>
          <div className="lp-plan-price">
            <span className="lp-price-amount">&#8377;0</span>
            <span className="lp-price-period">{t('pricing.trialFor7Days')}</span>
          </div>
          <ul className="lp-plan-features">
            <li>{t('pricing.trialFeatures.createSites')}</li>
            <li>{t('pricing.trialFeatures.fullAccess')}</li>
            <li>{t('pricing.trialFeatures.noCard')}</li>
            <li>{t('pricing.trialFeatures.upgradeAnytime')}</li>
          </ul>
          <Link to="/signup" className="btn lp-btn-trial">{t('pricing.startTrial')}</Link>
        </div>

        {planList.filter(p => p.plan_tier < 4).map(planGroup => {
          const price = planGroup.prices[duration];
          const originalPrice = planGroup.original_prices?.[duration];
          const savingsPercent = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

          return (
            <div key={planGroup.name} className={`lp-plan-card${planGroup.is_popular ? ' lp-plan-popular' : ''}`}>
              {planGroup.is_popular && <div className="lp-plan-badge lp-badge-popular">{t('pricing.popularBadge')}</div>}
              <h3>{planGroup.name}</h3>
              {planGroup.tagline && (
                <p className="lp-plan-tagline">{planGroup.tagline}</p>
              )}
              <div className="lp-plan-price">
                {originalPrice && (
                  <span className="lp-price-original">&#8377;{originalPrice}</span>
                )}
                <span className="lp-price-amount">&#8377;{price}</span>
                <span className="lp-price-period">/ {durationText(duration)}</span>
                {savingsPercent > 0 && (
                  <span className="lp-price-save">{t('pricing.saveOff', { percent: savingsPercent })}</span>
                )}
              </div>
              {DURATION_MONTHS[duration] > 1 && (
                <p className="lp-price-monthly">&#8377;{Math.round(price / DURATION_MONTHS[duration])}{t('pricing.perMonth')}</p>
              )}
              <ul className="lp-plan-features">
                {planGroup.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <Link to="/signup" className="btn lp-btn-subscribe">{t('pricing.getStarted')}</Link>
            </div>
          );
        })}

        {enterpriseConfig.enabled && (
          <div className="lp-plan-card lp-plan-enterprise">
            <div className="lp-plan-badge lp-badge-enterprise">{t('pricing.enterpriseBadge')}</div>
            <h3>{t('pricing.enterpriseTitle')}</h3>
            <div className="lp-plan-price">
              <span className="lp-price-amount">{t('pricing.customPrice')}</span>
            </div>
            <p className="lp-enterprise-desc">
              {enterpriseConfig.message || t('pricing.enterpriseDefaultMessage')}
            </p>
            <a href={`mailto:${enterpriseConfig.email || SUPPORT_EMAIL}`} className="btn lp-btn-enterprise">{t('pricing.contactUs')}</a>
          </div>
        )}
      </div>
    </div>
  );
}
