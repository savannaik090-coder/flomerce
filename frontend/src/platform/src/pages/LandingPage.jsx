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

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [showPwa, setShowPwa] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);
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

  const handlePlayVideo = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().then(() => setVideoPlaying(true)).catch(() => {});
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    setShowPwa(false);
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
  };

  const features = [
    { key: 'store', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>) },
    { key: 'orders', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>) },
    { key: 'payments', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>) },
    { key: 'analytics', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>) },
    { key: 'push', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>) },
    { key: 'seo', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>) },
  ];

  return (
    <>
      <div className="container landing-page">
        <div className="landing-gradient-bg">
          <div className="hero-gradient-orb hero-orb-1"></div>
          <div className="hero-gradient-orb hero-orb-2"></div>
          <div className="hero-gradient-orb hero-orb-3"></div>
          <div className="hero-gradient-orb hero-orb-4"></div>
        </div>
        <Navbar showMenu={true} />

        <section className="hero">
          <div className="hero-content reveal">
            <div className="hero-badge">{t('heroBadge')}</div>
            <h1>{t('heroTitleLine1')}<br /><span className="hero-accent">{t('heroTitleLine2')}</span><br />{t('heroTitleLine3')}</h1>
            <p className="hero-desc">{t('heroDesc')}</p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-hero-primary">
                {t('heroCtaPrimary')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <a href="#features" className="btn btn-hero-ghost" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>{t('heroCtaSecondary')}</a>
            </div>
          </div>
        </section>

        <section className="landing-section teaser-section reveal">
          <div className="section-header">
            <span className="section-pill">{t('demoPill')}</span>
            <h2>{t('demoTitle')}</h2>
            <p>{t('demoSubtitle')}</p>
          </div>
          <div className="teaser-wrapper">
            <div className="teaser-browser-frame">
              <div className="teaser-browser-bar">
                <div className="teaser-dots-row">
                  <span className="teaser-dot red"></span>
                  <span className="teaser-dot yellow"></span>
                  <span className="teaser-dot green"></span>
                </div>
                <span className="teaser-url-bar">{PLATFORM_DOMAIN}</span>
              </div>
              <div className="teaser-video-container">
                <video ref={videoRef} className="teaser-video" muted loop playsInline preload="auto">
                  <source src="/api/upload/video?key=VID_20260331_002038.mp4" type="video/mp4" />
                </video>
                {!videoPlaying && (
                  <button className="teaser-play-btn" onClick={handlePlayVideo} aria-label={t('playVideo')}>
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="26" fill="rgba(0,0,0,0.45)"/><path d="M21 16l14 10-14 10V16z" fill="#fff"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section reveal">
          <div className="section-header">
            <span className="section-pill">{t('featuresPill')}</span>
            <h2>{t('featuresTitle')}</h2>
            <p>{t('featuresSubtitle')}</p>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.key} className="feature-card">
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3>{t(`features.${f.key}.title`)}</h3>
                <p>{t(`features.${f.key}.desc`)}</p>
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
              <img src="/assets/images/flomerce-logo.png" alt="Flomerce" className="footer-logo" />
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
              <span>Karwar, Karnataka, India — 581400</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Flomerce. {t('rightsReserved')}</p>
          </div>
        </footer>
      </div>

      <div className={`pwa-install-bar${showPwa ? ' show' : ''}`}>
        <div className="pwa-info">
          <img src="/assets/images/flomerce-logo.png" alt="Logo" className="pwa-logo" />
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
