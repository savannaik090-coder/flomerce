import { apiRequest, setAuthToken } from './api.js';

export async function login(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function signup(name, email, password) {
  return apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout() {
  setAuthToken(null);
}

export async function getProfile() {
  return apiRequest('/api/auth/me');
}

export async function updateProfile(data) {
  return apiRequest('/api/auth/update-profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(token, email) {
  return apiRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token, email }),
  });
}

export async function requestPasswordReset(email) {
  return apiRequest('/api/auth/request-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, email, password) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, email, password }),
  });
}

export async function resendVerification(email) {
  return apiRequest('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function googleAuth(credential) {
  const data = await apiRequest('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}
