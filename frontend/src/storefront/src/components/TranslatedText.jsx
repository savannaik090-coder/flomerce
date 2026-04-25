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
export default function TranslatedText({ text, vars, as: Tag, className, style, ...rest }) {
  const { translate } = useShopperTranslation();
  let value = translate(text);
  if (vars && typeof value === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined || v === null) continue;
      value = value.split(`{{${k}}}`).join(String(v));
    }
  }
  if (Tag) {
    return <Tag className={className} style={style} {...rest}>{value}</Tag>;
  }
  if (className || style || Object.keys(rest).length > 0) {
    return <span className={className} style={style} {...rest}>{value}</span>;
  }
  return <>{value}</>;
}
