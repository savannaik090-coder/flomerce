import { apiRequest, getSessionId } from './api.js';

function getCurrentLang() {
  try {
    if (typeof window === 'undefined') return '';
    return window.localStorage?.getItem('flomerce_lang') || '';
  } catch { return ''; }
}

export async function getCart(siteId) {
  const lang = getCurrentLang();
  const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : '';
  return apiRequest(`/api/cart?siteId=${siteId}&sessionId=${getSessionId()}${langParam}`);
}

export async function addToCart(siteId, productId, quantity = 1, variant = null, selectedOptions = null) {
  return apiRequest(`/api/cart?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, variant, selectedOptions, sessionId: getSessionId() }),
  });
}

export async function updateCartItem(siteId, productId, quantity, variant = null, selectedOptions = null) {
  return apiRequest(`/api/cart?siteId=${siteId}`, {
    method: 'PUT',
    body: JSON.stringify({ productId, quantity, variant, selectedOptions, sessionId: getSessionId() }),
  });
}

export async function removeFromCart(siteId, productId, selectedOptions = null) {
  let url = `/api/cart?siteId=${siteId}&productId=${productId}&sessionId=${getSessionId()}`;
  if (selectedOptions) url += `&selectedOptions=${encodeURIComponent(JSON.stringify(selectedOptions))}`;
  return apiRequest(url, {
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
