export function generateId() {
  return crypto.randomUUID();
}

export function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function generateSubdomain(brandName) {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
}

export function jsonResponse(data, status = 200, request = null) {
  const origin = request ? request.headers.get('Origin') : null;
  const allowedOrigin = getAllowedOrigin(origin);
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

function getAllowedOrigin(origin) {
  if (!origin) return 'https://fluxe.in';
  
  // Main production domain
  if (origin === 'https://fluxe.in') return origin;
  
  // All subdomains of fluxe.in (e.g., https://nazakat.fluxe.in)
  if (origin.endsWith('.fluxe.in') && origin.startsWith('https://')) return origin;
  
  // Cloudflare Pages default URLs
  if (origin === 'https://fluxe-8x1.pages.dev') return origin;
  if (origin.endsWith('.pages.dev')) return origin;
  
  // Cloudflare Workers default URL
  if (origin === 'https://saas-platform.savannaik090.workers.dev') return origin;
  if (origin.endsWith('.workers.dev')) return origin;
  
  // Local development
  if (origin.includes('localhost')) return origin;
  
  // Replit development
  if (origin.includes('replit.dev') || origin.includes('repl.co')) return origin;
  
  return 'https://fluxe.in';
}

export function errorResponse(message, status = 400, code = 'ERROR') {
  return jsonResponse({ success: false, error: message, code }, status);
}

export function successResponse(data, message = 'Success') {
  return jsonResponse({ success: true, message, data });
}

export function corsHeaders(request) {
  const origin = request ? request.headers.get('Origin') : null;
  const allowedOrigin = getAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return null;
}

export function getExpiryDate(hours = 24) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function isExpired(dateString) {
  return new Date(dateString) < new Date();
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone) {
  const re = /^[0-9]{10}$/;
  return re.test(phone.replace(/\D/g, ''));
}
