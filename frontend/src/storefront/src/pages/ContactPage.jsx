import React, { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { useSEO } from '../hooks/useSEO.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { API_BASE } from '../config.js';
import PhoneInput from '../components/ui/PhoneInput.jsx';
import '../components/templates/modern/modern.css';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

function useContactForm(siteConfig) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch(`${API_BASE}/api/email/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: `${form.subject ? `Subject: ${form.subject}\n\n` : ''}${form.message}`,
          siteEmail: siteConfig?.email,
          brandName: siteConfig?.brandName,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return { form, setForm, status, submitting, handleChange, handleSubmit };
}

const CONTACT_SUBJECTS = [
  'Product Inquiry',
  'Order Support',
  'Customisation Request',
  'Wholesale & Bulk Orders',
  'Media & Press',
  'Other',
];

function ClassicContactPage({ overrides, settings, brandName, phone, email, address, socialLinks, form, setForm, status, submitting, handleChange, handleSubmit }) {
  const { translate: tx } = useShopperTranslation();

  // Effective values: per-page override > brand identity > hardcoded default
  const o = overrides || {};
  const GOLD      = o.accentColor  || settings.brandAccent      || '#d4af37';
  const GOLD_DARK = '#b8941f';
  const DEEP_BROWN = settings.brandPrimary || '#5E2900';
  const CREAM     = o.pageBg       || settings.brandBg          || '#f9f5f0';
  const PARCHMENT = '#ede5d8';
  const hFont     = o.headingFont  || settings.brandHeadingFont || "'Playfair Display', Georgia, serif";
  const bFont     = o.bodyFont     || settings.brandBodyFont    || "'Poppins', 'Helvetica Neue', sans-serif";

  const contactCards = [
    address && { icon: 'fas fa-map-marker-alt', label: tx('Visit Us'), value: address, href: null },
    phone   && { icon: 'fas fa-phone',          label: tx('Call Us'),  value: phone,   href: `tel:${phone}` },
    email   && { icon: 'fas fa-envelope',        label: tx('Write to Us'), value: email, href: `mailto:${email}` },
    phone   && { icon: 'fab fa-whatsapp',        label: tx('WhatsApp'), value: phone,   href: `https://wa.me/${phone.replace(/[^0-9]/g, '')}` },
  ].filter(Boolean);

  const hasSocial = socialLinks.instagram || socialLinks.facebook || socialLinks.twitter || socialLinks.youtube;

  return (
    <div style={{ background: CREAM, minHeight: '100vh', fontFamily: bFont, color: '#2a1500' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        .ccp-input, .ccp-select, .ccp-textarea {
          width: 100%; padding: 13px 16px;
          border: 1.5px solid ${PARCHMENT}; border-radius: 8px;
          font-size: 14px; font-family: ${bFont};
          background: #fff; color: #2a1500; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s; outline: none;
        }
        .ccp-input:focus, .ccp-select:focus, .ccp-textarea:focus {
          border-color: ${GOLD}; box-shadow: 0 0 0 3px ${GOLD}20;
        }
        .ccp-textarea { resize: vertical; min-height: 120px; }
        .ccp-select { appearance: none; -webkit-appearance: none; cursor: pointer; }

        .ccp-contact-card {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 18px 20px; background: #fff;
          border: 1px solid ${PARCHMENT}; border-left: 3px solid ${GOLD};
          border-radius: 8px; text-decoration: none;
          transition: box-shadow 0.2s, transform 0.2s; color: inherit;
        }
        .ccp-contact-card:hover {
          box-shadow: 0 4px 16px rgba(94,41,0,0.08); transform: translateY(-1px);
        }

        .ccp-social-btn {
          width: 42px; height: 42px; border-radius: 50%;
          border: 1.5px solid ${GOLD}; display: flex; align-items: center;
          justify-content: center; color: ${GOLD_DARK};
          background: #fff; text-decoration: none;
          transition: all 0.2s; font-size: 15px;
        }
        .ccp-social-btn:hover { background: ${GOLD}; color: #fff; transform: translateY(-2px); }

        .ccp-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 17px 28px;
          background: linear-gradient(135deg, ${DEEP_BROWN} 0%, #3a1800 100%);
          color: ${CREAM}; border: none; border-radius: 8px;
          font-family: ${bFont}; font-size: 15px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
        }
        .ccp-submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .ccp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ccp-hours-card {
          padding: 28px 24px; border: 1px solid rgba(212,175,55,0.2);
          border-radius: 10px; background: rgba(255,255,255,0.04);
          position: relative; overflow: hidden;
        }
        .ccp-hours-card::before {
          content: ''; position: absolute; top: 0; left: 0;
          width: 40px; height: 2px;
          background: linear-gradient(90deg, ${GOLD}, transparent);
        }

        @media (max-width: 900px) {
          .ccp-body-grid { grid-template-columns: 1fr !important; }
          .ccp-form-row  { grid-template-columns: 1fr !important; }
          .ccp-hours-grid { grid-template-columns: 1fr !important; }
          .ccp-form-card  { padding: 32px 24px !important; }
        }
      `}</style>

      {/* ── MAIN BODY ── */}
      <div
        className="ccp-body-grid"
        style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '72px 32px 80px',
          display: 'grid', gridTemplateColumns: '360px 1fr', gap: 56, alignItems: 'start',
        }}
      >
        {/* LEFT — Contact details + social */}
        <div>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DARK, marginBottom: 10 }}>
              <TranslatedText text="Get in Touch" />
            </div>
            <h2 style={{ fontFamily: hFont, fontSize: 32, fontWeight: 700, color: DEEP_BROWN, margin: '0 0 14px', lineHeight: 1.2 }}>
              <TranslatedText text="Our Details" />
            </h2>
            <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${GOLD}, transparent)`, borderRadius: 1 }} />
            <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.8, color: '#6b4c2a', fontWeight: 300 }}>
              <TranslatedText text="Have questions about our collections? We're just a message away." />
            </p>
          </div>

          {/* Contact cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contactCards.map((card, i) => (
              <a
                key={i}
                className="ccp-contact-card"
                href={card.href || '#'}
                target={card.href?.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${CREAM}, ${PARCHMENT})`,
                  border: `1px solid ${PARCHMENT}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: GOLD_DARK, fontSize: 15,
                }}>
                  <i className={card.icon} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a7a5a', marginBottom: 3 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 14, color: '#2a1500', fontWeight: 500 }}>{card.value}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Social links */}
          {hasSocial && (
            <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${PARCHMENT}` }}>
              <h3 style={{ fontFamily: hFont, fontSize: 19, color: DEEP_BROWN, margin: '0 0 16px' }}>
                <TranslatedText text="Follow Our Story" />
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                {socialLinks.facebook  && <a className="ccp-social-btn" href={socialLinks.facebook}  target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a>}
                {socialLinks.instagram && <a className="ccp-social-btn" href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram" /></a>}
                {socialLinks.twitter   && <a className="ccp-social-btn" href={socialLinks.twitter}   target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a>}
                {socialLinks.youtube   && <a className="ccp-social-btn" href={socialLinks.youtube}   target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube" /></a>}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Contact form card */}
        <div
          className="ccp-form-card"
          style={{
            background: '#fff', borderRadius: 12,
            padding: '48px 48px 44px',
            boxShadow: '0 4px 40px rgba(94,41,0,0.07)',
            border: `1px solid ${PARCHMENT}`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Gold top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_DARK}, ${GOLD})` }} />

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DARK, marginBottom: 8 }}>
              <TranslatedText text="Send a Message" />
            </div>
            <h2 style={{ fontFamily: hFont, fontSize: 30, color: DEEP_BROWN, margin: 0, lineHeight: 1.2 }}>
              <TranslatedText text="Tell Us How We Can Help" />
            </h2>
          </div>

          {status === 'success' && (
            <div style={{ padding: '14px 18px', borderRadius: 8, marginBottom: 22, background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', fontFamily: bFont }}>
              <i className="fas fa-check-circle" style={{ marginRight: 8 }} />
              <TranslatedText text="Your message has been sent successfully!" />
            </div>
          )}
          {status === 'error' && (
            <div style={{ padding: '14px 18px', borderRadius: 8, marginBottom: 22, background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', fontFamily: bFont }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
              <TranslatedText text="Something went wrong. Please try again." />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Name + Email */}
            <div className="ccp-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b4c2a' }}>
                  <TranslatedText text="Full Name" /> <span style={{ color: GOLD }}>*</span>
                </label>
                <input className="ccp-input" type="text" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b4c2a' }}>
                  <TranslatedText text="Email Address" /> <span style={{ color: GOLD }}>*</span>
                </label>
                <input className="ccp-input" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            {/* Row 2: Phone + Subject */}
            <div className="ccp-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b4c2a' }}>
                  <TranslatedText text="Phone Number" />
                </label>
                <PhoneInput value={form.phone} onChange={val => setForm(prev => ({ ...prev, phone: val }))} countryCode="IN" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b4c2a' }}>
                  <TranslatedText text="Subject" /> <span style={{ color: GOLD }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select className="ccp-select ccp-input" name="subject" value={form.subject} onChange={handleChange} required>
                    <option value="">{tx('Select a subject...')}</option>
                    {CONTACT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none', fontSize: 12 }} />
                </div>
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b4c2a' }}>
                <TranslatedText text="Message" /> <span style={{ color: GOLD }}>*</span>
              </label>
              <textarea className="ccp-textarea ccp-input" name="message" value={form.message} onChange={handleChange} required placeholder={tx('How can we help you?')} rows={5} />
            </div>

            <button type="submit" className="ccp-submit-btn" disabled={submitting}>
              <i className="fas fa-paper-plane" />
              {submitting ? <TranslatedText text="Sending..." /> : <TranslatedText text="Send Your Message" />}
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#9a7a5a' }}>
              <TranslatedText text="We typically reply within 1–2 business days." />
            </p>
          </form>
        </div>
      </div>

      {/* ── WORKING HOURS — Magazine Strip ── */}
      <section style={{ background: `linear-gradient(135deg, ${DEEP_BROWN} 0%, #3a1800 100%)`, padding: '64px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23d4af37' fill-opacity='0.06'/%3E%3C/svg%3E\")" }} />
        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 44 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', border: `1.5px solid rgba(212,175,55,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
              <i className="fas fa-clock" style={{ fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.7)', marginBottom: 4, fontWeight: 600 }}>
                <TranslatedText text="We're open" />
              </div>
              <h2 style={{ fontFamily: hFont, fontSize: 30, color: '#f9f5f0', margin: 0, lineHeight: 1.1 }}>
                <TranslatedText text="Working Hours" />
              </h2>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)', marginLeft: 12 }} />
          </div>

          {/* Hours grid */}
          <div className="ccp-hours-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[
              { days: tx('Monday – Friday'), time: '10:00 AM – 7:00 PM' },
              { days: tx('Saturday'),        time: '10:00 AM – 7:00 PM' },
              { days: tx('Sunday'),          time: '11:00 AM – 6:00 PM' },
            ].map((item, i) => (
              <div key={i} className="ccp-hours-card">
                <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.7)', marginBottom: 8, fontWeight: 600 }}>
                  {item.days}
                </div>
                <div style={{ fontFamily: hFont, fontSize: 20, color: '#f9f5f0', fontWeight: 500 }}>
                  {item.time}
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'rgba(249,245,240,0.4)', fontStyle: 'italic' }}>
            <TranslatedText text="Hours may vary on public holidays." />
          </p>
        </div>
      </section>
    </div>
  );
}

// Build inline CSS vars from the merchant's saved overrides for the Modern
// Contact page. Only fields that were explicitly set by the merchant emit a
// var — when a field is unset, the var is omitted so the fallback baked into
// modern.css (which equals the original hardcoded value, including distinct
// per-element body colors like #444 vs #666) takes over and the page renders
// byte-identically.
function buildModernStyleVars(overrides) {
  const map = {
    pageBg: '--contact-page-bg',
    headingFont: '--contact-heading-font',
    headingColor: '--contact-heading-color',
    bodyFont: '--contact-body-font',
    bodyColor: '--contact-body-color',
    accentColor: '--contact-accent-color',
    formBorderColor: '--contact-form-border-color',
  };
  const out = {};
  if (!overrides || typeof overrides !== 'object') return out;
  for (const [key, cssVar] of Object.entries(map)) {
    const v = overrides[key];
    if (v && typeof v === 'string' && v !== '') out[cssVar] = v;
  }
  return out;
}

function ModernContactPage({ overrides, brandName, phone, email, address, socialLinks, form, setForm, status, submitting, handleChange, handleSubmit }) {
  const { translate: tx } = useShopperTranslation();
  const styleVars = buildModernStyleVars(overrides);
  return (
    <div style={styleVars}>
      <section className="mn-contact-hero">
        <h1><TranslatedText text="Contact Us" /></h1>
        <p><TranslatedText text="Reach out to us for any inquiries. We'd love to hear from you." /></p>
      </section>

      <section className="mn-contact-section">
        <div className="mn-contact-container">
          <div className="mn-contact-info">
            <h2><TranslatedText text="Get in Touch" /></h2>
            <p><TranslatedText text="Have questions about our collections? We're here to help you discover what you're looking for." /></p>
            <ul className="mn-contact-details">
              {address && <li><i className="fas fa-map-marker-alt"></i><span>{address}</span></li>}
              {phone && <li><i className="fas fa-phone"></i><a href={`tel:${phone}`}>{phone}</a></li>}
              {email && <li><i className="fas fa-envelope"></i><a href={`mailto:${email}`}>{email}</a></li>}
              {phone && <li><i className="fab fa-whatsapp"></i><a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">{phone}</a></li>}
            </ul>
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.twitter || socialLinks.youtube) && (
              <div className="mn-contact-social">
                <h3><TranslatedText text="Follow Us" /></h3>
                <div className="mn-contact-social-icons">
                  {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>}
                  {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>}
                  {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>}
                  {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube"></i></a>}
                </div>
              </div>
            )}
          </div>

          <div className="mn-contact-form">
            <h2><TranslatedText text="Send Us a Message" /></h2>
            {status === 'success' && <div className="mn-contact-status success"><i className="fas fa-check-circle"></i> <TranslatedText text="Your message has been sent successfully!" /></div>}
            {status === 'error' && <div className="mn-contact-status error"><i className="fas fa-exclamation-circle"></i> <TranslatedText text="Something went wrong. Please try again." /></div>}
            <form onSubmit={handleSubmit}>
              <div className="mn-form-row">
                <div className="mn-form-group"><label><TranslatedText text="Full Name *" /></label><input type="text" name="name" value={form.name} onChange={handleChange} required /></div>
                <div className="mn-form-group"><label><TranslatedText text="Email Address *" /></label><input type="email" name="email" value={form.email} onChange={handleChange} required /></div>
              </div>
              <div className="mn-form-row">
                <div className="mn-form-group"><label><TranslatedText text="Phone Number" /></label><PhoneInput value={form.phone} onChange={val => setForm(prev => ({ ...prev, phone: val }))} countryCode="IN" /></div>
                <div className="mn-form-group"><label><TranslatedText text="Subject *" /></label><input type="text" name="subject" value={form.subject} onChange={handleChange} required /></div>
              </div>
              <div className="mn-form-group"><label><TranslatedText text="Message *" /></label><textarea name="message" value={form.message} onChange={handleChange} required placeholder={tx("How can we help you?")} /></div>
              <button type="submit" className="mn-contact-submit" disabled={submitting}>{submitting ? <TranslatedText text="Sending..." /> : <TranslatedText text="Send Message" />}</button>
            </form>
          </div>
        </div>
      </section>

      <section className="mn-working-hours">
        <h2><TranslatedText text="Working Hours" /></h2>
        <div className="mn-hours-grid">
          <div className="mn-hours-item"><h3><TranslatedText text="Monday - Saturday" /></h3><p><TranslatedText text="10:00 AM - 7:00 PM" /></p></div>
          <div className="mn-hours-item"><h3><TranslatedText text="Sunday" /></h3><p><TranslatedText text="11:00 AM - 6:00 PM" /></p></div>
        </div>
      </section>
    </div>
  );
}

export default function ContactPage() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useSiteConfig();
  const { isModern } = useTheme();
  useSEO({ title: tx("Contact Us"), pageType: 'contact' });
  const brandName = siteConfig?.brandName || 'Our Store';
  const phone = siteConfig?.phone || '';
  const email = siteConfig?.email || '';
  const address = siteConfig?.address || '';
  const socialLinks = siteConfig?.socialLinks || {};

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const contactPage = settings.contactPage || {};
  const overrides = isModern ? contactPage.modernStyle : contactPage.classicStyle;

  const { form, setForm, status, submitting, handleChange, handleSubmit } = useContactForm(siteConfig);

  const pageProps = { overrides, settings, brandName, phone, email, address, socialLinks, form, setForm, status, submitting, handleChange, handleSubmit };

  return isModern
    ? <ModernContactPage {...pageProps} />
    : <ClassicContactPage {...pageProps} />;
}
