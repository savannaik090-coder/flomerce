export function injectSEOTags(html, tags) {
  let result = html;

  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(tags.title)}</title>`);

  const metaTags = buildMetaTagsString(tags);

  result = result.replace('</head>', `${metaTags}\n</head>`);

  return result;
}

function buildMetaTagsString(tags) {
  const lines = [];

  if (tags.description) {
    lines.push(`  <meta name="description" content="${escapeAttr(tags.description)}">`);
  }

  if (tags.keywords) {
    lines.push(`  <meta name="keywords" content="${escapeAttr(tags.keywords)}">`);
  }

  if (tags.author) {
    lines.push(`  <meta name="author" content="${escapeAttr(tags.author)}">`);
  }

  lines.push(`  <meta name="robots" content="${escapeAttr(tags.robots || 'index, follow')}">`);

  lines.push(`  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);

  if (tags.canonicalUrl) {
    lines.push(`  <link rel="canonical" href="${escapeAttr(tags.canonicalUrl)}">`);
  }

  if (tags.favicon) {
    lines.push(`  <link rel="icon" type="image/png" href="${escapeAttr(tags.favicon)}">`);
  }

  lines.push(`  <meta property="og:type" content="${escapeAttr(tags.ogType || 'website')}">`);
  lines.push(`  <meta property="og:site_name" content="${escapeAttr(tags.siteName || '')}">`);

  if (tags.title) {
    lines.push(`  <meta property="og:title" content="${escapeAttr(tags.ogTitle || tags.title)}">`);
  }

  if (tags.description) {
    lines.push(`  <meta property="og:description" content="${escapeAttr(tags.ogDescription || tags.description)}">`);
  }

  if (tags.ogImage) {
    lines.push(`  <meta property="og:image" content="${escapeAttr(tags.ogImage)}">`);
    lines.push(`  <meta property="og:image:width" content="1200">`);
    lines.push(`  <meta property="og:image:height" content="630">`);
  }

  if (tags.canonicalUrl) {
    lines.push(`  <meta property="og:url" content="${escapeAttr(tags.canonicalUrl)}">`);
  }

  lines.push(`  <meta name="twitter:card" content="${escapeAttr(tags.twitterCard || 'summary_large_image')}">`);

  if (tags.twitterSite) {
    lines.push(`  <meta name="twitter:site" content="${escapeAttr(tags.twitterSite)}">`);
  }

  if (tags.twitterTitle || tags.title) {
    lines.push(`  <meta name="twitter:title" content="${escapeAttr(tags.twitterTitle || tags.ogTitle || tags.title)}">`);
  }

  if (tags.twitterDescription || tags.description) {
    lines.push(`  <meta name="twitter:description" content="${escapeAttr(tags.twitterDescription || tags.ogDescription || tags.description)}">`);
  }

  if (tags.twitterImage || tags.ogImage) {
    lines.push(`  <meta name="twitter:image" content="${escapeAttr(tags.twitterImage || tags.ogImage)}">`);
  }

  if (tags.googleVerification) {
    lines.push(`  <meta name="google-site-verification" content="${escapeAttr(tags.googleVerification)}">`);
  }

  if (tags.structuredData && tags.structuredData.length > 0) {
    for (const schema of tags.structuredData) {
      lines.push(`  <script type="application/ld+json">${schema}</script>`);
    }
  }

  return lines.join('\n');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
