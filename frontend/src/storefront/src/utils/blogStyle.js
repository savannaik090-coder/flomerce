import {
  BLOG_CLASSIC_STYLE_DEFAULTS,
  BLOG_MODERN_STYLE_DEFAULTS,
} from '../defaults/index.js';

export function getBlogStyleDefaults(isModern) {
  return isModern ? BLOG_MODERN_STYLE_DEFAULTS : BLOG_CLASSIC_STYLE_DEFAULTS;
}

// Returns ONLY the merchant-supplied overrides (no defaults merged in).
// This keeps CSS-variable fallbacks active for any field the merchant has
// not explicitly customized, so uncustomized storefronts render exactly
// as they did before this feature existed.
export function resolveBlogStyle(blogPage, isModern) {
  const saved = blogPage && (isModern ? blogPage.modern : blogPage.classic);
  return (saved && typeof saved === 'object') ? saved : {};
}

const VAR_MAP = {
  pageBg: '--blog-page-bg',
  pageHeadingFont: '--blog-page-heading-font',
  pageHeadingSize: '--blog-page-heading-size',
  pageHeadingWeight: '--blog-page-heading-weight',
  pageHeadingColor: '--blog-page-heading-color',
  subtitleColor: '--blog-subtitle-color',
  postTitleFont: '--blog-post-title-font',
  postTitleSize: '--blog-post-title-size',
  postTitleWeight: '--blog-post-title-weight',
  postTitleColor: '--blog-post-title-color',
  excerptFont: '--blog-excerpt-font',
  excerptSize: '--blog-excerpt-size',
  excerptColor: '--blog-excerpt-color',
  metaColor: '--blog-meta-color',
  dividerColor: '--blog-divider-color',
  linkColor: '--blog-link-color',
  cardBg: '--blog-card-bg',
  cardShadowColor: '--blog-card-shadow-color',
  postContentColor: '--blog-post-content-color',
};

// Only emit a CSS variable when the merchant has explicitly set a value.
// Unset keys leave blog.css's per-selector fallbacks in effect (which
// preserve the original theme tokens like --primary-color, --text-secondary
// and --border-color), so uncustomized output is pixel-equivalent to before.
export function buildBlogStyleVars(saved, _isModern) {
  const vars = {};
  if (!saved || typeof saved !== 'object') return vars;
  for (const [key, cssVar] of Object.entries(VAR_MAP)) {
    const v = saved[key];
    if (v !== undefined && v !== null && v !== '') vars[cssVar] = v;
  }
  return vars;
}
