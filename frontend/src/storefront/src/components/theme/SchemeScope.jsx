import React, { useContext, useId, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { buildScopedCSS, resolveSectionColors } from './sectionSelectors.js';

// SchemeScope wraps a section but is INERT BY DEFAULT — the storefront looks
// exactly like it did before this feature shipped, byte-identical, until the
// merchant explicitly:
//
//   (a) sets one or more per-section colour overrides for the section, or
//   (b) assigns a non-default scheme to the section via the dropdown.
//
// In either of those cases we emit:
//
//   1. CSS variables on a wrapper div: the full --scheme-* token set,
//      plus legacy --color-primary*, --color-secondary, --color-accent*
//      aliases so existing button/link/accent styling repaints with the
//      merchant's brand. We deliberately do NOT alias the legacy
//      --color-text-* or --color-border-* tiers — those carry the classic
//      template's tonal hierarchy and collapsing them flattens the design.
//
//   2. A scoped <style> block (built from sectionSelectors.js) that emits
//      high-specificity rules with !important — this is the layer that
//      actually beats the existing hardcoded `!important` declarations in
//      the storefront stylesheets.
//
// When nothing is customised: render `<>{children}</>` (unwrapped, no extra
// DOM, no CSS injected). This is the invariant the merchant requested:
// pristine sections render exactly as before.
export default function SchemeScope({ sectionId, as: Tag = 'div', style, className, children, ...rest }) {
  const ctx = useContext(SiteContext);
  // Stable unique scope id per <SchemeScope> instance so the emitted CSS
  // doesn't leak into other sections that share the same sectionId.
  const reactId = useId();
  const scopeId = useMemo(() => reactId.replace(/[^a-zA-Z0-9_-]/g, '_'), [reactId]);

  // Only treat a scheme as "applied to this section" when the merchant has
  // EXPLICITLY assigned a non-default scheme. Default scheme (or no
  // assignment) returns null here, which keeps the section pristine.
  const explicitScheme = useMemo(() => {
    if (ctx?.getExplicitSchemeForSection) return ctx.getExplicitSchemeForSection(sectionId);
    return null;
  }, [ctx, sectionId]);

  const overrides = useMemo(() => {
    if (ctx?.getOverridesForSection) return ctx.getOverridesForSection(sectionId);
    return null;
  }, [ctx, sectionId]);
  const hasOverrides = !!(overrides && Object.keys(overrides).length > 0);

  // Pristine state — no explicit scheme, no overrides — render unwrapped.
  // No wrapper div, no CSS injection. The browser uses the original
  // storefront stylesheet, identical to pre-feature behaviour.
  if (!explicitScheme && !hasOverrides) {
    return <>{children}</>;
  }

  // From here on the merchant has customised something, so we render the
  // wrapper + scoped CSS. Effective colours = explicit scheme as base
  // (may be null), per-section overrides on top.
  const effective = resolveSectionColors(explicitScheme, overrides);
  const scopedCss = (effective && Object.keys(effective).length > 0)
    ? buildScopedCSS(scopeId, sectionId, explicitScheme, overrides)
    : '';

  const cssVars = effectiveToCssVars(effective);
  const merged = { ...cssVars, ...(style || {}) };
  return (
    <Tag
      className={className}
      style={merged}
      data-flomerce-scope={scopeId}
      data-flomerce-scheme={explicitScheme?.id}
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
  // 10-slot expansion: emit the new scheme tokens so any
  // scheme-aware component (and the in-app preview chip) can read them.
  // We DO NOT alias these to the legacy --color-text-*, --color-border-*
  // CSS variables — those carry distinct hierarchy values
  // (#666 vs #888 for text; #ddd vs #eee vs #e0e0e0 for borders) that
  // give the classic template its depth. Collapsing them all to a single
  // scheme value washes out dividers and flattens text contrast, which
  // is exactly the regression the merchant flagged. The brand scheme
  // can still introduce the merchant's own colors via --scheme-* tokens
  // wherever components opt-in.
  if (eff.headingText) vars['--scheme-heading-text'] = eff.headingText;
  if (eff.mutedText)   vars['--scheme-muted-text']   = eff.mutedText;
  if (eff.border)      vars['--scheme-border']       = eff.border;
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
