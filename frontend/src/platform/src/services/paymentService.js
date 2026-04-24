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

export async function createSubscription(planId, siteId) {
  return apiRequest('/api/payments/subscription', {
    method: 'POST',
    body: JSON.stringify({ planId, siteId }),
  });
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
