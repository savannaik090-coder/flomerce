import { apiRequest, config } from './config.js';

class ProductService {
  async getProducts(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.siteId) params.append('siteId', options.siteId);
      if (options.subdomain) params.append('subdomain', options.subdomain);
      if (options.category) params.append('category', options.category);
      if (options.featured) params.append('featured', 'true');
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const queryString = params.toString();
      const url = queryString 
        ? `${config.endpoints.products}?${queryString}`
        : config.endpoints.products;

      const response = await apiRequest(url);
      return { success: true, products: response.data || [] };
    } catch (error) {
      return { success: false, error: error.message, products: [] };
    }
  }

  async getProduct(productId) {
    try {
      const response = await apiRequest(`${config.endpoints.products}/${productId}`);
      return { success: true, product: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getProductBySlug(siteId, slug) {
    try {
      const response = await apiRequest(`${config.endpoints.products}?siteId=${siteId}&slug=${slug}`);
      const products = response.data || [];
      const product = products.find(p => p.slug === slug);
      return product ? { success: true, product } : { success: false, error: 'Product not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createProduct(productData) {
    try {
      const response = await apiRequest(config.endpoints.products, {
        method: 'POST',
        body: JSON.stringify(productData),
      });

      return { success: true, product: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProduct(productId, updates) {
    try {
      const response = await apiRequest(`${config.endpoints.products}/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteProduct(productId) {
    try {
      await apiRequest(`${config.endpoints.products}/${productId}`, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateStock(productId, stock) {
    return this.updateProduct(productId, { stock });
  }

  async updatePrice(productId, price, comparePrice = null) {
    const updates = { price };
    if (comparePrice !== null) {
      updates.comparePrice = comparePrice;
    }
    return this.updateProduct(productId, updates);
  }

  async toggleFeatured(productId, isFeatured) {
    return this.updateProduct(productId, { isFeatured });
  }

  async getProductsByCategory(siteId, categorySlug) {
    return this.getProducts({ siteId, category: categorySlug });
  }

  async getFeaturedProducts(siteId, limit = 10) {
    return this.getProducts({ siteId, featured: true, limit });
  }

  async searchProducts(siteId, query) {
    try {
      const { products } = await this.getProducts({ siteId, limit: 100 });
      
      const searchTerms = query.toLowerCase().split(' ');
      const filtered = products.filter(product => {
        const searchText = `${product.name} ${product.description || ''} ${product.tags?.join(' ') || ''}`.toLowerCase();
        return searchTerms.every(term => searchText.includes(term));
      });
      
      return { success: true, products: filtered };
    } catch (error) {
      return { success: false, error: error.message, products: [] };
    }
  }
}

export const productService = new ProductService();
export default productService;
