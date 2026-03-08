import React, { createContext, useState, useEffect } from 'react';

export const SiteContext = createContext(null);

function getSubdomain() {
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');

  if (hostname.endsWith('fluxe.in')) {
    if (hostParts.length >= 3 && hostParts[0] !== 'www') {
      return hostParts[0];
    }
  } else if (hostname.endsWith('pages.dev')) {
    if (hostParts.length >= 4) {
      return hostParts[0];
    }
  }

  const params = new URLSearchParams(window.location.search);
  const subdomainParam = params.get('subdomain');
  if (subdomainParam) return subdomainParam;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('replit')) {
    const stored = localStorage.getItem('dev_subdomain');
    if (stored) return stored;
    return params.get('subdomain') || null;
  }

  return null;
}

export function SiteProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    const detected = getSubdomain();
    setSubdomain(detected);

    if (!detected) {
      setError('No store detected. Please access via a store subdomain.');
      setLoading(false);
      return;
    }

    fetchSiteConfig(detected);
  }, []);

  async function fetchSiteConfig(sub) {
    try {
      setLoading(true);
      const apiBase = window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${apiBase}/api/site?subdomain=${encodeURIComponent(sub)}`);
      if (!response.ok) {
        throw new Error('Store not found');
      }
      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Invalid store data');
      }

      const data = result.data;
      const config = {
        id: data.id,
        subdomain: data.subdomain,
        brandName: data.brand_name,
        category: data.category,
        templateId: data.template_id,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
        primaryColor: data.primary_color || '#000000',
        secondaryColor: data.secondary_color || '#ffffff',
        phone: data.phone,
        email: data.email,
        address: data.address,
        socialLinks: data.socialLinks || {},
        settings: data.settings || {},
        categories: data.categories || [],
      };

      setSiteConfig(config);

      if (config.brandName) {
        document.title = config.brandName;
      }
      if (config.faviconUrl) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = config.faviconUrl;
        document.head.appendChild(link);
      }
    } catch (err) {
      console.error('Failed to load site config:', err);
      setError(err.message || 'Failed to load store');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteContext.Provider value={{ siteConfig, loading, error, subdomain, refetchSite: () => subdomain && fetchSiteConfig(subdomain) }}>
      {children}
    </SiteContext.Provider>
  );
}
