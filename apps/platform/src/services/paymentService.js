import { apiRequest } from './api.js';

export async function initiateSubscriptionPayment(planId, duration) {
  return apiRequest('/api/payments/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planId, duration }),
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
