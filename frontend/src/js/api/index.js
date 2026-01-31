export { default as config, apiRequest, getApiUrl, getAuthToken, setAuthToken, getSessionId, APIError } from './config.js';
export { default as authService } from './AuthService.js';
export { default as siteService } from './SiteService.js';
export { default as productService } from './ProductService.js';
export { default as orderService } from './OrderService.js';
export { default as cartService } from './CartService.js';
export { default as wishlistService } from './WishlistService.js';
export { default as paymentService } from './PaymentService.js';
export { default as categoryService } from './CategoryService.js';

import authService from './AuthService.js';
import cartService from './CartService.js';
import wishlistService from './WishlistService.js';

export async function initializeServices(siteId = null) {
  await authService.init();
  
  if (siteId) {
    cartService.setSiteId(siteId);
    wishlistService.setSiteId(siteId);
  }
  
  return {
    authService,
    cartService,
    wishlistService,
  };
}

export function initializeStorefrontServices(siteId) {
  cartService.setSiteId(siteId);
  wishlistService.setSiteId(siteId);
  
  return {
    cartService,
    wishlistService,
  };
}
