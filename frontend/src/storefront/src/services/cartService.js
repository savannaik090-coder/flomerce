import { apiRequest, getSessionId } from './api.js';

export async function getCart(siteId) {
  return apiRequest(`/api/cart?siteId=${siteId}&sessionId=${getSessionId()}`);
}

export async function addToCart(siteId, productId, quantity = 1, variant = null) {
  return apiRequest(`/api/cart?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, variant, sessionId: getSessionId() }),
  });
}

export async function updateCartItem(siteId, productId, quantity, variant = null) {
  return apiRequest(`/api/cart?siteId=${siteId}`, {
    method: 'PUT',
    body: JSON.stringify({ productId, quantity, variant, sessionId: getSessionId() }),
  });
}

export async function removeFromCart(siteId, productId) {
  return apiRequest(`/api/cart?siteId=${siteId}&productId=${productId}&sessionId=${getSessionId()}`, {
    method: 'DELETE',
  });
}

export async function clearCart(siteId) {
  return apiRequest(`/api/cart/clear?siteId=${siteId}&sessionId=${getSessionId()}`, {
    method: 'DELETE',
  });
}

export async function mergeCarts(siteId) {
  return apiRequest(`/api/cart/merge?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify({ siteId, sessionId: getSessionId() }),
  });
}
