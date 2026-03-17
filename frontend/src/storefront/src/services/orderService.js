import { apiRequest } from './api.js';

export async function createOrder(orderData) {
  const siteParam = orderData.siteId ? `?siteId=${orderData.siteId}` : '';
  return apiRequest(`/api/orders${siteParam}`, {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function getOrders(siteId, params = {}) {
  const query = new URLSearchParams({ siteId, ...params }).toString();
  return apiRequest(`/api/orders?${query}`);
}

export async function getOrderById(orderId, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/orders/${orderId}${params}`);
}

export async function updateOrderStatus(orderId, status, siteId, extraData = {}) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/orders/${orderId}${params}`, {
    method: 'PUT',
    body: JSON.stringify({ status, siteId, ...extraData }),
  });
}

export async function trackOrder(orderId, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/orders/track/${orderId}${params}`);
}
