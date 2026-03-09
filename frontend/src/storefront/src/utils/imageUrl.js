import { getApiUrl } from '../services/api.js';

export function resolveImageUrl(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
    return src;
  }
  return getApiUrl(src);
}
