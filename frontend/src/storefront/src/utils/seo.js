function setOrCreateMeta(property, content, type = 'property') {
  const attr = type === 'name' ? 'name' : 'property';
  let tag = document.querySelector(`meta[${attr}="${property}"]`);
  if (!content) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function updateMetaTags(tags) {
  setOrCreateMeta('description', tags.description || '', 'name');
  setOrCreateMeta('author', tags.author || '', 'name');
  setOrCreateMeta('robots', tags.robots || '', 'name');

  setOrCreateMeta('og:title', tags.ogTitle || '');
  setOrCreateMeta('og:description', tags.ogDescription || '');
  setOrCreateMeta('og:image', tags.ogImage || '');
  setOrCreateMeta('og:type', tags.ogType || '');
  setOrCreateMeta('og:url', tags.ogUrl || '');
  setOrCreateMeta('og:site_name', tags.siteName || '');

  setOrCreateMeta('twitter:card', tags.ogTitle ? 'summary_large_image' : '', 'name');
  setOrCreateMeta('twitter:title', tags.ogTitle || '', 'name');
  setOrCreateMeta('twitter:description', tags.ogDescription || '', 'name');
  setOrCreateMeta('twitter:image', tags.ogImage || '', 'name');

  let link = document.querySelector('link[rel="canonical"]');
  if (tags.canonicalUrl) {
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', tags.canonicalUrl);
  } else if (link) {
    link.remove();
  }
}
