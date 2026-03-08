import { apiRequest } from './api.js';

export async function getWishlist(siteId) {
  return apiRequest(`/api/wishlist?site_id=${siteId}`);
}

export async function addToWishlist(siteId, productId) {
  return apiRequest('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify({ site_id: siteId, product_id: productId }),
  });
}

export async function removeFromWishlist(itemId) {
  return apiRequest(`/api/wishlist/${itemId}`, {
    method: 'DELETE',
  });
}

export async function isInWishlist(siteId, productId) {
  return apiRequest(`/api/wishlist/check?site_id=${siteId}&product_id=${productId}`);
}
