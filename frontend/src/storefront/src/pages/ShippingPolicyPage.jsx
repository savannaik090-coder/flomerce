import React, { useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';

const getDefaultSections = (brand, email, phone) => [
  {
    title: '1. Shipping Coverage',
    content: `${brand} ships across India and select international destinations. We aim to make our products accessible to customers everywhere.\nShipping availability may vary based on location, product type, and local regulations.`,
  },
  {
    title: '2. Processing Time',
    content: `Orders are processed within 1-3 business days after payment confirmation.\nDuring sales, festivals, or promotional events, processing may take an additional 1-2 business days due to high order volumes.\nYou will receive an email with tracking details once your order has been dispatched.`,
  },
  {
    title: '3. Delivery Timeframes',
    content: `Standard Delivery: 5-7 business days within India.\nExpress Delivery: 2-3 business days (where available, additional charges may apply).\nInternational Shipping: 10-21 business days depending on destination.\nPlease note that delivery times are estimates and may vary due to unforeseen circumstances.`,
  },
  {
    title: '4. Shipping Charges',
    content: `Free shipping is available on orders above a specified amount (check the cart page for details).\nStandard shipping charges apply for orders below the free shipping threshold.\nInternational shipping charges are calculated at checkout based on weight and destination.\nExpress delivery charges are additional and displayed at checkout.`,
  },
  {
    title: '5. Order Tracking',
    content: `Once your order is shipped, you will receive a confirmation email with tracking information.\nYou can track your order status through the tracking link provided or by visiting the Order Track section on our website.\nFor any issues with tracking, please contact our support team.`,
  },
  {
    title: '6. Delivery Issues',
    content: `If your package arrives damaged or has missing items, please contact us within 48 hours of delivery with photos of the damaged package.\nIf your order has not arrived within the estimated delivery time, please reach out to us and we will investigate with the courier partner.\n${brand} is not responsible for delays caused by courier services, customs clearance, or incorrect address provided by the customer.`,
  },
  {
    title: '7. Undeliverable Packages',
    content: `If a package is returned to us due to an incorrect address, failed delivery attempts, or refusal by the recipient, we will contact you to arrange re-shipment.\nAdditional shipping charges may apply for re-shipment.\nPlease ensure your shipping address and contact details are accurate at the time of placing the order.`,
  },
  {
    title: '8. Contact Us',
    content: `For any shipping-related queries, please contact us at ${email}${phone ? ` or ${phone}` : ''}.\nOur support team is available to assist you with any concerns regarding your shipment.`,
  },
];

const getDefaultIntro = (brand) =>
  `At ${brand}, we strive to deliver your orders safely and on time. Please review our shipping policy below to understand our shipping methods, delivery timeframes, and related information.`;

export default function ShippingPolicyPage() {
  const { siteConfig } = useContext(SiteContext);
  const brand = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';

  const shippingContent = siteConfig?.settings?.shippingContent;
  const hasCustomContent = shippingContent && Array.isArray(shippingContent.sections) && shippingContent.sections.length > 0;

  const intro = hasCustomContent && shippingContent.intro
    ? shippingContent.intro.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone)
    : getDefaultIntro(brand);

  const sections = hasCustomContent
    ? shippingContent.sections.map(s => ({
        title: s.title.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
        content: s.content.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
      }))
    : getDefaultSections(brand, email, phone);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto 80px', padding: '0 20px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Shipping Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div style={{ lineHeight: 1.8, color: '#374151' }}>
        <p style={{ marginBottom: 24 }}>{intro}</p>

        {sections.map((section, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>{section.title}</h2>
            <p style={{ whiteSpace: 'pre-line', color: '#374151' }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
