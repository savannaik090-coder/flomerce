
class RazorpayService {
  constructor() {
    this.keyId = 'rzp_test_qZWULE2MoPHZJv'; // From env config provided in logs
  }

  async createOrder(planId, billingCycle, customAmount) {
    const amountMap = {
      'basic': { monthly: 9900, '6months': 49900, yearly: 89900 },
      'premium': { monthly: 29900, '6months': 149900, yearly: 249900 },
      'pro': { monthly: 99900, '6months': 499900, yearly: 899900 }
    };
    
    // In a real app, this would be a backend call.
    const amount = (customAmount * 100) || amountMap[planId][billingCycle];
    return { amount, currency: 'INR', receipt: `receipt_${Date.now()}` };
  }

  loadRazorpay() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async openCheckout(options) {
    const loaded = await this.loadRazorpay();
    if (!loaded) throw new Error('Razorpay SDK failed to load');

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: this.keyId,
        amount: options.amount,
        currency: options.currency,
        name: 'Kreavo',
        description: `${options.planName} Plan - ${options.billingCycle}`,
        handler: function (response) {
          resolve(response);
        },
        prefill: {
          name: options.userName,
          email: options.userEmail
        },
        theme: {
          color: '#2563eb'
        }
      });
      rzp.open();
    });
  }
}

export const razorpayService = new RazorpayService();
