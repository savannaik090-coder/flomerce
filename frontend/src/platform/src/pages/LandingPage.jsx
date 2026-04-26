import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import LandingPricing from '../components/LandingPricing.jsx';
import ContactForm from '../components/ContactForm.jsx';
import '../styles/landing.css';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, SUPPORT_EMAIL } from '../config.js';

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const ICONS = {
  themes: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>),
  customizer: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/></svg>),
  currency: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>),
  translate: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14"/><path d="M9 5v3"/><path d="M11 19l4-9 4 9"/><path d="M12 17h6"/><path d="M5 12c2 4 5 6 8 6"/></svg>),
  accounts: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  variants: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  orders: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>),
  payments: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>),
  invoicing: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>),
  cart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l2.7 12.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.4L22 7H6"/><path d="M16 3l3 3-3 3"/></svg>),
  inventory: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/></svg>),
  transfers: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h13l-3-3"/><path d="M21 17H8l3 3"/></svg>),
  shipping: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>),
  domain: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>),
  staff: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>),
  push: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>),
  whatsapp: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3.6-7.2L21 3l-1.8 3.8A9 9 0 0 1 21 12z"/><path d="M8 12c0 2.5 1.5 4 4 4l1-1c-.5-.5-1-1-1-2 0-1 .5-1.5 1-2l-1-1c-2.5 0-4 1.5-4 2z"/></svg>),
  discounts: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12L12 4H4v8l8 8z"/><circle cx="8" cy="8" r="1.5"/><path d="M9 15l6-6"/></svg>),
  seo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>),
  reviews: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 6.5 7 1-5 4.8 1.2 7-6.2-3.4L5.8 21 7 14.3 2 9.5l7-1z"/></svg>),
  analytics: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></svg>),
  conversion: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9-6-18-3 9H2"/></svg>),
  reports: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>),
  geography: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  attribution: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8 8l4 8M16 8l-4 8"/></svg>),
};

const FEATURE_CATEGORIES = [
  { key: 'storefront', items: ['themes', 'customizer', 'currency', 'translate', 'accounts'] },
  { key: 'selling', items: ['variants', 'orders', 'payments', 'invoicing', 'cart'] },
  { key: 'operations', items: ['inventory', 'transfers', 'shipping', 'domain', 'staff'] },
  { key: 'marketing', items: ['push', 'whatsapp', 'discounts', 'seo', 'reviews'] },
  { key: 'insights', items: ['analytics', 'conversion', 'reports', 'geography', 'attribution'] },
];

