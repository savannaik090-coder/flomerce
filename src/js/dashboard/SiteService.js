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
    const subdomain = siteName.toLowerCase().replace(/\s+/g, '-');
    
    // Check for duplicate subdomain using a transaction for atomicity
    return this.db.runTransaction(async (transaction) => {
      const existingQuery = this.db.collection('sites').where('subdomain', '==', subdomain);
      const snapshot = await transaction.get(existingQuery);
      
      if (!snapshot.empty) {
        throw new Error(`The name "${siteName}" is already taken. Please choose another.`);
      }

      const siteUrl = `https://${subdomain}.kreavo.in`;
      const newSiteRef = this.db.collection('sites').doc();
      
      transaction.set(newSiteRef, {
        ...siteData,
        siteName: siteName,
        ownerId: uid,
        subdomain: subdomain,
        siteUrl: siteUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return newSiteRef;
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
