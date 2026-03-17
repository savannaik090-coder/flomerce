import { apiRequest } from './api.js';

export async function getProducts(siteId, params = {}) {
  const query = new URLSearchParams({ siteId, ...params }).toString();
  return apiRequest(`/api/products?${query}`);
}

export async function getProductById(productId, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/products/${productId}${params}`);
}

export async function getProductBySlug(siteId, slug) {
  return apiRequest(`/api/products?siteId=${siteId}&slug=${slug}`);
}

export async function getProductsByCategory(siteId, categoryIdOrSlug, params = {}) {
  const isId = categoryIdOrSlug && categoryIdOrSlug.length > 10 && !categoryIdOrSlug.includes(' ');
  const categoryParam = isId ? { categoryId: categoryIdOrSlug } : { category: categoryIdOrSlug };
  const query = new URLSearchParams({ siteId, ...categoryParam, ...params }).toString();
  return apiRequest(`/api/products?${query}`);
}

export async function createProduct(productData) {
  return apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(productId, productData, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/products/${productId}${params}`, {
    method: 'PUT',
    body: JSON.stringify({ ...productData, siteId }),
  });
}

export async function deleteProduct(productId, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/products/${productId}${params}`, {
    method: 'DELETE',
  });
}
