import { translateContentBatch } from './server-translator.js';

/**
 * Translate a flat object {KEY: 'English string'} into {KEY: 'translated string'}
 * for use inside transactional email / WhatsApp / push notification builders.
 *
 * Fast paths (no DB hit, no API call):
 *   - missing env / siteId / target → return labels unchanged
 *   - target == site content_language → handled inside translateContentBatch
 *   - translator disabled / not allowed → translateContentBatch returns originals
 *
 * Batches all label values into a single translateContentBatch call so the
 * shard's translation_cache is hit once per unique label per (target lang).
 * Repeat sends for the same template+lang are effectively free after warm-up.
 *
 * NEVER throws — always returns a usable map (originals on any error).
 */
export async function translateLabels(env, siteId, target, labels) {
  const out = { ...(labels || {}) };
  const keys = Object.keys(out);
  if (keys.length === 0) return out;
  if (!env || !siteId || !target || typeof target !== 'string') return out;

  try {
    const texts = keys.map((k) => String(out[k] ?? ''));
    const res = await translateContentBatch(env, siteId, texts, target);
    const arr = Array.isArray(res?.translations) ? res.translations : texts;
    for (let i = 0; i < keys.length; i++) {
      const v = arr[i];
      if (typeof v === 'string' && v.length > 0) out[keys[i]] = v;
    }
  } catch (e) {
    console.error('[email-i18n] translateLabels failed:', e?.message || e);
  }
  return out;
}

/**
 * Translate a free-form string (subject lines, dynamic reasons, ad-hoc bodies).
 * Returns the original on any error / no-op path.
 */
export async function translateString(env, siteId, target, text) {
  const safe = typeof text === 'string' ? text : String(text ?? '');
  if (!safe) return safe;
  if (!env || !siteId || !target || typeof target !== 'string') return safe;
  try {
    const res = await translateContentBatch(env, siteId, [safe], target);
    const t = res?.translations?.[0];
    return typeof t === 'string' && t.length > 0 ? t : safe;
  } catch (e) {
    console.error('[email-i18n] translateString failed:', e?.message || e);
    return safe;
  }
}
