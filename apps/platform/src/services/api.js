const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return 'https://fluxe.in';
  const host = window.location.hostname;
  if (host === 'fluxe.in' || host === 'www.fluxe.in') return '';
  if (host.endsWith('.fluxe.in')) return 'https://fluxe.in';
  return 'http://localhost:8000';
})();

function getToken() {
  return localStorage.getItem('auth_token');
}

function getSessionId() {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  headers['X-Session-ID'] = getSessionId();

  const fetchOptions = {
    ...options,
    headers,
    mode: 'cors',
    credentials: 'omit',
  };

  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new APIError('Server returned an unexpected response format', response.status, 'INVALID_RESPONSE');
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || 'Request failed';
    throw new APIError(errorMsg, response.status, data.code);
  }

  if (data.success && data.data !== undefined) {
    return { ...data, ...data.data };
  }

  return data;
}

export default apiRequest;
