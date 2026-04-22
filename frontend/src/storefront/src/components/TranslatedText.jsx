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
 */
export default function TranslatedText({ text, as: Tag, className, style, ...rest }) {
  const { translate } = useShopperTranslation();
  const value = translate(text);
  if (Tag) {
    return <Tag className={className} style={style} {...rest}>{value}</Tag>;
  }
  if (className || style || Object.keys(rest).length > 0) {
    return <span className={className} style={style} {...rest}>{value}</span>;
  }
  return <>{value}</>;
}
