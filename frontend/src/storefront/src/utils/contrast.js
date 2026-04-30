// WCAG contrast ratio helpers for the Theme tab's accessibility warnings.
// Implements the standard sRGB relative luminance formula from WCAG 2.1.

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function channelLum(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

// AA targets: 4.5 for body text, 3 for large text and UI components like
// button outlines, focus rings, and accent dots.
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

// Compute every meaningful pair for a scheme. Returns an array of
// `{ pair, ratio, threshold, passes, label }` objects so the UI can display
// each warning chip individually.
export function evaluateScheme(scheme) {
  if (!scheme) return [];
  // 10-slot expansion: separate heading and muted text get their own
  // contrast checks against background. Older schemes that don't carry
  // the new slots fall back to the body `text` value so the row still
  // renders something useful instead of a 1:1 ratio warning.
  const headingText = scheme.headingText || scheme.text;
  const mutedText = scheme.mutedText || scheme.text;
  const pairs = [
    { label: 'Heading text on background', a: headingText, b: scheme.background, threshold: AA_TEXT },
    { label: 'Body text on background', a: scheme.text, b: scheme.background, threshold: AA_TEXT },
    { label: 'Muted text on background', a: mutedText, b: scheme.background, threshold: AA_LARGE },
    { label: 'Button text on button', a: scheme.buttonText, b: scheme.button, threshold: AA_TEXT },
    { label: 'Body text on secondary button', a: scheme.text, b: scheme.secondaryButton, threshold: AA_TEXT },
    { label: 'Link on background', a: scheme.link, b: scheme.background, threshold: AA_TEXT },
    { label: 'Accent on background', a: scheme.accent, b: scheme.background, threshold: AA_LARGE },
  ];
  return pairs.map(p => {
    const ratio = contrastRatio(p.a, p.b);
    return {
      label: p.label,
      ratio: Math.round(ratio * 100) / 100,
      threshold: p.threshold,
      passes: ratio >= p.threshold,
    };
  });
}
