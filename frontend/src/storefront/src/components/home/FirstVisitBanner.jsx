import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import TranslatedText from '../TranslatedText';

const STORAGE_KEY = 'first_visit_shown_at';

function getStorageValue() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function setStorageValue(val) {
  try { localStorage.setItem(STORAGE_KEY, val); } catch {}
}

function shouldShow(wbShowAgain) {
  const stored = getStorageValue();
  if (!stored) return true;
  if (wbShowAgain === 'always') return true;
  if (wbShowAgain === 'never') return false;
  const days = parseInt(wbShowAgain, 10);
  if (!isNaN(days)) {
    const shownAt = parseInt(stored, 10);
    if (!isNaN(shownAt)) {
      return Date.now() - shownAt > days * 24 * 60 * 60 * 1000;
    }
  }
  return false;
}

const radiusMap = { sharp: '0px', rounded: '8px', pill: '999px' };

export default function FirstVisitBanner() {
  const { siteConfig } = useSiteConfig();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const wbDelay = settings.wbDelay !== undefined ? Number(settings.wbDelay) : 3;
  const wbShowAgain = settings.wbShowAgain || 'never';

  useEffect(() => {
    if (settings.showWelcomeBanner === false) return;
    if (!shouldShow(wbShowAgain)) return;
    const ms = isNaN(wbDelay) ? 3000 : wbDelay * 1000;
    timerRef.current = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(timerRef.current);
  }, [siteConfig?.id]);

  const close = () => {
    setShow(false);
    setStorageValue(String(Date.now()));
  };

  if (!show || settings.showWelcomeBanner === false) return null;

  const brandName = siteConfig?.brandName || siteConfig?.brand_name || '';
  const bannerImage = settings.welcomeBannerImage || '';
  const usingDefaultHeading = !settings.welcomeBannerHeading;
  const heading = settings.welcomeBannerHeading || `Welcome to ${brandName}!`;
  const message = settings.welcomeBannerMessage || '';
  const buttonText = settings.welcomeBannerButtonText || '';
  const buttonLink = settings.welcomeBannerButtonLink || '/signup';

  const wbBgColor = settings.wbBgColor || '#ffffff';
  const wbHeadingColor = settings.wbHeadingColor || '#333333';
  const wbHeadingFont = settings.wbHeadingFont || '';
  const wbTextColor = settings.wbTextColor || '#666666';
  const wbBtnBg = settings.wbBtnBg || '#b3a681';
  const wbBtnText = settings.wbBtnText || '#ffffff';
  const wbBtnRadius = settings.wbBtnRadius || '';
  const wbCouponCode = settings.wbCouponCode || '';
  const wbCouponLabel = settings.wbCouponLabel || '';

  const btnRadius = radiusMap[wbBtnRadius] || '4px';

  function handleCopy() {
    if (!wbCouponCode) return;
    try {
      navigator.clipboard.writeText(wbCouponCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`first-visit-modal ${show ? 'show' : ''}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="first-visit-modal-content" style={{ background: wbBgColor }}>
        <button className="first-visit-modal-close" onClick={close}>&times;</button>

        {bannerImage ? (
          <img src={resolveImageUrl(bannerImage)} alt={heading} className="first-visit-banner-image" />
        ) : (
          <div className="first-visit-banner-image" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        <div className="first-visit-banner-text">
          <h2 style={{ color: wbHeadingColor, ...(wbHeadingFont ? { fontFamily: wbHeadingFont } : {}) }}>
            {usingDefaultHeading
              ? (brandName
                  ? <TranslatedText text="Welcome to {{brand}}!" vars={{ brand: brandName }} />
                  : <TranslatedText text="Welcome to our store!" />)
              : <TranslatedText text={heading} />}
          </h2>
          <p style={{ color: wbTextColor }}>
            {message
              ? <TranslatedText text={message} />
              : <TranslatedText text="Discover our exquisite collection. Sign up today to receive exclusive offers and updates." />}
          </p>

          {wbCouponCode && (
            <div className="fvb-coupon-box">
              {wbCouponLabel && <p className="fvb-coupon-label">{wbCouponLabel}</p>}
              <button type="button" className="fvb-coupon-code" onClick={handleCopy} title="Click to copy">
                <span className="fvb-coupon-text">{wbCouponCode}</span>
                <span className="fvb-coupon-copy-icon">
                  {copied
                    ? <i className="fas fa-check" />
                    : <i className="fas fa-copy" />}
                </span>
              </button>
              {copied && <p className="fvb-coupon-copied">Copied!</p>}
            </div>
          )}

          <Link
            to={buttonLink}
            className="first-visit-cta-button"
            style={{ backgroundColor: wbBtnBg, color: wbBtnText, borderRadius: btnRadius }}
            onClick={close}
          >
            {buttonText
              ? <TranslatedText text={buttonText} />
              : <TranslatedText text="Sign Up Now" />}
          </Link>
        </div>
      </div>
    </div>
  );
}
