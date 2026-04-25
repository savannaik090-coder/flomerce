import React from 'react';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

/**
 * Wrap merchant-entered strings (product names, descriptions, category
 * names, About copy, custom policy text) — NOT chrome strings (those use
 * t() from System A / shared i18n).
 *
 * Renders the translated string when System B is enabled and the shopper
 * has picked a non-default language; otherwise renders the original.
 *
 * Usage:
 *   <TranslatedText text={product.name} />
 *   <TranslatedText text={description} as="p" />
 *
 * For phrases with dynamic values (proper nouns, brand names, numbers
 * that must NOT be translated), use the `vars` prop with `{name}` tokens
 * in the source string. The full template is translated as one unit so
 * grammar/word order is preserved across languages, then `{name}` is
 * replaced with the literal value:
 *
 *   <TranslatedText text="Welcome to {{brand}}" vars={{ brand: 'Acme' }} />
 *   // en: "Welcome to Acme"
 *   // hi: "Acme में आपका स्वागत है"
 *
 * The double-brace syntax matches the i18next placeholder convention that
 * the server translator already protects via <span class="notranslate">,
 * so Microsoft leaves `{{brand}}` intact through the round trip.
 */
// Microsoft Translator occasionally collapses the whitespace around a
// `<span class="notranslate">{{key}}</span>` site, producing renders like
// "Djdमें आपका स्वागत है!" instead of "Djd में आपका स्वागत है!". We defend
// against that by tokenising the source on `{{key}}` boundaries, then —
// when substituting — inserting a single space wherever the boundary
// touches an ORIGINAL surrounding letter from a script that uses
// inter-word spacing. CJK scripts (Han / Hiragana / Katakana / Hangul)
// don't use word spaces, so we never pad against them. Adjacency to
// punctuation, brackets, whitespace, or another placeholder is also
// never padded — so `{{x}}!`, `{{x}}{{y}}`, and the original correct
// "Welcome to {{brand}}!" all remain intact.
const NO_SPACE_SCRIPTS_RE = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}]/u;
function isPaddableLetter(ch) {
  if (!ch) return false;
  if (!/\p{L}/u.test(ch)) return false;
  if (NO_SPACE_SCRIPTS_RE.test(ch)) return false;
  return true;
}

export function substitutePlaceholders(input, vars) {
  if (!input || typeof input !== 'string') return input;
  // Tokenise into alternating text / placeholder chunks.
  const tokens = [];
  const re = /\{\{(\w+)\}\}/g;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(input)) !== null) {
    tokens.push({ kind: 'text', value: input.slice(lastIdx, m.index) });
    tokens.push({ kind: 'ph', key: m[1] });
    lastIdx = re.lastIndex;
  }
  tokens.push({ kind: 'text', value: input.slice(lastIdx) });
  // Resolve, padding only against ORIGINAL surrounding text characters
  // (never against another placeholder's substituted value).
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'text') { out += t.value; continue; }
    const v = vars[t.key];
    if (v === undefined || v === null) {
      // Leave unresolved placeholders intact so callers can spot bugs.
      out += `{{${t.key}}}`;
      continue;
    }
    const prevText = i > 0 ? tokens[i - 1] : null;
    const nextText = i < tokens.length - 1 ? tokens[i + 1] : null;
    const prevChar = (prevText && prevText.kind === 'text' && prevText.value.length)
      ? prevText.value[prevText.value.length - 1] : '';
    const nextChar = (nextText && nextText.kind === 'text' && nextText.value.length)
      ? nextText.value[0] : '';
    let val = String(v);
    if (isPaddableLetter(prevChar)) val = ' ' + val;
    if (isPaddableLetter(nextChar)) val = val + ' ';
    out += val;
  }
  return out;
}

export default function TranslatedText({ text, vars, as: Tag, className, style, ...rest }) {
  const { translate } = useShopperTranslation();
  let value = translate(text);
  if (vars && typeof value === 'string') {
    value = substitutePlaceholders(value, vars);
  }
  if (Tag) {
    return <Tag className={className} style={style} {...rest}>{value}</Tag>;
  }
  if (className || style || Object.keys(rest).length > 0) {
    return <span className={className} style={style} {...rest}>{value}</span>;
  }
  return <>{value}</>;
}
