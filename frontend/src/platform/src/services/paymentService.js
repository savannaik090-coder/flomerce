import { apiRequest } from './api.js';

export async function getAvailablePlans() {
  return apiRequest('/api/payments/plans');
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
