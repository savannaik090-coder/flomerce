import React, { useContext, useId, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { buildScopedCSS, resolveSectionColors } from './sectionSelectors.js';

// SchemeScope wraps a section. Two layers of recoloring run in parallel:
//
//   1. CSS variables (--scheme-*, plus legacy --color-* aliases) on the
//      wrapper div. Any CSS that uses var(--scheme-*) or var(--color-primary)
//      automatically picks up the section's colors.
//
//   2. A scoped <style> block (built from sectionSelectors.js) that emits
//      high-specificity rules with !important. This is the layer that
//      actually beats the existing hardcoded `!important` declarations in
//      the storefront stylesheets — without that, schemes are a no-op for
//      every legacy section.
//
// Per-section overrides come from siteConfig.settings.sectionColorOverrides
// via SiteContext.getOverridesForSection(sectionId). Overrides take precedence
// over the assigned scheme on a per-slot basis.
export default function SchemeScope({ sectionId, as: Tag = 'div', style, className, children, ...rest }) {
  const ctx = useContext(SiteContext);
  // Stable unique scope id per <SchemeScope> instance so the emitted CSS
  // doesn't leak into other sections that share the same sectionId.
  const reactId = useId();
  const scopeId = useMemo(() => reactId.replace(/[^a-zA-Z0-9_-]/g, '_'), [reactId]);

  const scheme = useMemo(() => {
    if (ctx?.getSchemeForSection) return ctx.getSchemeForSection(sectionId);
    return null;
  }, [ctx, sectionId]);

  const overrides = useMemo(() => {
    if (ctx?.getOverridesForSection) return ctx.getOverridesForSection(sectionId);
    return null;
  }, [ctx, sectionId]);

  const effective = useMemo(() => resolveSectionColors(scheme, overrides), [scheme, overrides]);

  const scopedCss = useMemo(() => {
    if (!effective || Object.keys(effective).length === 0) return '';
    return buildScopedCSS(scopeId, sectionId, scheme, overrides);
  }, [scopeId, sectionId, scheme, overrides, effective]);

  if (!scheme && !overrides) {
    // No theme resolved yet — render children unwrapped so initial paint
    // doesn't lose CSS context.
    return <>{children}</>;
  }

  const cssVars = effectiveToCssVars(effective);
  const merged = { ...cssVars, ...(style || {}) };
  return (
    <Tag
      className={className}
      style={merged}
      data-flomerce-scope={scopeId}
      data-flomerce-scheme={scheme?.id}
      data-flomerce-section={sectionId}
      {...rest}
    >
      {scopedCss && (
        <style data-flomerce-scope-css={scopeId} dangerouslySetInnerHTML={{ __html: scopedCss }} />
      )}
      {children}
    </Tag>
  );
}

function effectiveToCssVars(eff) {
  if (!eff) return {};
  const vars = {};
  if (eff.background) vars['--scheme-bg'] = eff.background;
  if (eff.text) vars['--scheme-text'] = eff.text;
  if (eff.button) {
    vars['--scheme-button'] = eff.button;
    vars['--color-primary'] = eff.button;
    vars['--color-primary-dark'] = eff.button;
  }
  if (eff.buttonText) vars['--scheme-button-text'] = eff.buttonText;
  if (eff.secondaryButton) {
    vars['--scheme-secondary-button'] = eff.secondaryButton;
    vars['--color-secondary'] = eff.secondaryButton;
    vars['--color-primary-light'] = eff.secondaryButton;
  }
  if (eff.link) vars['--scheme-link'] = eff.link;
  if (eff.accent) {
    vars['--scheme-accent'] = eff.accent;
    vars['--color-accent'] = eff.accent;
    vars['--color-accent-light'] = eff.accent;
    vars['--color-accent-gold'] = eff.accent;
  }
  return vars;
}

export function schemeToCssVars(scheme) {
  return effectiveToCssVars(scheme);
}
