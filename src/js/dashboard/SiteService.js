/**
 * @file SiteService.js
 * @description Manages business website data via Cloudflare API.
 * @module SiteService
 */

class SiteService {
  constructor() {
    this.apiBase = '/api/sites';
  }

  /**
   * Fetches all websites belonging to a specific user.
   * @param {string} uid - The User ID.
   * @returns {Promise<Array>} Array of site objects.
   */
  async getUserSites(uid) {
    try {
      const response = await fetch(this.apiBase);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch sites');
      
      const sites = result || [];
      window.dispatchEvent(new CustomEvent('sitesLoaded', { detail: { count: sites.length } }));
      return sites;
    } catch (error) {
      console.error("[SiteService] Fetch Error:", error);
      throw error;
    }
  }

  /**
   * Creates a new website entry for a user.
   * @param {string} uid - Owner User ID.
   * @param {Object} siteData - Details of the site.
   */
  async createSite(uid, siteData) {
    try {
      const response = await fetch(this.apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...siteData, userId: uid })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create site');
      return result;
    } catch (error) {
      console.error("[SiteService] Creation Error:", error);
      throw error;
    }
  }

  /**
   * Deletes a website entry.
   * @param {string} siteId - Document ID.
   */
  async deleteSite(siteId) {
    try {
      const response = await fetch(`${this.apiBase}/${siteId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete site');
      }
    } catch (error) {
      console.error("[SiteService] Deletion Error:", error);
      throw error;
    }
  }
}

export const siteService = new SiteService();
