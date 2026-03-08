import { apiRequest } from './api.js';

export async function getProducts(siteId, params = {}) {
  const query = new URLSearchParams({ site_id: siteId, ...params }).toString();
  return apiRequest(`/api/products?${query}`);
}

export async function getProductById(productId) {
  return apiRequest(`/api/products/${productId}`);
}

export async function getProductBySlug(siteId, slug) {
  return apiRequest(`/api/products?site_id=${siteId}&slug=${slug}`);
}

export async function getProductsByCategory(siteId, categoryId, params = {}) {
  const query = new URLSearchParams({ site_id: siteId, category_id: categoryId, ...params }).toString();
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
