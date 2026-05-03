import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getCategories } from '../../services/categoryService.js';
import SaveBar from './SaveBar.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';
import { API_BASE } from '../../config.js';
import FeatureGate, { isFeatureAvailable } from './FeatureGate.jsx';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHODS } from '../common/PaymentIcons.jsx';

// Per-template appearance fields. Settings keys are `footer{Template}{Key}`
// (e.g. `footerClassicFooterBg`, `footerModernHeadingColor`). Each
// template owns its own field set because Classic + Modern look completely
// different and don't share variables.
const CLASSIC_APPEARANCE_FIELDS = [
  { key: 'FooterBg',          label: 'Footer Background',          type: 'color' },
  { key: 'SectionTitleColor', label: 'Column Title Color',         type: 'color' },
  { key: 'SectionTitleFont',  label: 'Column Title Font',          type: 'font'  },
  { key: 'LinkColor',         label: 'Link Color',                 type: 'color' },
  { key: 'LinkFont',          label: 'Link Font',                  type: 'font'  },
  { key: 'FollowTitleColor',  label: '"Follow us on social media" Title Color', type: 'color' },
  { key: 'SocialIconBg',      label: 'Social Icon Background',     type: 'color' },
  { key: 'SocialIconColor',   label: 'Social Icon Color',          type: 'color' },
  { key: 'SocialIconBorder',  label: 'Social Icon Border Color',   type: 'color' },
  { key: 'AppTitleColor',     label: '"Download Our App" Title Color', type: 'color' },
  { key: 'AppTitleFont',      label: '"Download Our App" Title Font',  type: 'font'  },
  { key: 'AppBannerBg',       label: 'App Banner Background',      type: 'color' },
  { key: 'BottomBg',          label: 'Bottom Bar Background',      type: 'color' },
  { key: 'CopyrightColor',    label: 'Copyright Text Color',       type: 'color' },
  { key: 'BottomLinksColor',  label: 'Bottom Links Color',         type: 'color' },
  { key: 'PoweredByColor',    label: '"Powered by" Link Color',    type: 'color' },
];

const MODERN_APPEARANCE_FIELDS = [
  { key: 'FooterBg',            label: 'Footer Background',            type: 'color' },
  { key: 'HeadingColor',        label: 'Brand Heading Color',          type: 'color' },
  { key: 'HeadingFont',         label: 'Brand Heading Font',           type: 'font'  },
  { key: 'ContactColor',        label: 'Address / Contact Text Color', type: 'color' },
  { key: 'SocialIconColor',     label: 'Social Icon Color',            type: 'color' },
  { key: 'SocialIconBorder',    label: 'Social Icon Border Color',     type: 'color' },
  { key: 'SocialHoverBg',       label: 'Social Icon Hover Background', type: 'color' },
  { key: 'ColTitleColor',       label: 'Column Title Color',           type: 'color' },
  { key: 'ColTitleFont',        label: 'Column Title Font',            type: 'font'  },
  { key: 'LinkColor',           label: 'Link Color',                   type: 'color' },
  { key: 'LinkFont',            label: 'Link Font',                    type: 'font'  },
  { key: 'AppLabelColor',       label: '"Download Our App" Label Color', type: 'color' },
  { key: 'BottomBg',            label: 'Bottom Bar Background',        type: 'color' },
  { key: 'BottomDividerColor',  label: 'Bottom Divider Color',         type: 'color' },
  { key: 'CopyrightColor',      label: 'Copyright Text Color',         type: 'color' },
  { key: 'BottomLinkColor',     label: 'Bottom Link Color',            type: 'color' },
];

// Defaults shown as the swatch fallback when nothing is saved. These must
// match the literal CSS fallbacks in footer.css / modern.css so the
// "default" preview the merchant sees matches what the storefront actually
// renders when the field is left blank.
const TEMPLATE_DEFAULTS = {
  Classic: {
    FooterBg:          '#f8f8f5',
    SectionTitleColor: '#666666',
    LinkColor:         '#666666',
    FollowTitleColor:  '#666666',
    SocialIconBg:      '#f8f8f5',
    SocialIconColor:   '#666666',
    SocialIconBorder:  '#e0e0e0',
    AppTitleColor:     '#333333',
    AppBannerBg:       '#efece2',
    BottomBg:          '#f8f8f5',
    CopyrightColor:    '#666666',
    BottomLinksColor:  '#666666',
    PoweredByColor:    '#9c7c38',
  },
  Modern: {
    FooterBg:           '#111111',
    HeadingColor:       '#ffffff',
    ContactColor:       '#999999',
    SocialIconColor:    '#cccccc',
    SocialIconBorder:   '#333333',
    SocialHoverBg:      '#ffffff',
    ColTitleColor:      '#ffffff',
    LinkColor:          '#999999',
    AppLabelColor:      '#999999',
    BottomBg:           '#111111',
    BottomDividerColor: '#222222',
    CopyrightColor:     '#666666',
    BottomLinkColor:    '#888888',
  },
};

