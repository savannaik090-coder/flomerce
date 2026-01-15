import firebaseConfig from '../auth/firebase-config.js';

class SiteService {
  constructor() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.db = firebase.firestore();
  }

  async createSite(userId, siteData) {
    const { siteName, category, templateId } = siteData;
    const subdomain = siteName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existing = await this.db.collection('websites').where('subdomain', '==', subdomain).get();
    if (!existing.empty) {
      throw new Error("Subdomain already taken. Try another name.");
    }
    const docRef = await this.db.collection('websites').add({
      userId, siteName, category, subdomain, templateId,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      settings: {
        title: siteName,
        description: `Professional ${category} website created on Kreavo.`,
        contactEmail: '', phoneNumber: ''
      }
    });
    return { id: docRef.id, subdomain };
  }

  async getUserSites(userId) {
    const snapshot = await this.db.collection('websites')
      .where('userId', '==', userId)
      .get();
    
    // Sort manually to avoid index requirement for now
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate() || 0;
        const dateB = b.createdAt?.toDate() || 0;
        return dateB - dateA;
      });
  }

  async deleteSite(siteId) {
    await this.db.collection('websites').doc(siteId).delete();
  }
}

export const siteService = new SiteService();
