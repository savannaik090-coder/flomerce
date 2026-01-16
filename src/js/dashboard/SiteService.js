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
    const subdomain = siteData.siteName.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Check for duplicate subdomain (case-insensitive and trimmed)
    const snapshot = await this.db.collection('sites').get();
    const isDuplicate = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.subdomain === subdomain;
    });

    if (isDuplicate) {
      throw new Error(`The name "${siteData.siteName}" is already taken. Please choose another.`);
    }

    const siteUrl = `https://${subdomain}.kreavo.in`;
    return this.db.collection('sites').add({
      ...siteData,
      siteName: siteData.siteName.trim(),
      ownerId: uid,
      subdomain,
      siteUrl,
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
