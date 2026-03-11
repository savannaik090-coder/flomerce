const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return 'https://fluxe.in';
  const host = window.location.hostname;
  if (host.endsWith('fluxe.in')) return '';
  if (host.includes('replit.dev') || host.includes('repl.co') || host === 'localhost') return '';
  return 'https://fluxe.in';
})();

export function getApiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}

export function getAuthToken() {
  return localStorage.getItem('store_auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('store_auth_token', token);
  } else {
    localStorage.removeItem('store_auth_token');
  }
}

export function getSessionId() {
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
  const url = getApiUrl(endpoint);
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const adminToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('site_admin_token') : null;

  if (adminToken) {
    headers['Authorization'] = `SiteAdmin ${adminToken}`;
  } else if (token) {
    headers['Authorization'] = `SiteCustomer ${token}`;
  }

  headers['X-Session-ID'] = getSessionId();

  try {
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
      console.error('Non-JSON response received:', text);
      throw new APIError('Server returned an unexpected response format', response.status, 'INVALID_RESPONSE');
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error || 'Request failed';
      throw new APIError(errorMsg, response.status, data.code);
    }

    if (data.success && data.data !== undefined) {
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        return { ...data, ...data.data };
      }
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Network error: ' + error.message, 0, 'NETWORK_ERROR');
  }
}
