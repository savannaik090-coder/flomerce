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
    const subdomain = siteName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    if (!subdomain) {
      throw new Error("Invalid website name. Please use letters and numbers.");
    }

    const subdomainRegistryRef = this.db.collection('subdomains').doc(subdomain);
    const sitesRef = this.db.collection('sites');

    console.log(`[SiteService] Creating site: ${siteName} (${subdomain})`);

    // Use a top-level try-catch to ensure we capture the actual error
    try {
      // Return the result of runTransaction directly
      const transactionResult = await this.db.runTransaction(async (transaction) => {
        const subdomainDoc = await transaction.get(subdomainRegistryRef);
        
        if (subdomainDoc.exists) {
          throw new Error(`The URL "${subdomain}.fluxe.in" is already taken.`);
        }

        // Claim in registry
        transaction.set(subdomainRegistryRef, {
          ownerId: uid,
          siteName: siteName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Create site record
        const siteUrl = `https://${subdomain}.fluxe.in`;
        const newSiteRef = sitesRef.doc();
        
        transaction.set(newSiteRef, {
          ...siteData,
          siteName: siteName,
          brandName: siteData.brandName || siteName,
          logoUrl: siteData.logoUrl || '',
          ownerId: uid,
          subdomain: subdomain,
          siteUrl: siteUrl,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // This object MUST be returned from the transaction block
        return { 
          id: newSiteRef.id, 
          subdomain: subdomain 
        };
      });
      
      console.log("[SiteService] Transaction Result:", transactionResult);
      
      // Explicitly return the result to the caller
      if (!transactionResult || !transactionResult.subdomain) {
         console.error("[SiteService] Transaction completed but returned no subdomain data");
         throw new Error("Internal Error: Subdomain registry failed.");
      }
      
      return transactionResult;
    } catch (error) {
      console.error("[SiteService] Critical Creation Error:", error);
      throw error;
    }
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