const PARTNER_KEYS = ['razorpay', 'stripe', 'shiprocket', 'whatsapp', 'translator', 'gsc'];

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [showPwa, setShowPwa] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [heroVideoLoaded, setHeroVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const heroVideoRef = useRef(null);
  const deferredPromptRef = useRef(null);

  useScrollReveal();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setTimeout(() => setShowPwa(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const tryPlay = () => {
      vid.play().then(() => setVideoPlaying(true)).catch(() => {});
    };
    if (vid.readyState >= 2) tryPlay();
    else vid.addEventListener('canplay', tryPlay, { once: true });
  }, []);

  useEffect(() => {
    const vid = heroVideoRef.current;
    if (!vid) return;
    const onLoaded = () => setHeroVideoLoaded(true);
    const tryPlay = () => {
      vid.play().then(() => setHeroVideoLoaded(true)).catch(() => {});
    };
    if (vid.readyState >= 2) {
      onLoaded();
      tryPlay();
    } else {
      vid.addEventListener('loadeddata', onLoaded, { once: true });
      vid.addEventListener('canplay', tryPlay, { once: true });
    }
    return () => {
      vid.removeEventListener('loadeddata', onLoaded);
      vid.removeEventListener('canplay', tryPlay);
    };
  }, []);

  const handlePlayVideo = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().then(() => setVideoPlaying(true)).catch(() => {});
  }, []);

  const scrollToDemo = useCallback((e) => {
    e.preventDefault();
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    setShowPwa(false);
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
  };

  return (
    <>
      <div className="container landing-page">
        <div className="landing-bg-wrap" aria-hidden="true">
          <div className="landing-bg-glow" />
          <div className="landing-bg-grid" />
        </div>
        <Navbar showMenu={true} />

        <section className="hero hero--video">
          <div className="hero-video-wrap" aria-hidden="true">
            <div
              className="hero-video-poster"
              style={{ opacity: heroVideoLoaded ? 0 : 1 }}
            />
            <video
              ref={heroVideoRef}
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/images/storefront-preview.jpg"
              style={{ opacity: heroVideoLoaded ? 1 : 0 }}
            >
              <source src="/api/upload/video?key=VID_20260331_002038.mp4" type="video/mp4" />
            </video>
            <div className="hero-video-fade" />
          </div>

          <div className="hero-content hero-content--center reveal">
            <div className="hero-badge hero-badge--onvideo">{t('heroBadge')}</div>
            <h1>
              {t('heroTitleLine1')} <span className="hero-accent">{t('heroTitleLine2')}</span> {t('heroTitleLine3')}
            </h1>
            <p className="hero-desc">{t('heroDesc')}</p>
            <div className="hero-buttons hero-buttons--center">
              <Link to="/signup" className="btn btn-hero-primary">
                {t('heroCtaPrimary')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <a href="#demo" className="btn btn-hero-ghost" onClick={scrollToDemo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {t('heroCtaSecondary')}
              </a>
            </div>
            <ul className="hero-trust hero-trust--center">
              <li>{t('heroTrust.rating')}</li>
              <li className="hero-trust-sep" aria-hidden="true">·</li>
              <li>{t('heroTrust.noCard')}</li>
              <li className="hero-trust-sep" aria-hidden="true">·</li>
              <li>{t('heroTrust.cancel')}</li>
            </ul>
          </div>
        </section>

        <section className="trusted-strip reveal" aria-label={t('trustedTitle')}>
          <span className="trusted-pill">{t('trustedPill')}</span>
          <h3 className="trusted-title">{t('trustedTitle')}</h3>
          <ul className="trusted-logos">
            {PARTNER_KEYS.map((p) => (
              <li key={p} className="trusted-logo">{t(`trustedPartners.${p}`)}</li>
            ))}
          </ul>
        </section>

        <section id="demo" className="landing-section demo-section reveal">
          <div className="section-header">
            <span className="section-pill">{t('demoPill')}</span>
            <h2>{t('demoTitle')}</h2>
            <p>{t('demoSubtitle')}</p>
          </div>
          <div className="demo-wrapper">
            <div className="demo-frame">
              <div className="demo-frame-bar">
                <div className="demo-dots">
                  <span className="demo-dot red" />
                  <span className="demo-dot yellow" />
                  <span className="demo-dot green" />
                </div>
                <span className="demo-url">{PLATFORM_DOMAIN}</span>
                <span className="demo-bar-spacer" />
              </div>
              <div className="demo-video-container">
                <video ref={videoRef} className="demo-video" muted loop playsInline preload="metadata">
                  <source src="/api/upload/video?key=VID_20260331_002038.mp4" type="video/mp4" />
                </video>
                {!videoPlaying && (
                  <button className="demo-play-btn" onClick={handlePlayVideo} aria-label={t('playVideo')}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section features-section reveal">
          <div className="section-header">
            <span className="section-pill">{t('featuresPill')}</span>
            <h2>{t('featuresTitle')}</h2>
            <p>{t('featuresSubtitle')}</p>
          </div>
          <div className="features-categories">
            {FEATURE_CATEGORIES.map((cat) => (
              <div key={cat.key} className="feature-category">
                <div className="feature-cat-head">
                  <span className="feature-cat-label">{t(`features.categories.${cat.key}.label`)}</span>
                  <p className="feature-cat-intro">{t(`features.categories.${cat.key}.intro`)}</p>
                </div>
                <div className="feature-cards">
                  {cat.items.map((item) => (
                    <div key={item} className="feature-card">
                      <div className="feature-icon-wrap">{ICONS[item]}</div>
                      <h4>{t(`features.categories.${cat.key}.items.${item}.title`)}</h4>
                      <p>{t(`features.categories.${cat.key}.items.${item}.desc`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section reveal">
          <div className="section-header">
            <span className="section-pill">{t('pricingPill')}</span>
            <h2>{t('pricingTitle')}</h2>
            <p>{t('pricingSubtitle')}</p>
          </div>
          <LandingPricing />
        </section>

        <section id="contact" className="landing-section reveal">
          <ContactForm />
        </section>

        <footer className="landing-footer">
          <div className="footer-top">
            <div className="footer-brand">
              <img src="/assets/images/flomerce-logo.png" alt={t('logoAlt')} className="footer-logo" />
              <p>{t('footerTagline')}</p>
            </div>
            <div className="footer-links-group">
              <h4>{t('footerCompany')}</h4>
              <Link to="/about">{t('footerAbout')}</Link>
              <Link to="/terms">{t('footerTerms')}</Link>
              <Link to="/privacy-policy">{t('footerPrivacy')}</Link>
              <Link to="/refund-policy">{t('footerRefund')}</Link>
              <Link to="/shipping-policy">{t('footerShipping')}</Link>
            </div>
            <div className="footer-links-group">
              <h4>{t('footerContact')}</h4>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <a href="tel:+919901954610">+91 9901954610</a>
              <span>{t('footerAddress')}</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Flomerce. {t('rightsReserved')}</p>
          </div>
        </footer>
      </div>

      <div className={`pwa-install-bar${showPwa ? ' show' : ''}`}>
        <div className="pwa-info">
          <img src="/assets/images/flomerce-logo.png" alt={t('logoAlt')} className="pwa-logo" />
          <div className="pwa-text">
            <h4>{t('pwaInstallTitle')}</h4>
            <p>{t('pwaInstallDesc')}</p>
          </div>
        </div>
        <div className="pwa-actions">
          <button className="btn-install" onClick={handleInstall}>{t('pwaInstall')}</button>
          <button className="btn-close-pwa" onClick={() => setShowPwa(false)}>&times;</button>
        </div>
      </div>
    </>
  );
}
