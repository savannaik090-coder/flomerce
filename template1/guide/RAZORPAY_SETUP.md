# Razorpay Payment Setup & Limits

## Understanding Your Payment Errors

### Error 1: "Currency is not supported"
**Root Cause:** This error occurs when your Razorpay account is not enabled for international payments but receives a payment request with a non-INR currency code.

**Current Status:** ✅ **Already Fixed** - The system has always been sending `currency: 'INR'` to Razorpay. The currency converter on your site only changes the display for users; all cart calculations and payments are processed in INR.

**Why it appeared:** This may have been a temporary issue or misconfiguration. The code is now verified to always send INR.

### Error 2: "Amount exceeds maximum amount allowed" ⚠️ **ACTION REQUIRED**

**Root Cause:** Your Razorpay account has a transaction limit that is lower than ₹1,40,000.

**Understanding Your Current Limits:**

| Payment Type | Default Maximum | Notes |
|-------------|-----------------|-------|
| **Standard Transactions** | **₹5,00,000 (₹5 lakhs)** | Can be increased by request |
| **New/Unverified Accounts** | **₹50,000** | Common initial limit |
| **UPI Payments** | **₹1,00,000** | Per transaction |
| **Netbanking Recurring** | **₹10,00,000 (₹10 lakhs)** | |

## How to Increase Your Razorpay Payment Limit

Follow these steps to request a limit increase for your Razorpay account:

### Step-by-Step Process:

1. **Log in to Razorpay Dashboard**
   - Visit: https://dashboard.razorpay.com/
   - Sign in with your credentials

2. **Navigate to Transaction Limits**
   - Go to **Settings** (gear icon)
   - Click on **Account & Settings**
   - Under "Payment and Refund" section, find **Transaction Limits**

3. **Request Limit Increase**
   - Click the **edit icon** next to the limit field
   - Choose whether you need to increase:
     - Domestic transaction limit
     - International transaction limit

4. **Provide Required Information**
   - **Required Limit:** Enter your desired maximum amount (e.g., ₹10,00,000)
   - **Justification:** Explain why you need this limit (minimum 100 words)
     - Example: "Our jewelry business regularly processes orders ranging from ₹50,000 to ₹2,00,000. We need to increase our transaction limit to ₹10,00,000 to accommodate large bulk orders and premium product purchases. Our average order value is ₹1,40,000, and we process approximately 10-15 such orders per month."
   - **Upload Invoice:** Attach a sample invoice or proof of business (PNG, JPG, or PDF)
     - Can be a previous invoice, pro forma invoice, or business document

5. **Submit and Wait for Review**
   - Click **Submit**
   - Razorpay team will review your request (usually 1-3 business days)
   - They may contact you via email, WhatsApp, SMS, or Dashboard for clarifications

### Tips for Faster Approval:

- Provide detailed, genuine business justification
- Upload clear, professional invoices
- Have your business documents ready (if requested)
- Respond quickly to any follow-up questions

## Current System Status

Your payment system:
- ✅ Already sends all amounts in INR to Razorpay (always has)
- ✅ Currency converter only affects display, not payment processing
- ✅ Cart items are stored in INR (base currency)
- ✅ Enhanced error messages help identify limit issues
- ⚠️ **Requires:** Razorpay limit increase to process orders above your current limit

## What's Actually Happening

1. **User Browsing:** Customers can view prices in USD, EUR, GBP, etc.
2. **Adding to Cart:** Products are stored with their INR prices (₹25,000, ₹1,40,000, etc.)
3. **Checkout:** Total is calculated in INR from stored prices
4. **Payment:** Razorpay receives the amount in INR (exactly as stored)
5. **Your Issue:** ₹1,40,000 exceeds your account's transaction limit

**The currency converter has nothing to do with the payment error.**

## Testing Recommendations

After increasing your Razorpay limit:

1. Test with a small amount first (₹100-₹500)
2. Then test with a medium amount (₹10,000-₹50,000)
3. Finally test with larger amounts (₹1,00,000+)
4. Try different payment methods (Card, UPI, NetBanking)

## Need Help?

- **Razorpay Support:** https://razorpay.com/support/
- **Documentation:** https://razorpay.com/docs/
- **Contact:** support@razorpay.com
