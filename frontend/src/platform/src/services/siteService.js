import { apiRequest } from './api.js';

export async function getUserSites() {
  return apiRequest('/api/sites');
}

export async function getSite(siteId) {
  return apiRequest(`/api/sites/${siteId}`);
}

export async function createSite(data) {
  return apiRequest('/api/sites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSite(siteId, data) {
  return apiRequest(`/api/sites/${siteId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSite(siteId) {
  return apiRequest(`/api/sites/${siteId}`, {
    method: 'DELETE',
  });
}

export async function getSiteBySubdomain(subdomain) {
  return apiRequest(`/api/site?subdomain=${encodeURIComponent(subdomain)}`);
}
