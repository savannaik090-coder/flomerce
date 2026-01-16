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
   * @param {Object} siteData - Details of the site (name, category, etc).
   */
  async createSite(uid, siteData) {
    const subdomain = siteData.siteName.toLowerCase().replace(/\s+/g, '-');
    return this.db.collection('sites').add({
      ...siteData,
      ownerId: uid,
      subdomain,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
