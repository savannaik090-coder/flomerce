import { apiRequest } from './api.js';

export async function initiateSubscriptionPayment(planId, duration) {
  return apiRequest('/api/payments/subscription', {
    method: 'POST',
    body: JSON.stringify({ planId, billingCycle: duration }),
  });
}

export async function verifyPayment(paymentId, orderId, signature) {
  return apiRequest('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify({ paymentId, orderId, signature }),
  });
}

export async function getSubscriptionStatus() {
  return apiRequest('/api/payments/subscription');
}
