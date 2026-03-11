import { apiRequest } from './api.js';

export async function getWishlist(siteId) {
  return apiRequest(`/api/wishlist?siteId=${siteId}`);
}

export async function addToWishlist(siteId, productId) {
  return apiRequest(`/api/wishlist?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export async function removeFromWishlist(siteId, productId) {
  return apiRequest(`/api/wishlist?siteId=${siteId}&productId=${productId}`, {
    method: 'DELETE',
  });
}

export async function isInWishlist(siteId, productId) {
  return apiRequest(`/api/wishlist/check?siteId=${siteId}&productId=${productId}`);
}
