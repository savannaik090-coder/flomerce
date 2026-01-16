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
  /**
   * Creates a new website entry for a user.
   * Uses a dedicated 'subdomains' collection with document ID = subdomain
   * to guarantee absolute uniqueness at the database level.
   * @param {string} uid - Owner User ID.
   * @param {Object} siteData - Details of the site (name, category, templateId, etc).
   */
  async createSite(uid, siteData) {
    const siteName = siteData.siteName.trim();
    // Normalize subdomain: lowercase, alphanumeric, hyphens only
    const subdomain = siteName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    if (!subdomain) {
      throw new Error("Invalid website name. Please use letters and numbers.");
    }

    // Reference to the global 'subdomains' registry
    const subdomainRegistryRef = this.db.collection('subdomains').doc(subdomain);
    const sitesRef = this.db.collection('sites');

    console.log(`[SiteService] Attempting to create site: ${siteName} (${subdomain})`);

    // Use a transaction to ensure we claim the subdomain AND create the site record together
    return this.db.runTransaction(async (transaction) => {
      // 1. Check if subdomain is already claimed
      const subdomainDoc = await transaction.get(subdomainRegistryRef);
      
      if (subdomainDoc.exists) {
        console.warn(`[SiteService] Subdomain collision: ${subdomain}`);
        throw new Error(`The URL "${subdomain}.kreavo.in" is already taken. Please choose a different name.`);
      }

      // 2. Claim the subdomain in the registry
      transaction.set(subdomainRegistryRef, {
        ownerId: uid,
        siteName: siteName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 3. Create the actual site record
      const siteUrl = `https://${subdomain}.kreavo.in`;
      const newSiteRef = sitesRef.doc();
      
      const finalSiteData = {
        ...siteData,
        siteName: siteName,
        ownerId: uid,
        subdomain: subdomain,
        siteUrl: siteUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(newSiteRef, finalSiteData);
      console.log(`[SiteService] Site created successfully: ${newSiteRef.id}`);

      return { id: newSiteRef.id, subdomain: subdomain };
    });
  }

  /**
   * Deletes a website entry.
   * @param {string} siteId - Document ID in Firestore.
   */
  /**
   * Deletes a website entry.
   * @param {string} siteId - Document ID in Firestore.
   */
  async deleteSite(siteId) {
    console.log(`[SiteService] Attempting to delete site: ${siteId}`);
    const siteDoc = await this.db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      console.warn(`[SiteService] Site not found for deletion: ${siteId}`);
      return;
    }
    
    const siteData = siteDoc.data();
    const subdomain = siteData.subdomain;

    const batch = this.db.batch();
    // 1. Delete from sites collection
    batch.delete(this.db.collection('sites').doc(siteId));
    
    // 2. Release the subdomain from the registry
    if (subdomain) {
      console.log(`[SiteService] Releasing subdomain: ${subdomain}`);
      batch.delete(this.db.collection('subdomains').doc(subdomain));
    }
    
    await batch.commit();
    console.log(`[SiteService] Site and subdomain deleted successfully.`);
  }
}

export const siteService = new SiteService();
