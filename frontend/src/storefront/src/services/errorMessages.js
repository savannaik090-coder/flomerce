/**
 * Maps backend error codes to translated, shopper-friendly messages.
 *
 * Backend storefront workers attach a stable `code` to every shopper-facing
 * `errorResponse(...)` call. The client `apiRequest` puts that code on
 * `APIError.code`. This module converts those codes into translated strings
 * so the shopper never sees raw English from the API.
 *
 * Usage in a page component:
 *
 *   const { translate: tx } = useShopperTranslation();
 *   try {
 *     await apiRequest(...);
 *   } catch (err) {
 *     setError(translateApiError(err, tx, tx("Something went wrong.")));
 *   }
 *
 * The third argument is the already-translated fallback used when the
 * error has no code we recognise (e.g. unexpected 500, network failure).
 */

const CODE_KEYS = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_EXISTS: 'An account with this email already exists for this store.',
  USE_GOOGLE_LOGIN: 'This account uses Google sign-in. Please log in with Google.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in. Check your inbox for the verification link.',
  INVALID_TOKEN: 'This link is invalid or has expired. Please request a new one.',
  INVALID_EMAIL_FORMAT: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
  STORE_NOT_FOUND: 'Store not found.',
  ADDRESS_NOT_FOUND: 'Address not found.',
  ADDRESS_FIELDS_REQUIRED: 'Please fill in first name, house number, city, and postal code.',
  AUTH_REQUIRED: 'Please log in to continue.',
  UNAUTHORIZED: 'You are not authorised to perform this action.',

  // Cart
  PRODUCT_NOT_FOUND: 'This product is no longer available.',
  PRODUCT_NOT_AVAILABLE: 'This product is not available right now.',
  ITEM_NOT_FOUND_IN_CART: 'This item is no longer in your cart.',
  INSUFFICIENT_STOCK: 'Not enough stock available for this product.',
  ALREADY_IN_WISHLIST: 'This product is already in your wishlist.',

  // Orders / Returns / Cancellations
  ORDER_NOT_FOUND: 'Order not found.',
  ORDER_LOOKUP_FAILED: 'We could not find this order. Please check your order number and email.',
  ORDER_NOT_CANCELLABLE: 'This order can no longer be cancelled.',
  RETURNS_DISABLED: 'Returns are not enabled for this store.',
  CANCELLATION_DISABLED: 'Cancellation is not available for this store.',
  ONLY_DELIVERED_RETURNABLE: 'Only delivered orders can be returned.',
  ONLY_PENDING_CANCELLABLE: 'Only pending or confirmed orders can be cancelled.',
  RETURN_ALREADY_EXISTS: 'A return request already exists for this order.',
  CANCEL_ALREADY_EXISTS: 'A cancellation request already exists for this order.',
  INVALID_RETURN_TOKEN: 'This return link is invalid or has expired.',
  INVALID_CANCEL_TOKEN: 'This cancellation link is invalid or has expired.',
  REASON_REQUIRED: 'Please provide a reason.',

  // Reviews
  ALREADY_REVIEWED: 'You have already reviewed this product.',
  ALREADY_REVIEWED_FOR_ORDER: 'You have already reviewed this product for this order.',
  INVALID_REVIEW_LINK: 'This review link is invalid or has expired.',
  NOT_IN_ORDER: 'This product was not part of the order.',
  RATING_OUT_OF_RANGE: 'Please choose a rating between 1 and 5 stars.',

  // Site state
  SITE_MIGRATING: 'The store is updating right now. Please try again in a moment.',
  SITE_MAINTENANCE: 'The store is under maintenance. Please try again shortly.',
  STORAGE_LIMIT: 'The store has reached its plan limits. Please contact the store owner.',
  FEATURE_LOCKED: 'This feature is not available on the current plan.',

  // Network
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  INVALID_RESPONSE: 'The server returned an unexpected response. Please try again.',
};

/**
 * Translate an APIError (or any thrown error with a `.code` property) into
 * a shopper-friendly translated string.
 *
 * @param {unknown} err - The caught error.
 * @param {(text: string) => string} tx - The `translate` function from `useShopperTranslation`.
 * @param {string} fallback - Already-translated fallback string for unknown codes.
 * @returns {string} - A translated, user-facing error message.
 */
export function translateApiError(err, tx, fallback) {
  const code = err && typeof err === 'object' ? err.code : null;
  const backendMessage = (err && typeof err === 'object' && typeof err.message === 'string')
    ? err.message.trim()
    : '';
  const safeFallback = (fallback != null && fallback !== '')
    ? fallback
    : backendMessage;

  if (code && Object.prototype.hasOwnProperty.call(CODE_KEYS, code)) {
    const source = CODE_KEYS[code];
    const translated = typeof tx === 'function' ? tx(source) : source;
    return translated || safeFallback;
  }

  // No code mapping: prefer the backend's specific error message over the
  // generic fallback so the shopper (and the merchant debugging) actually
  // sees what went wrong (e.g. "Insufficient stock for Mug",
  // "Failed to create order: ...") instead of an opaque "Please try again".
  // Generic / network errors fall through to the fallback.
  if (
    backendMessage &&
    backendMessage !== 'Request failed' &&
    !backendMessage.startsWith('Network error:') &&
    !backendMessage.startsWith('Server returned an unexpected response')
  ) {
    return backendMessage;
  }

  return safeFallback;
}

/**
 * Manifest-extractor handle. The literal string array below is scraped at
 * build time by `scripts/extract-i18n.cjs` (constant name
 * `ERROR_MESSAGE_STRINGS` is registered in `CONST_ARRAY_RE`). Keep this
 * list in sync with the values in `CODE_KEYS` above — adding a new code
 * means adding both the entry above AND the literal here.
 *
 * This duplication is intentional: the extractor cannot evaluate
 * `Object.values(CODE_KEYS)` because it works on source text, not at
 * runtime.
 */
export const ERROR_MESSAGE_STRINGS = [
  'Invalid email or password.',
  'An account with this email already exists for this store.',
  'This account uses Google sign-in. Please log in with Google.',
  'Please verify your email before logging in. Check your inbox for the verification link.',
  'This link is invalid or has expired. Please request a new one.',
  'Please enter a valid email address.',
  'Password must be at least 8 characters.',
  'Store not found.',
  'Address not found.',
  'Please fill in first name, house number, city, and postal code.',
  'Please log in to continue.',
  'You are not authorised to perform this action.',
  'This product is no longer available.',
  'This product is not available right now.',
  'This item is no longer in your cart.',
  'Not enough stock available for this product.',
  'This product is already in your wishlist.',
  'Order not found.',
  'We could not find this order. Please check your order number and email.',
  'This order can no longer be cancelled.',
  'Returns are not enabled for this store.',
  'Cancellation is not available for this store.',
  'Only delivered orders can be returned.',
  'Only pending or confirmed orders can be cancelled.',
  'A return request already exists for this order.',
  'A cancellation request already exists for this order.',
  'This return link is invalid or has expired.',
  'This cancellation link is invalid or has expired.',
  'Please provide a reason.',
  'You have already reviewed this product.',
  'You have already reviewed this product for this order.',
  'This review link is invalid or has expired.',
  'This product was not part of the order.',
  'Please choose a rating between 1 and 5 stars.',
  'The store is updating right now. Please try again in a moment.',
  'The store is under maintenance. Please try again shortly.',
  'The store has reached its plan limits. Please contact the store owner.',
  'This feature is not available on the current plan.',
  'Network error. Please check your connection and try again.',
  'The server returned an unexpected response. Please try again.',
];
