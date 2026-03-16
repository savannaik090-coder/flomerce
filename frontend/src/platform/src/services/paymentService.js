import { apiRequest } from './api.js';

export async function getAvailablePlans() {
  return apiRequest('/api/payments/plans');
}

export async function createSubscription(planId) {
  return apiRequest('/api/payments/subscription', {
    method: 'POST',
    body: JSON.stringify({ planId }),
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
