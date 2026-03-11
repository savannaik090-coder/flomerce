import React, { useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';

const getDefaultSections = (brand, email, phone) => [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing and placing an order with ${brand}, you confirm that you are in agreement with and bound by these Terms and Conditions. These terms apply to the entire website and any email or other type of communication between you and ${brand}.`,
  },
  {
    title: '2. Products and Pricing',
    content: `All products are subject to availability. We reserve the right to discontinue any product at any time.\nPrices are listed in Indian Rupees (INR) and are subject to change without notice.\nWe make every effort to display accurate product descriptions and images, but we do not warrant that product descriptions are accurate, complete, or current.`,
  },
  {
    title: '3. Orders and Payment',
    content: `By placing an order, you offer to purchase a product subject to these terms. We reserve the right to refuse or cancel any order at our discretion.\nPayment must be received before orders are processed. We accept payments via Razorpay (credit/debit cards, UPI, net banking) and Cash on Delivery (where available).`,
  },
  {
    title: '4. Shipping and Delivery',
    content: `Delivery times are estimates only and may vary. We are not responsible for delays caused by courier services or unforeseen circumstances.\nRisk of loss and title pass to you upon delivery to the carrier. We are not liable for any loss, theft, or damage during transit.`,
  },
  {
    title: '5. Returns and Refunds',
    content: `We want you to be completely satisfied with your purchase. If you are not satisfied, you may return eligible items within 7 days of delivery.\nItems must be unused, in original packaging, and accompanied by the original receipt.\nRefunds will be processed within 5-7 business days after we receive and inspect the returned item.\nCustom or personalized items may not be eligible for return.`,
  },
  {
    title: '6. Intellectual Property',
    content: `All content on this website, including text, graphics, logos, images, and software, is the property of ${brand} and is protected by applicable intellectual property laws.\nYou may not reproduce, distribute, or create derivative works without our express written permission.`,
  },
  {
    title: '7. User Accounts',
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use of your account.`,
  },
  {
    title: '8. Limitation of Liability',
    content: `To the fullest extent permitted by law, ${brand} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or products.\nOur total liability shall not exceed the amount paid by you for the specific product giving rise to the claim.`,
  },
  {
    title: '9. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in the location of our registered office.`,
  },
  {
    title: '10. Contact Information',
    content: `For any questions regarding these Terms and Conditions, please contact us at ${email}${phone ? ` or ${phone}` : ''}.`,
  },
];

const getDefaultIntro = (brand) =>
  `Please read these Terms and Conditions carefully before using ${brand}'s website and services. By accessing or using our service, you agree to be bound by these terms.`;

export default function TermsPage() {
  const { siteConfig } = useContext(SiteContext);
  const brand = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';

  const termsContent = siteConfig?.settings?.termsContent;
  const hasCustomContent = termsContent && Array.isArray(termsContent.sections) && termsContent.sections.length > 0;

  const intro = hasCustomContent && termsContent.intro
    ? termsContent.intro.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone)
    : getDefaultIntro(brand);

  const sections = hasCustomContent
    ? termsContent.sections.map(s => ({
        title: s.title.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
        content: s.content.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
      }))
    : getDefaultSections(brand, email, phone);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto 80px', padding: '0 20px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms & Conditions</h1>
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
