import { useEffect, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { updateMetaTags } from '../utils/seo.js';

export function useSEO({ title, description, ogImage, ogType, seoOverrides, pageType } = {}) {
  const { siteConfig } = useContext(SiteContext);

  useEffect(() => {
    if (!siteConfig) return;

    const seo = siteConfig.seo || {};
    const brandName = siteConfig.brandName || '';

    const pageSEO = pageType ? (siteConfig.pageSEO?.[pageType] || {}) : {};

    const resolvedOverrides = seoOverrides || pageSEO;
    const seoTitle = resolvedOverrides?.seo_title;
    const seoDesc = resolvedOverrides?.seo_description;
    const seoImage = resolvedOverrides?.seo_og_image;

    let finalTitle;
    if (seoTitle) {
      finalTitle = seoTitle;
    } else if (title) {
      finalTitle = `${title} | ${brandName}`;
    } else {
      finalTitle = seo.seo_title || `${brandName} | Fluxe Store`;
    }

    const finalDescription = seoDesc || description || seo.seo_description || '';
    const finalOgImage = seoImage || ogImage || seo.seo_og_image || '';
    const canonicalUrl = window.location.origin + window.location.pathname;

    document.title = finalTitle;

    updateMetaTags({
      description: finalDescription,
      author: brandName,
      robots: seo.seo_robots || 'index, follow',
      ogTitle: finalTitle,
      ogDescription: finalDescription,
      ogImage: finalOgImage,
      ogType: ogType || 'website',
      ogUrl: canonicalUrl,
      siteName: brandName,
      canonicalUrl,
    });
  }, [title, description, ogImage, ogType, seoOverrides, pageType, siteConfig]);
}
