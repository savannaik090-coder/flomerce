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
    const rawOgImage = seoImage || ogImage || seo.og_image || seo.seo_og_image || '';
    const origin = window.location.origin;
    const absImg = (url) => url && !url.startsWith('http') ? origin + (url.startsWith('/') ? url : '/' + url) : url;
    const finalOgImage = absImg(rawOgImage);
    const finalTwImage = absImg(seo.twitter_image || rawOgImage);
    const canonicalUrl = origin + window.location.pathname;

    document.title = finalTitle;

    updateMetaTags({
      description: finalDescription,
      author: brandName,
      robots: seo.seo_robots || 'index, follow',
      ogTitle: seo.og_title || finalTitle,
      ogDescription: seo.og_description || finalDescription,
      ogImage: finalOgImage,
      ogType: seo.og_type || ogType || 'website',
      ogUrl: canonicalUrl,
      siteName: brandName,
      canonicalUrl,
      twitterCard: seo.twitter_card || 'summary_large_image',
      twitterTitle: seo.twitter_title || seo.og_title || finalTitle,
      twitterDescription: seo.twitter_description || seo.og_description || finalDescription,
      twitterImage: finalTwImage,
      twitterSite: seo.twitter_site || '',
    });
  }, [title, description, ogImage, ogType, seoOverrides, pageType, siteConfig]);
}
