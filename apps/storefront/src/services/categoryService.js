import { apiRequest } from './api.js';

export async function getCategories(siteId) {
  return apiRequest(`/api/categories?site_id=${siteId}`);
}

export async function getCategoryBySlug(siteId, slug) {
  return apiRequest(`/api/categories?site_id=${siteId}&slug=${slug}`);
}

export async function createCategory(categoryData) {
  return apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
}

export async function updateCategory(categoryId, categoryData) {
  return apiRequest(`/api/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
}

export async function deleteCategory(categoryId) {
  return apiRequest(`/api/categories/${categoryId}`, {
    method: 'DELETE',
  });
}
