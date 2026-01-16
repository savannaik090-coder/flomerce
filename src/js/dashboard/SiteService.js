/**
 * @file SiteService.js
 * @description Manages business website data in Firestore.
 * @module SiteService
 */

class SiteService {
  constructor() {
    this.db = firebase.firestore();
  }

  /**
   * Fetches all websites belonging to a specific user.
   * @param {string} uid - The Firebase User ID.
   * @returns {Promise<Array>} Array of site objects.
   */
  async getUserSites(uid) {
    const snapshot = await this.db.collection('sites').where('ownerId', '==', uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Creates a new website entry for a user.
   * @param {string} uid - Owner User ID.
   * @param {Object} siteData - Details of the site (name, category, templateId, etc).
   */
  async createSite(uid, siteData) {
    const siteName = siteData.siteName.trim();
    // Normalize subdomain to be alphanumeric with hyphens
    const subdomain = siteName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    if (!subdomain) {
      throw new Error("Invalid website name. Please use letters and numbers.");
    }

    // Check for duplicate subdomain using a transaction for absolute atomicity
    return this.db.runTransaction(async (transaction) => {
      // Query specifically for the normalized subdomain across ALL sites
      const sitesRef = this.db.collection('sites');
      const existingQuery = sitesRef.where('subdomain', '==', subdomain);
      const snapshot = await transaction.get(existingQuery);
      
      if (!snapshot.empty) {
        throw new Error(`The URL "${subdomain}.kreavo.in" is already taken. Please choose a different name.`);
      }

      const siteUrl = `https://${subdomain}.kreavo.in`;
      const newSiteRef = sitesRef.doc();
      
      const finalData = {
        ...siteData,
        siteName: siteName,
        ownerId: uid,
        subdomain: subdomain,
        siteUrl: siteUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(newSiteRef, finalData);
      return { id: newSiteRef.id, subdomain: subdomain };
    });
  }

  /**
   * Deletes a website entry.
   * @param {string} siteId - Document ID in Firestore.
   */
  async deleteSite(siteId) {
    return this.db.collection('sites').doc(siteId).delete();
  }
}

export const siteService = new SiteService();
