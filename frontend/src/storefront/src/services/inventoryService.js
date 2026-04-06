import { apiRequest } from './api.js';

export async function getLocations(siteId) {
  return apiRequest(`/api/inventory-locations?siteId=${siteId}`);
}

export async function createLocation(siteId, data) {
  return apiRequest(`/api/inventory-locations?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLocation(siteId, locationId, data) {
  return apiRequest(`/api/inventory-locations/${locationId}?siteId=${siteId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLocation(siteId, locationId) {
  return apiRequest(`/api/inventory-locations/${locationId}?siteId=${siteId}`, {
    method: 'DELETE',
  });
}

export async function getInventoryLevels(siteId, productId) {
  const params = productId ? `&productId=${productId}` : '';
  return apiRequest(`/api/inventory-locations/levels?siteId=${siteId}${params}`);
}

export async function setInventoryLevel(siteId, productId, locationId, stock) {
  return apiRequest(`/api/inventory-locations/levels?siteId=${siteId}`, {
    method: 'PUT',
    body: JSON.stringify({ product_id: productId, location_id: locationId, stock }),
  });
}

export async function getTransfers(siteId, productId) {
  const params = productId ? `&productId=${productId}` : '';
  return apiRequest(`/api/inventory-locations/transfers?siteId=${siteId}${params}`);
}

export async function createTransfer(siteId, data) {
  return apiRequest(`/api/inventory-locations/transfers?siteId=${siteId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
