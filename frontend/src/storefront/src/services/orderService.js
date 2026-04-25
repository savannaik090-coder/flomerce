import { apiRequest } from './api.js';

function getCurrentLang() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage?.getItem('flomerce_lang') || null;
  } catch { return null; }
}

export async function createOrder(orderData) {
  const lang = getCurrentLang();
  const params = new URLSearchParams();
  if (orderData.siteId) params.set('siteId', orderData.siteId);
  if (orderData.lang || lang) params.set('lang', orderData.lang || lang);
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : '';
  return apiRequest(`/api/orders${suffix}`, {
    method: 'POST',
    body: JSON.stringify({ ...orderData, lang: orderData.lang || lang || undefined }),
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
  return apiRequest(`/api/orders/${orderId}/track${params}`);
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
  const lang = getCurrentLang();
  return apiRequest(`/api/orders/${orderId}/return-link`, {
    method: 'POST',
    body: JSON.stringify({ ...data, lang: data?.lang || lang || undefined }),
  });
}

export async function createCancelRequest(orderId, data) {
  return apiRequest(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCancelStatus(orderId, siteId, token) {
  const params = new URLSearchParams({ siteId });
  if (token) params.set('token', token);
  return apiRequest(`/api/orders/${orderId}/cancel?${params}`);
}

export async function getCancellations(siteId) {
  return apiRequest(`/api/orders/cancellations?siteId=${siteId}`);
}

export async function updateCancellation(cancelId, data) {
  return apiRequest(`/api/orders/cancellations/${cancelId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function resendCancelLink(orderId, data) {
  const lang = getCurrentLang();
  return apiRequest(`/api/orders/${orderId}/cancel-link`, {
    method: 'POST',
    body: JSON.stringify({ ...data, lang: data?.lang || lang || undefined }),
  });
}
