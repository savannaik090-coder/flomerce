import { apiRequest, setAuthToken } from './api.js';

export async function login(siteId, email, password) {
  const data = await apiRequest('/api/customer-auth/login', {
    method: 'POST',
    body: JSON.stringify({ siteId, email, password }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function signup(siteId, name, email, password) {
  const data = await apiRequest('/api/customer-auth/signup', {
    method: 'POST',
    body: JSON.stringify({ siteId, name, email, password }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function logout() {
  try {
    await apiRequest('/api/customer-auth/logout', {
      method: 'POST',
    });
  } catch (e) {}
  setAuthToken(null);
}

export async function getProfile() {
  return apiRequest('/api/customer-auth/me');
}

export async function updateProfile(data) {
  return apiRequest('/api/customer-auth/update-profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getAddresses() {
  return apiRequest('/api/customer-auth/addresses');
}

export async function createAddress(data) {
  return apiRequest('/api/customer-auth/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(id, data) {
  return apiRequest(`/api/customer-auth/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(id) {
  return apiRequest(`/api/customer-auth/addresses/${id}`, {
    method: 'DELETE',
  });
}
