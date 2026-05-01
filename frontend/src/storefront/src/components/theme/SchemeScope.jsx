import React, { useContext, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

// SchemeScope wraps a section in a div that injects the resolved scheme's
// 7 color tokens as CSS custom properties on itself, scoping all descendants
// to the merchant's chosen colors for that section.
//
// CRITICAL: in addition to the new --scheme-* tokens, this also overrides
// the legacy --color-primary / --color-secondary / --color-accent variables.
// That means existing CSS files (which use var(--color-primary) extensively)
// automatically pick up the section's scheme without needing a mass
// hex-replacement pass — a key strategy for shipping this without rewriting
// 70 stylesheets.
//
// Usage:
//   <SchemeScope sectionId="hero-slider">
//     <HeroSlider />
//   </SchemeScope>
export default function SchemeScope({ sectionId, as: Tag = 'div', style, className, children, ...rest }) {
  const ctx = useContext(SiteContext);
  const scheme = useMemo(() => {
    if (ctx?.getSchemeForSection) return ctx.getSchemeForSection(sectionId);
    return null;
  }, [ctx, sectionId]);

  if (!scheme) {
    // No theme resolved yet — render children unwrapped so initial paint
    // doesn't lose CSS context.
    return <>{children}</>;
  }

  const cssVars = schemeToCssVars(scheme);
  const merged = { ...cssVars, ...(style || {}) };
  return (
    <Tag
      className={className}
      style={merged}
      data-flomerce-scheme={scheme.id}
      data-flomerce-section={sectionId}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function schemeToCssVars(scheme) {
  if (!scheme) return {};
  return {
    '--scheme-bg': scheme.background,
    '--scheme-text': scheme.text,
    '--scheme-button': scheme.button,
    '--scheme-button-text': scheme.buttonText,
    '--scheme-secondary-button': scheme.secondaryButton,
    '--scheme-link': scheme.link,
    '--scheme-accent': scheme.accent,
    // Legacy variable overrides — every existing var(--color-primary) etc.
    // in the codebase resolves through these, so changing a scheme instantly
    // recolors every section assigned to it without touching the stylesheets.
    '--color-primary': scheme.button,
    '--color-primary-light': scheme.secondaryButton,
    '--color-primary-dark': scheme.button,
    '--color-secondary': scheme.secondaryButton,
    '--color-accent': scheme.accent,
    '--color-accent-light': scheme.accent,
    '--color-accent-gold': scheme.accent,
  };
}
