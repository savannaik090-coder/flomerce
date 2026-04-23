import React from 'react';
import { useTranslation } from 'react-i18next';
import { normalizePlan, isPlanAtLeast } from '../../utils/plan.js';

export function isPlanSufficient(currentPlan, requiredPlan) {
  return isPlanAtLeast(currentPlan, requiredPlan);
}

export function getRequiredPlan(feature) {
  const map = {
    reviews: 'starter',
    blog: 'starter',
    advancedSeo: 'starter',
    'customer-reviews': 'starter',
    pushManual: 'growth',
    pushAutomated: 'pro',
    revenue: 'growth',
    notifications: 'growth',
    appointmentBooking: 'growth',
    'book-appointment': 'growth',
    removeBranding: 'growth',
  };
  return map[feature] || 'growth';
}

export function isFeatureAvailable(currentPlan, feature) {
  const required = getRequiredPlan(feature);
  return isPlanSufficient(currentPlan, required);
}

export default function FeatureGate({ currentPlan, requiredPlan, featureName, children }) {
  const { t } = useTranslation('admin');
  const plan = normalizePlan(currentPlan);
  const hasPlan = isPlanSufficient(plan, requiredPlan);

  if (hasPlan) return children;

  const displayPlan = (requiredPlan || 'growth').charAt(0).toUpperCase() + (requiredPlan || 'growth').slice(1);
  const featureLabel = featureName || t('featureGate.thisFeature');
  const featureLower = featureName ? featureName.toLowerCase() : t('featureGate.thisFeature').toLowerCase();

  return (
    <div style={{ position: 'relative', minHeight: 300 }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.92)', borderRadius: 12,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <i className="fas fa-lock" style={{ fontSize: 22, color: '#94a3b8' }} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#1e293b' }}>
            {t('featureGate.requires', { feature: featureLabel, plan: displayPlan })}
          </h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
            {t('featureGate.upgradeBody', { feature: featureLower, plan: displayPlan })}
          </p>
          <a
            href={`https://flomerce.com/dashboard/billing`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.6rem 1.5rem', background: '#4f46e5', color: '#fff',
              borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
              textDecoration: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <i className="fas fa-arrow-up" style={{ fontSize: 12 }} />
            {t('featureGate.upgradeButton', { plan: displayPlan })}
          </a>
        </div>
      </div>
      <div style={{ opacity: 0.3, pointerEvents: 'none', filter: 'blur(1px)' }}>
        {children}
      </div>
    </div>
  );
}

export function PlanBadge({ plan, small }) {
  const displayPlan = (plan || 'growth').charAt(0).toUpperCase() + (plan || 'growth').slice(1);
  const colors = {
    growth: { bg: '#dbeafe', color: '#1d4ed8' },
    pro: { bg: '#ede9fe', color: '#7c3aed' },
    enterprise: { bg: '#fef3c7', color: '#b45309' },
  };
  const c = colors[plan] || colors.growth;
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 99,
      fontSize: small ? 9 : 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: c.bg,
      color: c.color,
      lineHeight: small ? '14px' : '16px',
      whiteSpace: 'nowrap',
    }}>
      {displayPlan}
    </span>
  );
}
