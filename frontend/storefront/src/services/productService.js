import { apiRequest } from './api.js';

export async function getProducts(siteId, params = {}) {
  const query = new URLSearchParams({ siteId, ...params }).toString();
  return apiRequest(`/api/products?${query}`);
}

export async function getProductById(productId) {
  return apiRequest(`/api/products/${productId}`);
}

export async function getProductBySlug(siteId, slug) {
  return apiRequest(`/api/products?siteId=${siteId}&slug=${slug}`);
}

export async function getProductsByCategory(siteId, categorySlug, params = {}) {
  const query = new URLSearchParams({ siteId, category: categorySlug, ...params }).toString();
  return apiRequest(`/api/products?${query}`);
}

export async function createProduct(productData) {
  return apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(productId, productData) {
  return apiRequest(`/api/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(productId) {
  return apiRequest(`/api/products/${productId}`, {
    method: 'DELETE',
  });
}
