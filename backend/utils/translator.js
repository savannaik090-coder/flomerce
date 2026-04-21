import { getTranslatorCredentials } from '../workers/platform/admin-worker.js';

const TRANSLATE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
const MAX_BATCH = 100;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function translateBatch(env, texts, targetLang, sourceLang = 'en') {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const creds = await getTranslatorCredentials(env);
  if (!creds) {
    throw new Error('Microsoft Translator credentials are not configured.');
  }
  const { apiKey, region } = creds;
  if (!apiKey) throw new Error('Translator API key missing.');

  const url = `${TRANSLATE_ENDPOINT}&from=${encodeURIComponent(sourceLang)}&to=${encodeURIComponent(targetLang)}&textType=plain`;
  const out = [];

  for (const group of chunk(texts, MAX_BATCH)) {
    const headers = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
    };
    if (region) headers['Ocp-Apim-Subscription-Region'] = region;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(group.map((t) => ({ Text: t }))),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Translator HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    for (const item of data) {
      out.push(item?.translations?.[0]?.text ?? '');
    }
  }
  return out;
}

/**
 * Walk a nested catalog object, collecting every string leaf with its
 * dotted-path key. Returns { paths: string[], values: string[] }.
 */
export function flattenCatalog(obj, prefix = '', acc = { paths: [], values: [] }) {
  for (const [k, v] of Object.entries(obj || {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenCatalog(v, p, acc);
    } else if (typeof v === 'string') {
      acc.paths.push(p);
      acc.values.push(v);
    }
  }
  return acc;
}

/** Reconstruct a nested object from dotted-path keys + values. */
export function inflateCatalog(paths, values) {
  const root = {};
  for (let i = 0; i < paths.length; i++) {
    const segs = paths[i].split('.');
    let cur = root;
    for (let j = 0; j < segs.length - 1; j++) {
      cur[segs[j]] = cur[segs[j]] || {};
      cur = cur[segs[j]];
    }
    cur[segs[segs.length - 1]] = values[i];
  }
  return root;
}

export async function translateCatalog(env, sourceCatalog, targetLang) {
  const { paths, values } = flattenCatalog(sourceCatalog);
  if (paths.length === 0) return {};
  const translated = await translateBatch(env, values, targetLang, 'en');
  return inflateCatalog(paths, translated);
}
