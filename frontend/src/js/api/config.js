function getAPIBaseURL() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  // For production and subdomains, always use the main domain for API
  // This ensures that api calls from nazakat.fluxe.in go to fluxe.in/api
  if (hostname.endsWith('.fluxe.in')) {
    return 'https://fluxe.in';
  }
  // Otherwise use relative (works for fluxe.in and pages.dev)
  return '';
}

const API_BASE_URL = getAPIBaseURL();

export const config = {
  apiBaseUrl: API_BASE_URL,
  endpoints: {
    auth: {
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      verifyEmail: '/api/auth/verify-email',
      sendVerification: '/api/auth/send-verification',
      requestReset: '/api/auth/request-reset',
      resetPassword: '/api/auth/reset-password',
      me: '/api/auth/me',
      updateProfile: '/api/auth/update-profile',
    },
    sites: '/api/sites',
    products: '/api/products',
    orders: '/api/orders',
    cart: '/api/cart',
    wishlist: '/api/wishlist',
    payments: '/api/payments',
    categories: '/api/categories',
    email: '/api/email',
  },
};

export function getApiUrl(endpoint) {
  return `${config.apiBaseUrl}${endpoint}`;
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
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

export async function apiRequest(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  headers['X-Session-ID'] = getSessionId();
  
  try {
    const fetchOptions = {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'omit'
    };

    const response = await fetch(url, fetchOptions);
    
    // Check if the response is actually JSON
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
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Network error: ' + error.message, 0, 'NETWORK_ERROR');
  }
}

export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export default config;
