import { apiRequest } from './api.js';

export async function getAvailablePlans() {
  return apiRequest('/api/payments/plans');
}

// Fetch the per-language translation overlay for the dynamic plan strings
// (plan_name / tagline / features / enterprise_message). Long-cached at the
// CDN edge (~7d) and purged automatically when the admin edits a plan or an
// enterprise_* setting, so steady-state cost is near zero — see
// backend/workers/platform/i18n-worker.js handlePlansLocale + the
// purgePlansLocaleCache calls in admin-worker.js.
//
// Returns: { planTranslations: { "<plan_name>": { plan_name, tagline,
// features: string[] } }, enterpriseMessage: string|null, source: "en"|"r2"|
// "translator"|"fallback-en" }
export async function getPlanTranslations(lang) {
  return apiRequest(`/api/i18n/plans/${encodeURIComponent(lang)}`);
}

// `pendingSiteData` is the wizard form payload (brandName, subdomain, theme,
// colours, contact, content_language, etc) the user just submitted. Passing
// it here lets the backend persist it on the pending_subscriptions row so
// the site can be auto-created the moment the subscription activates —
// either via the verify endpoint we call from the Razorpay success handler,
// or via Razorpay's webhook if the browser closes first. Only meaningful
// when creating a brand-new site (no `siteId`); ignored on plan changes.
export async function createSubscription(planId, siteId, pendingSiteData = null) {
  const payload = { planId, siteId };
  if (!siteId && pendingSiteData) {
    payload.pendingSiteData = pendingSiteData;
  }
  return apiRequest('/api/payments/subscription', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Dashboard reconciliation: did the user pay for a plan but never get a
// site? Returns { pendingSite: null } when there's nothing to recover, or
// { pendingSite: { hasPending: true, brandName, planName, lastError, ... } }
// when the post-payment auto-create either failed or never ran.
export async function getPendingSiteStatus() {
  return apiRequest('/api/payments/pending-site');
}

// Manually retry creating the user's most recent pending site using the
// form data we stored before Razorpay opened. Backend refuses unless the
// matching subscription is already active.
export async function retryPendingSiteCreation() {
  return apiRequest('/api/payments/pending-site/retry', { method: 'POST' });
}

export async function verifySubscriptionPayment(data) {
  return apiRequest('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSubscriptionStatus() {
  return apiRequest('/api/payments/subscription');
}

export async function getUserProfile() {
  return apiRequest('/api/users/profile');
}

export async function startFreeTrial() {
  return apiRequest('/api/users/subscription', {
    method: 'PATCH',
    body: JSON.stringify({ plan: 'trial' }),
  });
}

export async function cancelSubscription(siteId) {
  return apiRequest('/api/payments/cancel-subscription', {
    method: 'POST',
    body: JSON.stringify({ siteId }),
  });
}