function fieldsFor(template) {
  return template === 'Modern' ? MODERN_APPEARANCE_FIELDS : CLASSIC_APPEARANCE_FIELDS;
}

function buildEmptyAppearance() {
  const out = {};
  for (const tmpl of ['Classic', 'Modern']) {
    for (const f of fieldsFor(tmpl)) {
      out[`footer${tmpl}${f.key}`] = '';
    }
  }
  return out;
}

export default function FooterEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const hasLoadedRef = useRef(false);

  const currentPlan = siteConfig?.subscriptionPlan;
  const canRemoveBranding = isFeatureAvailable(currentPlan, 'removeBranding');

  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');

  const [shopRedirect, setShopRedirect] = useState('');

  const [showAppBanner, setShowAppBanner] = useState(false);
  const [showAppStore, setShowAppStore] = useState(true);
  const [showPlayStore, setShowPlayStore] = useState(true);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [playStoreUrl, setPlayStoreUrl] = useState('');

  const [hideBranding, setHideBranding] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);

  const [appearance, setAppearance] = useState(() => buildEmptyAppearance());
  const activeTemplate = (() => {
    let s = siteConfig?.settings || {};
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
    return s.theme === 'modern' ? 'Modern' : 'Classic';
  })();

  const [categories, setCategories] = useState([]);

  const dirty = useDirtyTracker({ instagram, facebook, twitter, youtube, shopRedirect, showAppBanner, showAppStore, showPlayStore, appStoreUrl, playStoreUrl, hideBranding, paymentMethods, appearance });

  useEffect(() => {
    if (siteConfig?.id) {
      loadFooterConfig();
      loadCategories();
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const social = { instagram, facebook, twitter, youtube };
    if (onPreviewUpdate) onPreviewUpdate({
      social,
      footer: {
        social,
        bottomNav: { shopRedirect },
        appBanner: { show: showAppBanner, showAppStore, showPlayStore, appStoreUrl, playStoreUrl },
        hideBranding,
        paymentMethods,
      },
      ...appearance,
    });
  }, [instagram, facebook, twitter, youtube, shopRedirect, showAppBanner, showAppStore, showPlayStore, appStoreUrl, playStoreUrl, hideBranding, paymentMethods, appearance]);

  async function loadCategories() {
    try {
      const res = await getCategories(siteConfig.id);
      setCategories(res.data || res.categories || []);
    } catch (e) {
      setCategories([]);
    }
  }

  async function loadFooterConfig() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const footer = settings.footer || {};
        let socialLinks = result.data.social_links || result.data.socialLinks || {};
        if (typeof socialLinks === 'string') {
          try { socialLinks = JSON.parse(socialLinks); } catch (e) { socialLinks = {}; }
        }
        const social = footer.social || {};
        const igVal = social.instagram || settings.social?.instagram || socialLinks.instagram || '';
        const fbVal = social.facebook || settings.social?.facebook || socialLinks.facebook || '';
        const twVal = social.twitter || settings.social?.twitter || socialLinks.twitter || '';
        const ytVal = social.youtube || settings.social?.youtube || socialLinks.youtube || '';
        setInstagram(igVal);
        setFacebook(fbVal);
        setTwitter(twVal);
        setYoutube(ytVal);

        const bottomNav = footer.bottomNav || {};
        const shopVal = bottomNav.shopRedirect || '';
        setShopRedirect(shopVal);

        const appBanner = footer.appBanner || {};
        const showBannerVal = appBanner.show === true;
        const showAppVal = appBanner.showAppStore !== false;
        const showPlayVal = appBanner.showPlayStore !== false;
        const appUrlVal = appBanner.appStoreUrl || '';
        const playUrlVal = appBanner.playStoreUrl || '';
        setShowAppBanner(showBannerVal);
        setShowAppStore(showAppVal);
        setShowPlayStore(showPlayVal);
        setAppStoreUrl(appUrlVal);
        setPlayStoreUrl(playUrlVal);
        const hideBrandingVal = footer.hideBranding === true;
        setHideBranding(hideBrandingVal);

        const validIds = new Set(PAYMENT_METHODS.map((m) => m.id));
        const paymentMethodsVal = Array.isArray(footer.paymentMethods)
          ? footer.paymentMethods.filter((id) => validIds.has(id))
          : DEFAULT_PAYMENT_METHODS.slice();
        setPaymentMethods(paymentMethodsVal);

        const appearanceVal = buildEmptyAppearance();
        for (const k of Object.keys(appearanceVal)) {
          if (typeof settings[k] === 'string') appearanceVal[k] = settings[k];
        }
        setAppearance(appearanceVal);

        dirty.baseline({ instagram: igVal, facebook: fbVal, twitter: twVal, youtube: ytVal, shopRedirect: shopVal, showAppBanner: showBannerVal, showAppStore: showAppVal, showPlayStore: showPlayVal, appStoreUrl: appUrlVal, playStoreUrl: playUrlVal, hideBranding: hideBrandingVal, paymentMethods: paymentMethodsVal, appearance: appearanceVal });
      }
    } catch (e) {
      console.error('Failed to load footer config:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function updateAppearance(key, value) {
    setAppearance(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      var token = sessionStorage.getItem('site_admin_token');
      var payload = {
        settings: {
          social: { instagram: instagram, facebook: facebook, twitter: twitter, youtube: youtube },
          footer: {
            social: { instagram: instagram, facebook: facebook, twitter: twitter, youtube: youtube },
            bottomNav: { shopRedirect: shopRedirect },
            appBanner: { show: showAppBanner, showAppStore: showAppStore, showPlayStore: showPlayStore, appStoreUrl: appStoreUrl, playStoreUrl: playStoreUrl },
            hideBranding: canRemoveBranding ? hideBranding : false,
            paymentMethods: paymentMethods,
          },
          ...appearance,
        },
      };
      var response = await fetch(API_BASE + '/api/sites/' + siteConfig.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'SiteAdmin ' + token : '',
        },
        body: JSON.stringify(payload),
      });
      var result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
        if (onSaved) onSaved();
        if (refetchSite) refetchSite();
      } else {
        setStatus('error:' + (result.error || "Unknown error"));
      }
    } catch (err) {
      setStatus('error:' + err.message);
    } finally {
      setSaving(false);
    }
  }

  var shopRedirectOptions = categories.map(function (cat) {
    return { value: '/category/' + cat.slug, label: cat.name };
  });

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={function () { handleSave(); }} />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Social Media Links</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Add your social media profile URLs. These will appear as icons in the footer.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-instagram" style={{ marginInlineEnd: 6, color: '#E1306C' }} />Instagram
              </label>
              <input type="text" value={instagram} onChange={function (ev) { setInstagram(ev.target.value); }} placeholder="https://instagram.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-facebook-f" style={{ marginInlineEnd: 6, color: '#1877F2' }} />Facebook
              </label>
              <input type="text" value={facebook} onChange={function (ev) { setFacebook(ev.target.value); }} placeholder="https://facebook.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-twitter" style={{ marginInlineEnd: 6, color: '#1DA1F2' }} />Twitter
              </label>
              <input type="text" value={twitter} onChange={function (ev) { setTwitter(ev.target.value); }} placeholder="https://twitter.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-youtube" style={{ marginInlineEnd: 6, color: '#FF0000' }} />YouTube
              </label>
              <input type="text" value={youtube} onChange={function (ev) { setYoutube(ev.target.value); }} placeholder="https://youtube.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">App Download Banner</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Show a "Download Our App" section in the footer with App Store and Google Play buttons.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAppBanner ? 20 : 0 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Show App Banner</label>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Display app download buttons in the footer</span>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={showAppBanner} onChange={function () { setShowAppBanner(!showAppBanner); }} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showAppBanner ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                <span style={{ position: 'absolute', left: showAppBanner ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </span>
            </label>
          </div>

          {showAppBanner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fab fa-apple" style={{ fontSize: 18, color: '#000' }} />
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>App Store</label>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Apple App Store button</span>
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAppStore} onChange={function () { setShowAppStore(!showAppStore); }} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showAppStore ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                    <span style={{ position: 'absolute', left: showAppStore ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </span>
                </label>
              </div>
              {showAppStore && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>App Store URL</label>
                  <input type="text" value={appStoreUrl} onChange={function (ev) { setAppStoreUrl(ev.target.value); }} placeholder="https://apps.apple.com/app/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fab fa-google-play" style={{ fontSize: 18, color: '#34a853' }} />
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Google Play</label>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Google Play Store button</span>
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPlayStore} onChange={function () { setShowPlayStore(!showPlayStore); }} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showPlayStore ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                    <span style={{ position: 'absolute', left: showPlayStore ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </span>
                </label>
              </div>
              {showPlayStore && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Google Play URL</label>
                  <input type="text" value={playStoreUrl} onChange={function (ev) { setPlayStoreUrl(ev.target.value); }} placeholder="https://play.google.com/store/apps/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Branding</h3></div>
        <div className="card-content">
          <FeatureGate currentPlan={currentPlan} requiredPlan="starter" featureName="Remove Flomerce Branding">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Hide "Powered by Flomerce"</label>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Remove the platform branding from your storefront footer.</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={hideBranding} onChange={function () { setHideBranding(!hideBranding); }} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hideBranding ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                  <span style={{ position: 'absolute', left: hideBranding ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
          </FeatureGate>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Bottom Navigation Bar</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Configure the mobile bottom navigation bar that appears on your store.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
              <i className="fi fi-rs-shop" style={{ marginInlineEnd: 6 }} />Shop Icon Redirects To
            </label>
            <select value={shopRedirect} onChange={function (ev) { setShopRedirect(ev.target.value); }} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
              <option value="">Select a category</option>
              {shopRedirectOptions.map(function (opt) { return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}
            </select>
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Payment Icons</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Choose which payment method logos appear in your footer and in what order. Disable everything to hide the row entirely. Logos render in their official brand colors.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(function () {
              var enabled = paymentMethods.filter(function (id) { return PAYMENT_METHODS.some(function (m) { return m.id === id; }); });
              var disabled = PAYMENT_METHODS.filter(function (m) { return !enabled.includes(m.id); }).map(function (m) { return m.id; });
              var rows = enabled.map(function (id, idx) { return { id: id, on: true, idx: idx }; })
                .concat(disabled.map(function (id) { return { id: id, on: false, idx: -1 }; }));
              return rows.map(function (row) {
                var meta = PAYMENT_METHODS.find(function (m) { return m.id === row.id; });
                function toggle() {
                  setPaymentMethods(function (prev) {
                    if (prev.includes(row.id)) return prev.filter(function (x) { return x !== row.id; });
                    return prev.concat([row.id]);
                  });
                }
                function move(delta) {
                  setPaymentMethods(function (prev) {
                    var arr = prev.slice();
                    var i = arr.indexOf(row.id);
                    var j = i + delta;
                    if (i < 0 || j < 0 || j >= arr.length) return prev;
                    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                    return arr;
                  });
                }
                return (
                  <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {row.on && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="button" onClick={function () { move(-1); }} disabled={row.idx === 0} title="Move up" style={{ width: 28, height: 28, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4, cursor: row.idx === 0 ? 'not-allowed' : 'pointer', opacity: row.idx === 0 ? 0.4 : 1 }}>↑</button>
                          <button type="button" onClick={function () { move(1); }} disabled={row.idx === enabled.length - 1} title="Move down" style={{ width: 28, height: 28, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4, cursor: row.idx === enabled.length - 1 ? 'not-allowed' : 'pointer', opacity: row.idx === enabled.length - 1 ? 0.4 : 1 }}>↓</button>
                        </div>
                      )}
                      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                        <input type="checkbox" checked={row.on} onChange={toggle} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: row.on ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                          <span style={{ position: 'absolute', left: row.on ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </span>
                      </label>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Appearance</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
            Customize colors and fonts for your {activeTemplate} footer template. Leave any field blank to use the default.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {fieldsFor(activeTemplate).map(function (field) {
              var settingKey = 'footer' + activeTemplate + field.key;
              var value = appearance[settingKey] || '';
              var fallback = TEMPLATE_DEFAULTS[activeTemplate][field.key];
              if (field.type === 'color') {
                return (
                  <AdminColorField
                    key={settingKey}
                    label={field.label}
                    value={value}
                    fallback={fallback}
                    onChange={function (v) { updateAppearance(settingKey, v); }}
                  />
                );
              }
              return (
                <AdminFontPicker
                  key={settingKey}
                  label={field.label}
                  value={value}
                  onChange={function (v) { updateAppearance(settingKey, v); }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {status && (
        <div style={{
          background: status === 'success' ? '#f0fdf4' : '#fef2f2',
          border: '1px solid ' + (status === 'success' ? '#bbf7d0' : '#fecaca'),
          borderRadius: 8, padding: '12px 16px',
          color: status === 'success' ? '#166534' : '#dc2626',
          marginBottom: 16, fontSize: 14,
        }}>
          {status === 'success' ? "Footer settings saved successfully!" : `Failed to save: ${status.replace('error:', '')}`}
        </div>
      )}

      <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={function () { handleSave(); }} />
    </div>
  );
}
