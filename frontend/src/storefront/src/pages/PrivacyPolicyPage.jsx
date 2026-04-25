import React, { useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import { getPrivacyDefaults } from '../defaults/index.js';
import TranslatedText from '../components/TranslatedText.jsx';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

export default function PrivacyPolicyPage() {
  const { enabled: translationOn } = useShopperTranslation();
  const { siteConfig } = useContext(SiteContext);
  useSEO({ title: "Privacy Policy", pageType: 'privacy' });
  const brand = siteConfig?.brandName || siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';

  const privacyContent = siteConfig?.settings?.privacyContent;
  const hasCustomContent = privacyContent && Array.isArray(privacyContent.sections) && privacyContent.sections.length > 0;
  const defaults = getPrivacyDefaults(brand, email, phone);

  const intro = hasCustomContent && privacyContent.intro
    ? privacyContent.intro.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone)
    : defaults.intro;

  const sections = hasCustomContent
    ? privacyContent.sections.map(s => ({
        title: s.title,
        content: s.content.replace(/\{brand\}/g, brand).replace(/\{email\}/g, email).replace(/\{phone\}/g, phone),
      }))
    : defaults.sections;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto 80px', padding: '0 20px', fontFamily: 'inherit' }}>
      {translationOn && (
        <div
          role="note"
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#78350f',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <TranslatedText text="For accuracy, our Privacy Policy is shown only in English. Automatic translation may be misleading or incorrect." />
        </div>
      )}

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>{`Last updated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`}</p>

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
