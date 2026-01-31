class SiteService {
  constructor() {
    this.apiBase = '/api';
  }

  async getAuthToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Not authenticated');
    }
    return token;
  }

  async createSite(userId, siteData) {
    const { siteName, category, templateId, categories } = siteData;
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.apiBase}/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        siteName,
        category,
        templateId,
        categories: categories || []
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create site');
    }

    return await response.json();
  }

  async getUserSites(userId) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.apiBase}/sites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sites');
    }

    const data = await response.json();
    return data.sites || [];
  }

  async deleteSite(siteId) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.apiBase}/sites/${siteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete site');
    }

    return await response.json();
  }

  async updateSite(siteId, updates) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.apiBase}/sites/${siteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update site');
    }

    return await response.json();
  }
}

export const siteService = new SiteService();
