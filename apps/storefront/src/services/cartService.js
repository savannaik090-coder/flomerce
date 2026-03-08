import { apiRequest, getSessionId } from './api.js';

export async function getCart(siteId) {
  return apiRequest(`/api/cart?site_id=${siteId}&session_id=${getSessionId()}`);
}

export async function addToCart(siteId, productId, quantity = 1) {
  return apiRequest('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ site_id: siteId, product_id: productId, quantity, session_id: getSessionId() }),
  });
}

export async function updateCartItem(itemId, quantity) {
  return apiRequest(`/api/cart/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeFromCart(itemId) {
  return apiRequest(`/api/cart/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearCart(siteId) {
  return apiRequest(`/api/cart/clear?site_id=${siteId}&session_id=${getSessionId()}`, {
    method: 'DELETE',
  });
}

export async function mergeCarts(siteId) {
  return apiRequest('/api/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ site_id: siteId, session_id: getSessionId() }),
  });
}
