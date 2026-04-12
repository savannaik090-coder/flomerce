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

export async function signup(siteId, name, email, password, phone) {
  const data = await apiRequest('/api/customer-auth/signup', {
    method: 'POST',
    body: JSON.stringify({ siteId, name, email, password, phone: phone || undefined }),
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

export async function requestPasswordReset(email, siteId) {
  return apiRequest('/api/customer-auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, siteId }),
  });
}

export async function resetPassword(token, email, password) {
  return apiRequest('/api/customer-auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, email, password }),
  });
}

export async function verifyEmail(token, email) {
  return apiRequest('/api/customer-auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token, email }),
  });
}

export async function resendVerification(email, siteId) {
  return apiRequest('/api/customer-auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email, siteId }),
  });
}

export async function googleLogin(siteId, credential) {
  const data = await apiRequest('/api/customer-auth/google-login', {
    method: 'POST',
    body: JSON.stringify({ siteId, credential }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}
