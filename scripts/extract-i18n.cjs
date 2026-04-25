#!/usr/bin/env node
/**
 * Extracts every translatable source string the storefront could ever
 * render and writes them to backend/i18n-manifest.json.
 *
 * Sources scanned:
 *   1. All .jsx/.js under frontend/src/storefront/src for
 *      `<TranslatedText text="..." />` literals (single, double, or
 *      backtick-quoted).
 *   2. All files under frontend/src/storefront/src/defaults/* for string
 *      values of known translatable fields (name, title, subtitle,
 *      description, headline, text, buttonText, ctaText, label,
 *      caption, tagline, role).
 *
 * Output shape:
 *   { generatedAt, hash, count, strings: ["...", ...] }
 *
 * `hash` is a stable digest of the sorted strings list — included as the
 * `v=` cache-buster on the bundle URL so that any deploy that adds or
 * changes a chrome string forces a fresh bundle without touching any
 * merchant data.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'frontend/src/storefront/src');
const OUT = path.join(ROOT, 'backend/i18n-manifest.json');

const TRANSLATED_TEXT_RE = /<TranslatedText\s+(?:[^>]*?\s)?text=(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\}|\{"([^"]+)"\}|\{'([^']+)'\})/g;
const DEFAULT_FIELD_RE = /(?:^|[^a-zA-Z_$])(?:name|title|subtitle|description|headline|text|buttonText|ctaText|ctaLabel|label|caption|tagline|role|message|body|heading|content|copyright|placeholder|tooltip)\s*:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function looksLikeContent(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length === 0 || t.length > 500) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/^\/[a-z0-9_\-/.]/i.test(t)) return false;
  if (/^data:/i.test(t)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return false;
  if (/^[\d\s.,+\-]+$/.test(t)) return false;
  if (/^[a-z0-9._%+\-]+@[a-z0-9.\-]+$/i.test(t)) return false;
  if (!/[\p{L}]/u.test(t)) return false;
  return true;
}

const strings = new Set();
const allFiles = walk(SRC);

let chromeCount = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  TRANSLATED_TEXT_RE.lastIndex = 0;
  let m;
  while ((m = TRANSLATED_TEXT_RE.exec(content)) !== null) {
    const text = m[1] || m[2] || m[3] || m[4] || m[5];
    if (looksLikeContent(text)) {
      strings.add(text);
      chromeCount += 1;
    }
  }
}

let defaultsCount = 0;
const defaultsDir = path.join(SRC, 'defaults');
if (fs.existsSync(defaultsDir)) {
  for (const entry of fs.readdirSync(defaultsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(jsx?|tsx?)$/.test(entry.name)) continue;
    const content = fs.readFileSync(path.join(defaultsDir, entry.name), 'utf8');
    DEFAULT_FIELD_RE.lastIndex = 0;
    let m;
    while ((m = DEFAULT_FIELD_RE.exec(content)) !== null) {
      const text = m[1] || m[2] || m[3];
      if (looksLikeContent(text)) {
        strings.add(text);
        defaultsCount += 1;
      }
    }
  }
}

const sorted = [...strings].sort();
const hash = crypto
  .createHash('sha256')
  .update(sorted.join('\u0000'))
  .digest('hex')
  .slice(0, 16);

const manifest = {
  generatedAt: new Date().toISOString(),
  hash,
  count: sorted.length,
  strings: sorted,
};

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(
  `[extract-i18n] ${sorted.length} unique strings ` +
    `(${chromeCount} chrome literals, ${defaultsCount} defaults values) ` +
    `→ ${path.relative(ROOT, OUT)} (hash=${hash})`,
);
