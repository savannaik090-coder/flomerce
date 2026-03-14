import { apiRequest } from './api.js';

export async function createOrder(orderData) {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function getOrders(siteId, params = {}) {
  const query = new URLSearchParams({ siteId, ...params }).toString();
  return apiRequest(`/api/orders?${query}`);
}

export async function getOrderById(orderId) {
  return apiRequest(`/api/orders/${orderId}`);
}

export async function updateOrderStatus(orderId, status, extraData = {}) {
  return apiRequest(`/api/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...extraData }),
  });
}

export async function trackOrder(orderId) {
  return apiRequest(`/api/orders/track/${orderId}`);
}
