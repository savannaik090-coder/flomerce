function getAPIBaseURL() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  // Use relative URL for both Replit and production domain
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
      credentials: 'omit' // Reverting back to omit since we use Authorization header
    };

    console.log(`API Request: ${options.method || 'GET'} ${url}`, {
      headers: Object.keys(headers)
    });

    const response = await fetch(url, fetchOptions);
    
    const data = await response.json();
    console.log(`API Response: ${response.status}`, data);
    
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
    throw new APIError('Network error', 0, 'NETWORK_ERROR');
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
