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

export async function createReturnRequest(orderId, data) {
  return apiRequest(`/api/orders/${orderId}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReturnStatus(orderId, siteId, token) {
  const params = new URLSearchParams({ siteId });
  if (token) params.set('token', token);
  return apiRequest(`/api/orders/${orderId}/return?${params}`);
}

export async function getReturns(siteId) {
  return apiRequest(`/api/orders/returns?siteId=${siteId}`);
}

export async function updateReturn(returnId, data) {
  return apiRequest(`/api/orders/returns/${returnId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function resendReturnLink(orderId, data) {
  return apiRequest(`/api/orders/${orderId}/return-link`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
