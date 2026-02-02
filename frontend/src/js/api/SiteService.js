import { apiRequest, config } from './config.js';

class SiteService {
  async getUserSites() {
    try {
      const response = await apiRequest(config.endpoints.sites);
      return { success: true, sites: response.data || [] };
    } catch (error) {
      return { success: false, error: error.message, sites: [] };
    }
  }

  async getSite(siteId) {
    try {
      const response = await apiRequest(`${config.endpoints.sites}/${siteId}`);
      return { success: true, site: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createSite(siteData) {
    try {
      console.log('Sending site creation request:', siteData);
      const response = await apiRequest(config.endpoints.sites, {
        method: 'POST',
        body: JSON.stringify({
          brandName: siteData.brandName || siteData.siteName,
          category: siteData.category || 'general',
          categories: siteData.categories || [],
          templateId: siteData.templateId || 'template1',
          logoUrl: siteData.logoUrl,
          phone: siteData.phone,
          email: siteData.email,
          address: siteData.address,
          primaryColor: siteData.primaryColor,
          secondaryColor: siteData.secondaryColor,
          subdomain: siteData.subdomain // Ensure subdomain is passed if manually entered
        }),
      });

      console.log('Site creation response:', response);
      return { 
        success: true, 
        site: response.data,
        subdomain: response.data.subdomain 
      };
    } catch (error) {
      console.error('SiteService createSite error:', error);
      if (error.message && error.message.includes('already taken')) {
        return { success: false, error: 'This subdomain is already taken. Please choose a different name.' };
      }
      return { success: false, error: error.message || 'Failed to create website' };
    }
  }

  async updateSite(siteId, updates) {
    try {
      const response = await apiRequest(`${config.endpoints.sites}/${siteId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteSite(siteId) {
    try {
      const response = await apiRequest(`${config.endpoints.sites}/${siteId}`, {
        method: 'DELETE',
      });

      return { success: true, subdomain: response.data?.subdomain };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSiteBySubdomain(subdomain) {
    try {
      const response = await apiRequest(`/api/site?subdomain=${encodeURIComponent(subdomain)}`);
      return { success: true, site: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateSubdomain(brandName) {
    return brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
  }

  getSiteUrl(subdomain) {
    return `https://${subdomain}.fluxe.in`;
  }
}

export const siteService = new SiteService();
export default siteService;
