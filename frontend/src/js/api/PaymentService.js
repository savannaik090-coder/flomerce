import { apiRequest, config } from './config.js';

class PaymentService {
  constructor() {
    this.razorpayLoaded = false;
  }

  async loadRazorpay() {
    if (this.razorpayLoaded) return true;

    return new Promise((resolve) => {
      if (window.Razorpay) {
        this.razorpayLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        this.razorpayLoaded = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async createPaymentOrder(amount, options = {}) {
    try {
      const response = await apiRequest(`${config.endpoints.payments}/create-order`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          currency: options.currency || 'INR',
          receipt: options.receipt,
          notes: options.notes,
          orderId: options.orderId,
          type: options.type || 'order',
        }),
      });

      return { success: true, order: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(paymentData, planId = null, billingCycle = null) {
    try {
      const response = await apiRequest(`${config.endpoints.payments}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          planId,
          billingCycle
        }),
      });

      return { 
        success: response.data?.verified === true,
        error: response.message
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initiatePayment(amount, options = {}) {
    const loaded = await this.loadRazorpay();
    if (!loaded) {
      return { success: false, error: 'Failed to load payment gateway' };
    }

    const orderResult = await this.createPaymentOrder(amount, options);
    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    return new Promise((resolve) => {
      const razorpayOptions = {
        key: orderResult.order.keyId,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        name: options.brandName || 'Store',
        description: options.description || 'Order Payment',
        order_id: orderResult.order.orderId,
        prefill: {
          name: options.customerName || '',
          email: options.customerEmail || '',
          contact: options.customerPhone || '',
        },
        theme: {
          color: options.themeColor || '#000000',
        },
        handler: async (response) => {
          const verifyResult = await this.verifyPayment(response, options.orderId);
          resolve({
            success: verifyResult.success,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            resolve({ success: false, error: 'Payment cancelled by user' });
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    });
  }

  async createSubscriptionOrder(planId, billingCycle) {
    try {
      const response = await apiRequest(`${config.endpoints.payments}/subscription`, {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle }),
      });

      return { success: true, order: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initiateSubscriptionPayment(planId, billingCycle, options = {}) {
    const loaded = await this.loadRazorpay();
    if (!loaded) {
      return { success: false, error: 'Failed to load payment gateway' };
    }

    const orderResult = await this.createSubscriptionOrder(planId, billingCycle);
    if (!orderResult.success) {
      return { success: false, error: orderResult.error };
    }

    return new Promise((resolve) => {
      const razorpayOptions = {
        key: orderResult.order.keyId,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        name: 'SaaS Platform',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${billingCycle}`,
        order_id: orderResult.order.orderId,
        prefill: {
          name: options.userName || '',
          email: options.userEmail || '',
        },
        theme: {
          color: '#000000',
        },
        handler: async (response) => {
          const verifyResult = await this.verifyPayment(response, planId, billingCycle);
          resolve({
            success: verifyResult.success,
            error: verifyResult.error || 'Payment verification failed',
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            planId,
            billingCycle,
          });
        },
        modal: {
          ondismiss: () => {
            resolve({ success: false, error: 'Payment cancelled by user' });
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    });
  }

  async getSubscription() {
    try {
      const response = await apiRequest(`${config.endpoints.payments}/subscription`);
      return { success: true, subscription: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getPlans() {
    return {
      basic: {
        name: 'Basic',
        features: ['1 Website', 'Basic Templates', 'Email Support'],
        prices: { monthly: 99, '6months': 499, yearly: 899 },
      },
      premium: {
        name: 'Premium',
        features: ['3 Websites', 'All Templates', 'Priority Support', 'Analytics'],
        prices: { monthly: 299, '6months': 1499, yearly: 2499 },
      },
      pro: {
        name: 'Pro',
        features: ['Unlimited Websites', 'All Templates', '24/7 Support', 'Analytics', 'Custom Domain'],
        prices: { monthly: 999, '6months': 4999, yearly: 8999 },
      },
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
