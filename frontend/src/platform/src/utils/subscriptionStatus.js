// Single source of truth for how a site's subscription status is displayed
// across the platform UI (Dashboard cards, managed-site header, SiteCard,
// billing screens, etc). Always pass the object returned by
// `getSiteSubscriptionInfo(site)` so every surface shows the same label.
//
// Functions return translation keys (and params) instead of literal English so
// that callers can run them through i18next's `t()` at the call site. Use the
// helper `renderBadgeText(badge, t)` to format the final user-facing string.

const PLAN_KEYS = {
  trial: 'subscription.plan.trial',
  starter: 'subscription.plan.starter',
  growth: 'subscription.plan.growth',
  pro: 'subscription.plan.pro',
  enterprise: 'subscription.plan.enterprise',
};

/**
 * Returns the i18n key for a plan name, or null if the plan is one of the
 * "non-plan" values (free / expired / paused / cancelled) or unknown.
 */
export function formatPlanNameKey(plan) {
  if (!plan) return null;
  const key = String(plan).toLowerCase();
  if (PLAN_KEYS[key]) return PLAN_KEYS[key];
  if (key === 'free' || key === 'expired' || key === 'paused' || key === 'cancelled') return null;
  return null;
}

/**
 * Returns a localized plan label. Prefers the i18n key; falls back to a
 * capitalized version of the raw plan id for unknown values.
 */
export function formatPlanName(plan, t) {
  if (!plan) return null;
  const key = formatPlanNameKey(plan);
  if (key && typeof t === 'function') return t(key);
  const lower = String(plan).toLowerCase();
  if (lower === 'free' || lower === 'expired' || lower === 'paused' || lower === 'cancelled') return null;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Returns the canonical badge for a site's subscription:
 *   { textKey, textParams, bg, color, tone }
 * tone in: 'active' | 'trial' | 'enterprise' | 'cancelling' | 'expired' | 'inactive'
 *
 * `info` should be the object from DashboardPage's getSiteSubscriptionInfo.
 * Use `renderBadgeText(badge, t)` to produce the final string.
 */
export function getSubscriptionBadge(info) {
  const sub = info || {};
  const planKey = formatPlanNameKey(sub.plan);

  if (sub.plan === 'enterprise') {
    return { textKey: 'subscription.badge.enterprise', textParams: {}, bg: '#ede9fe', color: '#5b21b6', tone: 'enterprise' };
  }

  // Cancellation requested but the paid period is still running.
  if (sub.isCancelled && sub.isActive) {
    return {
      textKey: planKey ? 'subscription.badge.cancellingWithPlan' : 'subscription.badge.cancelling',
      textParams: planKey ? { planKey } : {},
      bg: '#fef3c7',
      color: '#92400e',
      tone: 'cancelling',
    };
  }

  if (sub.isActive) {
    if (sub.plan === 'trial') {
      return { textKey: 'subscription.badge.trial', textParams: {}, bg: '#dbeafe', color: '#1e40af', tone: 'trial' };
    }
    return {
      textKey: planKey ? 'subscription.badge.activeWithPlan' : 'subscription.badge.active',
      textParams: planKey ? { planKey } : {},
      bg: '#dcfce7',
      color: '#166534',
      tone: 'active',
    };
  }

  // Not active. Either expired, cancelled (period over), or never had a plan.
  if (sub.isExpired || sub.status === 'expired' || sub.status === 'cancelled' || sub.status === 'paused') {
    return {
      textKey: planKey ? 'subscription.badge.expiredWithPlan' : 'subscription.badge.expired',
      textParams: planKey ? { planKey } : {},
      bg: '#fee2e2',
      color: '#dc2626',
      tone: 'expired',
    };
  }

  return { textKey: 'subscription.badge.inactive', textParams: {}, bg: '#f1f5f9', color: '#475569', tone: 'inactive' };
}

/**
 * Resolves a badge object (from getSubscriptionBadge) to its localized text.
 */
export function renderBadgeText(badge, t) {
  if (!badge || typeof t !== 'function') return '';
  const params = {};
  if (badge.textParams && badge.textParams.planKey) {
    params.plan = t(badge.textParams.planKey);
  }
  return t(badge.textKey, params);
}

/**
 * Friendly one-line summary of an upcoming scheduled plan change, or null
 * if there isn't one. Useful for tooltips / secondary captions.
 *
 * Requires the i18next `t` function so callers get a localized string.
 */
export function formatScheduledChange(info, t) {
  const sub = info || {};
  if (!sub.scheduledPlan) return null;
  const fn = typeof t === 'function' ? t : (k) => k;
  const planLabel = formatPlanName(sub.scheduledPlan, fn) || sub.scheduledPlan;
  const dateLabel = sub.scheduledStartAt
    ? new Date(sub.scheduledStartAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : fn('subscription.scheduledFallbackDate');
  return fn('subscription.scheduledChange', { plan: planLabel, date: dateLabel });
}
