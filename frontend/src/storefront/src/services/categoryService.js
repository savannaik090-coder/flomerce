import { apiRequest } from './api.js';

export async function getCategories(siteId) {
  return apiRequest(`/api/categories?siteId=${siteId}`);
}

export async function getCategoryBySlug(siteId, slug) {
  return apiRequest(`/api/categories?siteId=${siteId}&slug=${slug}`);
}

export async function createCategory(categoryData) {
  return apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
}

export async function updateCategory(categoryId, categoryData, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/categories/${categoryId}${params}`, {
    method: 'PUT',
    body: JSON.stringify({ ...categoryData, siteId }),
  });
}

export async function deleteCategory(categoryId, siteId) {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest(`/api/categories/${categoryId}${params}`, {
    method: 'DELETE',
  });
}
