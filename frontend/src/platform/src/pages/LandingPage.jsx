import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import LandingPricing from '../components/LandingPricing.jsx';
import ContactForm from '../components/ContactForm.jsx';
import '../styles/landing.css';
import '../styles/legal.css';
import { SUPPORT_EMAIL } from '../config.js';

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

const FEATURE_CATEGORIES = [
  { key: 'storefront', accent: 'rose',    items: ['themes', 'currency', 'accounts'] },
  { key: 'selling',    accent: 'emerald', items: ['payments', 'invoicing', 'variants'] },
  { key: 'operations', accent: 'blue',    items: ['inventory', 'shipping', 'staff'] },
  { key: 'marketing',  accent: 'orange',  items: ['whatsapp', 'push', 'reviews'] },
  { key: 'insights',   accent: 'violet',  items: ['analytics', 'reports', 'attribution'] },
];

const CATEGORY_ICONS = {
  storefront: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>),
  selling:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>),
  operations: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4"/><path d="M12 11v10"/></svg>),
  marketing:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3.6-7.2L21 3l-1.8 3.8A9 9 0 0 1 21 12z"/><path d="M8 12c0 2.5 1.5 4 4 4"/></svg>),
  insights:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></svg>),
};

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

function FeatureMock({ kind, t }) {
  if (kind === 'storefront') {
    return (
      <div className="fmock fmock--storefront">
        <div className="fmock-store">
          <div className="fmock-store-bar">
            <div className="fmock-store-dot" />
            <span className="fmock-store-brand">{t('featureMocks.storefrontBrand')}</span>
            <div className="fmock-store-pills">
              <span /><span /><span />
            </div>
          </div>
          <div className="fmock-store-hero">
            <span className="fmock-store-tag">{t('featureMocks.storefrontTag')}</span>
          </div>
          <div className="fmock-store-grid">
            <div /><div /><div />
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'selling') {
    return (
      <div className="fmock fmock--selling">
        <div className="fmock-receipt">
          <div className="fmock-receipt-head">
            <div className="fmock-receipt-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            </div>
            <div className="fmock-receipt-meta">
              <span className="fmock-receipt-id">{t('featureMocks.orderId')}</span>
              <span className="fmock-receipt-status">{t('featureMocks.orderStatus')}</span>
            </div>
          </div>
          <div className="fmock-receipt-rows">
            <div className="fmock-receipt-row"><span className="fmock-bar fmock-bar--lg" /><span className="fmock-amt">{t('featureMocks.orderItem1Amount')}</span></div>
            <div className="fmock-receipt-row"><span className="fmock-bar fmock-bar--md" /><span className="fmock-amt">{t('featureMocks.orderItem2Amount')}</span></div>
          </div>
          <div className="fmock-receipt-total">
            <span>{t('featureMocks.orderTotal')}</span>
            <strong>{t('featureMocks.orderTotalAmount')}</strong>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'operations') {
    return (
      <div className="fmock fmock--operations">
        <div className="fmock-board">
          <div className="fmock-board-head">
            <span className="fmock-board-title">{t('featureMocks.inventoryHeading')}</span>
            <span className="fmock-board-filter">{t('featureMocks.inventoryFilter')}</span>
          </div>
          {[24, 36, 48].map((n) => (
            <div key={n} className="fmock-board-row">
              <span className="fmock-board-thumb" />
              <span className="fmock-board-bars">
                <span className="fmock-bar fmock-bar--lg" />
                <span className="fmock-bar fmock-bar--sm" />
              </span>
              <span className="fmock-board-count">{n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === 'marketing') {
    return (
      <div className="fmock fmock--marketing">
        <div className="fmock-promo">
          <div className="fmock-promo-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div className="fmock-promo-text">
            <strong>{t('featureMocks.promoTitle')}</strong>
            <span>{t('featureMocks.promoDesc')}</span>
          </div>
        </div>
        <div className="fmock-chat">
          <div className="fmock-bubble fmock-bubble--in">
            <span className="fmock-bar fmock-bar--lg" />
            <span className="fmock-bar fmock-bar--md" />
          </div>
          <div className="fmock-bubble fmock-bubble--out">
            <span className="fmock-bar fmock-bar--lg" />
            <span className="fmock-bar fmock-bar--sm" />
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'insights') {
    return (
      <div className="fmock fmock--insights">
        <div className="fmock-dash-row">
          <div className="fmock-dash-card fmock-dash-card--main">
            <span className="fmock-dash-label">{t('featureMocks.dashRevenueLabel')}</span>
            <strong className="fmock-dash-value">{t('featureMocks.dashRevenueValue')}</strong>
            <div className="fmock-dash-bars">
              {[40, 62, 32, 78, 50, 92, 70].map((h, i) => (
                <span key={i} className={`fmock-dash-bar${i === 5 ? ' is-peak' : ''}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="fmock-dash-card fmock-dash-card--side">
            <span className="fmock-dash-label">{t('featureMocks.dashVisitorsLabel')}</span>
            <strong className="fmock-dash-value">{t('featureMocks.dashVisitorsValue')}</strong>
            <span className="fmock-dash-trend">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              {t('featureMocks.dashTrend')}
            </span>
          </div>
        </div>
        <div className="fmock-dash-meter">
          <div className="fmock-dash-meter-head">
            <span>{t('featureMocks.dashMobileLabel')}</span>
            <strong>{t('featureMocks.dashMobileValue')}</strong>
          </div>
          <div className="fmock-dash-meter-track"><div className="fmock-dash-meter-fill" /></div>
        </div>
      </div>
    );
  }
  return null;
}

const PARTNER_KEYS = ['razorpay', 'stripe', 'shiprocket', 'whatsapp', 'translator', 'gsc'];

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [showPwa, setShowPwa] = useState(false);
  const [heroVideoLoaded, setHeroVideoLoaded] = useState(false);
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
    const vid = heroVideoRef.current;
    if (!vid) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      try {
        vid.removeAttribute('autoplay');
        vid.pause();
      } catch {}
      return;
    }
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
            <video
              ref={heroVideoRef}
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{ opacity: heroVideoLoaded ? 1 : 0 }}
            >
              <source src="/api/upload/video?key=VID_20260331_002038.mp4" type="video/mp4" />
            </video>
            <div className="hero-video-fade" />
          </div>

          <div className="hero-content hero-content--center reveal">
            <div className="hero-badge hero-badge--onvideo hero-badge--price">{t('heroBadgePrice')}</div>
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

        <section id="features" className="landing-section features-section reveal">
          <div className="section-header section-header--features">
            <span className="section-pill">{t('featuresPill')}</span>
            <h2 className="features-title">
              {t('featuresTitleLine1')}{' '}
              <span className="features-title-accent">{t('featuresTitleAccent')}</span>
              {t('featuresTitleLine2') ? <> {t('featuresTitleLine2')}</> : null}
            </h2>
            <p>{t('featuresSubtitle')}</p>
          </div>
          <div className="features-vrow-wrap">
            <div className="features-vrow">
              {FEATURE_CATEGORIES.map((cat) => (
                <article key={cat.key} className={`feature-vcard feature-vcard--${cat.accent}`}>
                  <div className="feature-vcard__visual">
                    <FeatureMock kind={cat.key} t={t} />
                  </div>
                  <div className="feature-vcard__body">
                    <div className="feature-vcard__eyebrow">
                      <span className="feature-vcard__eyebrow-ico" aria-hidden="true">{CATEGORY_ICONS[cat.key]}</span>
                      {t(`features.categories.${cat.key}.label`)}
                    </div>
                    <h3 className="feature-vcard__headline">{t(`features.categories.${cat.key}.intro`)}</h3>
                    <ul className="feature-vcard__bullets">
                      {cat.items.map((item) => (
                        <li key={item}>
                          <span className="feature-vcard__check" aria-hidden="true">{CHECK_ICON}</span>
                          {t(`features.categories.${cat.key}.items.${item}.title`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            <div className="features-vrow-fade" aria-hidden="true" />
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
