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

const INDUSTRY_TILES = [
  { key: 'fashion', accent: 'rose' },
  { key: 'beauty',  accent: 'violet' },
  { key: 'general', accent: 'emerald' },
];

const INDUSTRY_ICONS = {
  jewellery: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12"/><path d="M13 3l3 6-4 12"/><path d="M2 9h20"/></svg>),
  fashion:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4l-2 2-2 1-2-1-2-2-5 4 3 4 2-1v11h8V11l2 1 3-4z"/></svg>),
  beauty:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M5 16l.7 1.5L7 18l-1.3.5L5 20l-.7-1.5L3 18l1.3-.5z"/></svg>),
  general:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>),
};

const ARROW_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const STAR_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l3 6.5 7 .9-5.1 4.7 1.4 7.1L12 17.8 5.7 21.2 7.1 14.1 2 9.4l7-.9z"/>
  </svg>
);

function PhoneJewelleryMock({ t }) {
  return (
    <div className="industry-phone" aria-hidden="true">
      <div className="industry-phone-notch" />
      <div className="industry-phone-screen">
        <div className="industry-phone-status">
          <span>9:41</span>
          <span className="industry-phone-status-icons">
            <span className="ipsi-signal" />
            <span className="ipsi-wifi" />
            <span className="ipsi-batt" />
          </span>
        </div>
        <div className="industry-phone-store">
          <div className="ips-bar">
            <span className="ips-brand">{t('industries.jewellery.brand')}</span>
            <span className="ips-icons" aria-hidden="true">
              <span className="ips-ico" />
              <span className="ips-ico" />
              <span className="ips-ico" />
            </span>
          </div>
          <div className="ips-banner">
            <span className="ips-banner-eyebrow">{t('industries.jewellery.bannerEyebrow')}</span>
            <span className="ips-banner-title">{t('industries.jewellery.bannerTitle')}</span>
          </div>
          <div className="ips-grid">
            <div className="ips-tile ips-tile--gold"><span className="ips-badge">BIS</span></div>
            <div className="ips-tile ips-tile--rose" />
            <div className="ips-tile ips-tile--amber" />
            <div className="ips-tile ips-tile--blush" />
          </div>
          <div className="ips-product">
            <div className="ips-product-name">{t('industries.jewellery.productName')}</div>
            <div className="ips-product-row">
              <span className="ips-product-price">{t('industries.jewellery.productPrice')}</span>
              <span className="ips-product-emi">{t('industries.jewellery.productEmi')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustryTileMock({ kind, t }) {
  if (kind === 'fashion') {
    return (
      <div className="itile-mock itile-mock--fashion" aria-hidden="true">
        <div className="itm-card">
          <div className="itm-card-banner"><span>{t('industries.fashion.mockBanner')}</span></div>
          <div className="itm-card-body">
            <div className="itm-card-row">
              <span className="itm-card-name">{t('industries.fashion.mockProduct')}</span>
              <span className="itm-card-price">{t('industries.fashion.mockPrice')}</span>
            </div>
            <div className="itm-swatches">
              <span className="itm-swatch itm-swatch--rose" />
              <span className="itm-swatch itm-swatch--emerald" />
              <span className="itm-swatch itm-swatch--ink" />
              <span className="itm-swatch itm-swatch--amber" />
            </div>
            <div className="itm-sizes">
              <span className="itm-size">XS</span>
              <span className="itm-size itm-size--active">S</span>
              <span className="itm-size">M</span>
              <span className="itm-size">L</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'beauty') {
    return (
      <div className="itile-mock itile-mock--beauty" aria-hidden="true">
        <div className="itm-card">
          <div className="itm-card-bar">
            <span>{t('industries.beauty.mockBrand')}</span>
            <span>SHOP</span>
          </div>
          <div className="itm-card-body">
            <div className="itm-beauty-hero">
              <div className="itm-beauty-bottle" />
              <span className="itm-beauty-tag">NEW</span>
            </div>
            <div className="itm-card-name">{t('industries.beauty.mockProduct')}</div>
            <div className="itm-card-row">
              <span className="itm-stars">★★★★★</span>
              <span className="itm-card-price">{t('industries.beauty.mockPrice')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'general') {
    return (
      <div className="itile-mock itile-mock--general" aria-hidden="true">
        <div className="itm-card">
          <div className="itm-card-bar itm-card-bar--general">
            <span>{t('industries.general.mockBrand')}</span>
            <span>FREE SHIP</span>
          </div>
          <div className="itm-general-grid">
            <div className="itm-gen-cell itm-gen-cell--em" />
            <div className="itm-gen-cell itm-gen-cell--or" />
            <div className="itm-gen-cell itm-gen-cell--bl" />
            <div className="itm-gen-cell itm-gen-cell--pk" />
            <div className="itm-gen-cell itm-gen-cell--vi" />
            <div className="itm-gen-cell itm-gen-cell--am" />
          </div>
        </div>
      </div>
    );
  }
  return null;
}

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
              <source src="/api/upload/video?key=flomerce-video%2Ffluxe-teaser%20(2).mp4" type="video/mp4" />
            </video>
            <div className="hero-video-fade" />
          </div>

          <div className="hero-content hero-content--center reveal">
            <div className="hero-badge hero-badge--onvideo hero-badge--price">{t('heroBadgePrice')}</div>
            <div className="hero-badge hero-badge--onvideo hero-badge--fee">{t('heroBadgeFee')}</div>
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

        <section id="industries" className="landing-section industry-section" aria-label={t('industries.titleAccent')}>
          <div className="industry-shell">
          <div className="industry-shell-glow" aria-hidden="true" />
          <div className="industry-shell-inner">
          <div className="section-header">
            <span className="section-pill">{t('industries.pill')}</span>
            <h2 className="industry-headline">
              {t('industries.titleLine1')}{' '}
              <span className="industry-headline-accent">{t('industries.titleAccent')}</span>
            </h2>
            <p>{t('industries.subtitle')}</p>
          </div>

          <div className="industry-spotlight">
            <div className="industry-spotlight-glow" aria-hidden="true" />
            <div className="industry-spotlight-grid">
              <div className="industry-spotlight-copy">
                <span className="industry-spotlight-featured">
                  <span className="industry-star" aria-hidden="true">{STAR_ICON}</span>
                  {t('industries.spotlight.featured')}
                </span>
                <span className="industry-spotlight-eyebrow">
                  <span className="industry-spotlight-eyebrow-ico" aria-hidden="true">{INDUSTRY_ICONS.jewellery}</span>
                  {t('industries.jewellery.label')}
                </span>
                <h3 className="industry-spotlight-title">
                  {t('industries.spotlight.titleLine1')}{' '}
                  <span className="industry-spotlight-title-accent">{t('industries.spotlight.titleAccent')}</span>
                  {t('industries.spotlight.titleLine2')}
                </h3>
                <p className="industry-spotlight-desc">{t('industries.spotlight.desc')}</p>
                <Link to="/signup" className="industry-spotlight-cta">
                  {t('industries.spotlight.cta')}
                  <span className="industry-cta-arrow" aria-hidden="true">{ARROW_ICON}</span>
                </Link>
              </div>

              <div className="industry-spotlight-phone-wrap">
                <PhoneJewelleryMock t={t} />
              </div>

              <div className="industry-spotlight-cards">
                {['preloaded', 'proof', 'payments'].map((k) => (
                  <div key={k} className="industry-support-card">
                    <span className="industry-support-eyebrow">{t(`industries.spotlight.cards.${k}.eyebrow`)}</span>
                    <p>{t(`industries.spotlight.cards.${k}.body`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="industry-divider">
            <div>
              <span className="industry-divider-eyebrow">{t('industries.dividerEyebrow')}</span>
              <h3 className="industry-divider-title">{t('industries.dividerTitle')}</h3>
            </div>
            <p className="industry-divider-note">{t('industries.dividerNote')}</p>
          </div>

          <div className="industry-tiles-grid">
            {INDUSTRY_TILES.map((ind) => (
              <article key={ind.key} className={`industry-tile industry-tile--${ind.accent}`}>
                <div className="industry-tile-visual">
                  <IndustryTileMock kind={ind.key} t={t} />
                </div>
                <div className="industry-tile-body">
                  <span className="industry-tile-eyebrow">
                    <span className="industry-tile-eyebrow-ico" aria-hidden="true">{INDUSTRY_ICONS[ind.key]}</span>
                    {t(`industries.${ind.key}.label`)}
                  </span>
                  <h4 className="industry-tile-title">{t(`industries.${ind.key}.title`)}</h4>
                  <p className="industry-tile-desc">{t(`industries.${ind.key}.desc`)}</p>
                  <ul className="industry-tile-perks">
                    {['p1', 'p2', 'p3'].map((p) => (
                      <li key={p}>
                        <span className="industry-tile-check" aria-hidden="true">{CHECK_ICON}</span>
                        {t(`industries.${ind.key}.perks.${p}`)}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="industry-tile-cta">
                    <span>{t(`industries.${ind.key}.cta`)}</span>
                    <span className="industry-cta-arrow" aria-hidden="true">{ARROW_ICON}</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </div>
          </div>
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
