import { apiRequest, config } from './config.js';

class CategoryService {
  async getCategories(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.siteId) params.append('siteId', options.siteId);
      if (options.subdomain) params.append('subdomain', options.subdomain);

      const queryString = params.toString();
      const url = queryString 
        ? `${config.endpoints.categories}?${queryString}`
        : config.endpoints.categories;

      const response = await apiRequest(url);
      return { success: true, categories: response.data || [] };
    } catch (error) {
      return { success: false, error: error.message, categories: [] };
    }
  }

  async getCategory(categoryId) {
    try {
      const response = await apiRequest(`${config.endpoints.categories}/${categoryId}`);
      return { success: true, category: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCategoryBySlug(siteId, slug) {
    try {
      const response = await apiRequest(`${config.endpoints.categories}?siteId=${siteId}&slug=${slug}`);
      const categories = this.flattenCategories(response.data || []);
      const category = categories.find(c => c.slug === slug);
      return category ? { success: true, category } : { success: false, error: 'Category not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await apiRequest(config.endpoints.categories, {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });

      return { success: true, category: response.data };
    } catch (error) {
      if (error.code === 'SLUG_EXISTS') {
        return { success: false, error: 'A category with this name already exists' };
      }
      return { success: false, error: error.message };
    }
  }

  async updateCategory(categoryId, updates) {
    try {
      const response = await apiRequest(`${config.endpoints.categories}/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteCategory(categoryId) {
    try {
      await apiRequest(`${config.endpoints.categories}/${categoryId}`, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async reorderCategories(siteId, categoryOrders) {
    const results = [];
    for (const { id, displayOrder } of categoryOrders) {
      const result = await this.updateCategory(id, { displayOrder });
      results.push({ id, success: result.success });
    }
    return { success: results.every(r => r.success), results };
  }

  flattenCategories(categories) {
    const flat = [];
    for (const category of categories) {
      flat.push(category);
      if (category.children && category.children.length > 0) {
        flat.push(...category.children);
      }
    }
    return flat;
  }

  buildCategoryTree(categories) {
    const rootCategories = categories.filter(c => !c.parent_id);
    return rootCategories.map(parent => ({
      ...parent,
      children: categories.filter(c => c.parent_id === parent.id),
    }));
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}

export const categoryService = new CategoryService();
export default categoryService;
