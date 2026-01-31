import { apiRequest, config } from './config.js';

class OrderService {
  async getOrders(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.siteId) params.append('siteId', options.siteId);
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const queryString = params.toString();
      const url = queryString 
        ? `${config.endpoints.orders}?${queryString}`
        : config.endpoints.orders;

      const response = await apiRequest(url);
      return { success: true, orders: response.data || [] };
    } catch (error) {
      return { success: false, error: error.message, orders: [] };
    }
  }

  async getOrder(orderId) {
    try {
      const response = await apiRequest(`${config.endpoints.orders}/${orderId}`);
      return { success: true, order: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createOrder(orderData) {
    try {
      const response = await apiRequest(config.endpoints.orders, {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      return { 
        success: true, 
        order: response.data,
        orderNumber: response.data?.orderNumber 
      };
    } catch (error) {
      if (error.code === 'INSUFFICIENT_STOCK') {
        return { success: false, error: 'Some items in your cart are out of stock' };
      }
      return { success: false, error: error.message };
    }
  }

  async createGuestOrder(orderData) {
    try {
      const response = await apiRequest(`${config.endpoints.orders}/guest`, {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      return { 
        success: true, 
        order: response.data,
        orderNumber: response.data?.orderNumber 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateOrderStatus(orderId, status, trackingInfo = {}) {
    try {
      const response = await apiRequest(`${config.endpoints.orders}/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status, 
          trackingNumber: trackingInfo.trackingNumber,
          carrier: trackingInfo.carrier,
        }),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async trackOrder(orderNumber) {
    try {
      const response = await apiRequest(`${config.endpoints.orders}/${orderNumber}/track`);
      return { success: true, tracking: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getGuestOrder(orderNumber) {
    try {
      const response = await apiRequest(`${config.endpoints.orders}/${orderNumber}/guest`);
      return { success: true, order: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getOrderStatusLabel(status) {
    const labels = {
      pending: 'Order Placed',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
      refunded: 'Refunded',
    };
    return labels[status] || status;
  }

  getOrderStatusColor(status) {
    const colors = {
      pending: '#FFA500',
      confirmed: '#4169E1',
      processing: '#9370DB',
      shipped: '#00CED1',
      out_for_delivery: '#32CD32',
      delivered: '#228B22',
      cancelled: '#DC143C',
      returned: '#FF6347',
      refunded: '#808080',
    };
    return colors[status] || '#000000';
  }
}

export const orderService = new OrderService();
export default orderService;
