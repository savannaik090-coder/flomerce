// Single source of truth for how a site's subscription status is displayed
// across the platform UI (Dashboard cards, managed-site header, SiteCard,
// billing screens, etc). Always pass the object returned by
// `getSiteSubscriptionInfo(site)` so every surface shows the same label.

const PLAN_LABELS = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function formatPlanName(plan) {
  if (!plan) return null;
  const key = String(plan).toLowerCase();
  if (PLAN_LABELS[key]) return PLAN_LABELS[key];
  if (key === 'free' || key === 'expired' || key === 'paused' || key === 'cancelled') return null;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Returns the canonical badge for a site's subscription:
 *   { text, bg, color, tone }  // tone in: 'active' | 'trial' | 'enterprise' | 'cancelling' | 'expired' | 'inactive'
 *
 * `info` should be the object from DashboardPage's getSiteSubscriptionInfo:
 *   { plan, status, periodEnd, isActive, isExpired, isCancelled, hasRazorpay, scheduledPlan, scheduledStartAt }
 */
export function getSubscriptionBadge(info) {
  const sub = info || {};
  const planLabel = formatPlanName(sub.plan);

  if (sub.plan === 'enterprise') {
    return { text: 'Enterprise', bg: '#ede9fe', color: '#5b21b6', tone: 'enterprise' };
  }

  // Cancellation requested but the paid period is still running.
  if (sub.isCancelled && sub.isActive) {
    return {
      text: planLabel ? `${planLabel} - Cancelling` : 'Cancelling',
      bg: '#fef3c7',
      color: '#92400e',
      tone: 'cancelling',
    };
  }

  if (sub.isActive) {
    if (sub.plan === 'trial') {
      return { text: 'Trial', bg: '#dbeafe', color: '#1e40af', tone: 'trial' };
    }
    return {
      text: planLabel ? `${planLabel} - Active` : 'Active',
      bg: '#dcfce7',
      color: '#166534',
      tone: 'active',
    };
  }

  // Not active. Either expired, cancelled (period over), or never had a plan.
  if (sub.isExpired || sub.status === 'expired' || sub.status === 'cancelled' || sub.status === 'paused') {
    return {
      text: planLabel ? `${planLabel} - Expired` : 'Expired',
      bg: '#fee2e2',
      color: '#dc2626',
      tone: 'expired',
    };
  }

  return { text: 'Inactive', bg: '#f1f5f9', color: '#475569', tone: 'inactive' };
}

/**
 * Friendly one-line summary of an upcoming scheduled plan change, or null
 * if there isn't one. Useful for tooltips / secondary captions.
 */
export function formatScheduledChange(info) {
  const sub = info || {};
  if (!sub.scheduledPlan) return null;
  const planLabel = formatPlanName(sub.scheduledPlan) || sub.scheduledPlan;
  const dateLabel = sub.scheduledStartAt
    ? new Date(sub.scheduledStartAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'the end of your current billing period';
  return `Switching to ${planLabel} on ${dateLabel}`;
}
