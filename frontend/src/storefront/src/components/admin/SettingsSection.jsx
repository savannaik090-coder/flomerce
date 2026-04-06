import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';
import { TIMEZONE_OPTIONS, safeFormatInTimezone } from '../../utils/dateFormatter.js';
import { getExchangeRates } from '../../services/currencyService.js';
import { formatPrice } from '../../utils/priceFormatter.js';
import { COUNTRIES, getStatesForCountry } from '../../utils/countryStates.js';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';

export default function SettingsSection() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [brandName, setBrandName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [codEnabled, setCodEnabled] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const savedCurrencyRef = useRef('INR');
  const [showCurrencyConfirm, setShowCurrencyConfirm] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState(null);
  const [currencyConverting, setCurrencyConverting] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(true);
  const [returnsEnabled, setReturnsEnabled] = useState(false);
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [replacementEnabled, setReplacementEnabled] = useState(false);
  const [cancellationEnabled, setCancellationEnabled] = useState(false);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [showOrderTrack, setShowOrderTrack] = useState(true);
  const [orderTrackUrl, setOrderTrackUrl] = useState('');
  const [timezone, setTimezone] = useState('');
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFlatRate, setDeliveryFlatRate] = useState('');
  const [deliveryFreeAboveEnabled, setDeliveryFreeAboveEnabled] = useState(false);
  const [deliveryFreeAbove, setDeliveryFreeAbove] = useState('');
  const [deliveryRegionRates, setDeliveryRegionRates] = useState([]);
  const [gstin, setGstin] = useState('');
  const [gstLegalName, setGstLegalName] = useState('');
  const [gstState, setGstState] = useState('');
  const [gstAddress, setGstAddress] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstInvoiceEmailEnabled, setGstInvoiceEmailEnabled] = useState(false);
  const [gstinError, setGstinError] = useState('');

  const defaultOpenSections = { storeUrl: true, customDomain: true, brand: true, contact: true };
  const [openSections, setOpenSections] = useState(defaultOpenSections);

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function isSectionOpen(key) {
    return openSections[key] === true;
  }

  const [loading, setLoading] = useState(true);

  const [currentSubdomain, setCurrentSubdomain] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainSaving, setSubdomainSaving] = useState(false);
  const [subdomainMsg, setSubdomainMsg] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const [showSubdomainConfirm, setShowSubdomainConfirm] = useState(false);

  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState(null);
  const [domainToken, setDomainToken] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainMsg, setDomainMsg] = useState('');
  const [domainError, setDomainError] = useState('');
  const storageKey = siteConfig?.id ? `fluxe_domain_tips_${siteConfig.id}` : null;

  function getDismissedDomain() {
    if (!storageKey) return null;
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
  }

  function dismissTips(domain) {
    if (!storageKey) return;
    const current = getDismissedDomain() || {};
    localStorage.setItem(storageKey, JSON.stringify({ ...current, domain, whatsNext: true, rootRedirect: true }));
  }

  function dismissTip(domain, key) {
    if (!storageKey) return;
    const current = getDismissedDomain() || {};
    localStorage.setItem(storageKey, JSON.stringify({ ...current, domain, [key]: true }));
  }

  function isTipDismissed(domain, key) {
    const stored = getDismissedDomain();
    if (!stored || stored.domain !== domain) return false;
    return !!stored[key];
  }

  const [rootDomainTipDismissed, setRootDomainTipDismissed] = useState(false);
  const [whatsNextDismissed, setWhatsNextDismissed] = useState(false);

  useEffect(() => {
    if (customDomain && domainStatus === 'verified') {
      setWhatsNextDismissed(isTipDismissed(customDomain, 'whatsNext'));
      setRootDomainTipDismissed(isTipDismissed(customDomain, 'rootRedirect'));
    } else {
      setWhatsNextDismissed(false);
      setRootDomainTipDismissed(false);
    }
  }, [customDomain, domainStatus]);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  async function loadSettings() {
    setLoading(true);
    try {

      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        let settings = data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        setBrandName(data.brand_name || data.brandName || '');
        if (data.subdomain) {
          setCurrentSubdomain(data.subdomain);
          setSubdomainInput(data.subdomain);
        }
        setPhone(settings.phone || data.phone || '');
        setWhatsapp(settings.whatsapp || '');
        setShowFloatingButton(settings.showFloatingButton !== false);
        setEmail(settings.email || data.email || '');
        setAddress(settings.address || data.address || '');
        setRazorpayKeyId(settings.razorpayKeyId || '');
        setRazorpayKeySecret(settings.razorpayKeySecret || '');
        setCodEnabled(settings.codEnabled !== false);
        const loadedCurrency = settings.defaultCurrency || 'INR';
        setDefaultCurrency(loadedCurrency);
        savedCurrencyRef.current = loadedCurrency;
        setShowCurrencySelector(settings.showCurrencySelector !== false);
        setReturnsEnabled(settings.returnsEnabled === true);
        setReturnWindowDays(settings.returnWindowDays || 7);
        setReplacementEnabled(settings.replacementEnabled === true);
        setCancellationEnabled(settings.cancellationEnabled === true);
        setCancellationWindowHours(settings.cancellationWindowHours || 24);
        setShowOrderTrack(settings.showOrderTrack !== false);
        setOrderTrackUrl(settings.orderTrackUrl || '');
        setTimezone(settings.timezone || '');
        const dc = settings.deliveryConfig || {};
        setDeliveryEnabled(dc.enabled === true);
        setDeliveryFlatRate(dc.flatRate != null ? String(dc.flatRate) : '');
        setDeliveryFreeAboveEnabled(dc.freeAboveEnabled === true);
        setDeliveryFreeAbove(dc.freeAbove != null ? String(dc.freeAbove) : '');
        setDeliveryRegionRates(Array.isArray(dc.regionRates) ? dc.regionRates : []);
        setGstEnabled(settings.gstEnabled === true);
        setGstin(settings.gstin || '');
        setGstLegalName(settings.gstLegalName || '');
        setGstState(settings.gstState || '');
        setGstAddress(settings.gstAddress || '');
        setGstInvoiceEmailEnabled(settings.gstInvoiceEmailEnabled === true);
        if (data.custom_domain) {
          setCustomDomain(data.custom_domain);
          setDomainInput(data.custom_domain);
          setDomainStatus(data.domain_status || null);
          setDomainToken(data.domain_verification_token || '');
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }

  function validateGSTIN(value) {
    if (!value) return '';
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GSTIN must be exactly 15 characters';
    if (!gstinRegex.test(value)) return 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5';
    return '';
  }

  function handleGstinChange(value) {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setGstin(upper);
    if (upper) {
      setGstinError(validateGSTIN(upper));
    } else {
      setGstinError('');
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (gstEnabled && gstin.trim()) {
      const err = validateGSTIN(gstin.trim());
      if (err) {
        setGstinError(err);
        setMessage('Please fix the invalid GSTIN before saving.');
        return;
      }
    }
    setSaving(true);
    setMessage('');
    try {
      const settings = {
        phone,
        whatsapp,
        showFloatingButton,
        email,
        address,
        codEnabled,
        defaultCurrency,
        showCurrencySelector,
        returnsEnabled,
        returnWindowDays: Number(returnWindowDays) || 7,
        replacementEnabled,
        cancellationEnabled,
        cancellationWindowHours: Number(cancellationWindowHours) || 24,
        showOrderTrack,
        orderTrackUrl: orderTrackUrl.trim(),
        timezone,
        deliveryConfig: {
          enabled: deliveryEnabled,
          flatRate: deliveryEnabled ? (Number(deliveryFlatRate) || 0) : 0,
          freeAboveEnabled: deliveryEnabled ? deliveryFreeAboveEnabled : false,
          freeAbove: deliveryEnabled && deliveryFreeAboveEnabled ? (Number(deliveryFreeAbove) || 0) : 0,
          regionRates: deliveryEnabled ? deliveryRegionRates.filter(r => r.country && r.rate !== '') : [],
        },
        gstEnabled,
        gstin: gstEnabled ? (gstin.trim() || null) : null,
        gstLegalName: gstEnabled ? (gstLegalName.trim() || null) : null,
        gstState: gstEnabled ? (gstState.trim() || null) : null,
        gstAddress: gstEnabled ? (gstAddress.trim() || null) : null,
        gstInvoiceEmailEnabled,
      };
      if (razorpayKeyId) {
        settings.razorpayKeyId = razorpayKeyId;
      }
      if (razorpayKeySecret) {
        settings.razorpayKeySecret = razorpayKeySecret;
      }

      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ brandName, settings }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setMessage('Settings saved successfully!');
        if (refetchSite) refetchSite();
      } else {
        setMessage('Failed to save settings: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setMessage('Failed to save settings: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCurrencyChange(newCurrency) {
    if (newCurrency === savedCurrencyRef.current) {
      setDefaultCurrency(newCurrency);
      return;
    }
    setPendingCurrency(newCurrency);
    setCurrencyExchangeRate(null);
    setShowCurrencyConfirm(true);
    try {
      const rates = await getExchangeRates(savedCurrencyRef.current);
      setCurrencyExchangeRate(rates[newCurrency] || null);
    } catch (e) {
      console.error('Failed to fetch exchange rate:', e);
    }
  }

  async function handleCurrencyConfirm() {
    if (!pendingCurrency || !currencyExchangeRate) return;
    setCurrencyConverting(true);
    try {

      const token = sessionStorage.getItem('site_admin_token');
      const authToken = localStorage.getItem('auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `SiteAdmin ${token}`;
      else if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const convResponse = await fetch(`${API_BASE}/api/sites/${siteConfig.id}/convert-currency`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromCurrency: savedCurrencyRef.current,
          toCurrency: pendingCurrency,
          exchangeRate: currencyExchangeRate,
        }),
      });
      const convResult = await convResponse.json();
      if (!convResponse.ok || !convResult.success) {
        setMessage('Currency conversion failed: ' + (convResult.error || 'Unknown error'));
        setShowCurrencyConfirm(false);
        setCurrencyConverting(false);
        return;
      }

      setDefaultCurrency(pendingCurrency);
      savedCurrencyRef.current = pendingCurrency;
      setShowCurrencyConfirm(false);
      setCurrencyConverting(false);

      if (refetchSite) refetchSite();

      const convData = convResult.data || convResult;
      setMessage(`Currency changed to ${pendingCurrency} successfully! Converted ${convData.converted?.products || 0} product(s) and ${convData.converted?.coupons || 0} coupon(s).`);
    } catch (e) {
      setMessage('Currency conversion failed: ' + e.message);
      setCurrencyConverting(false);
      setShowCurrencyConfirm(false);
    }
  }

  function handleCurrencyCancel() {
    setShowCurrencyConfirm(false);
    setPendingCurrency(null);
    setCurrencyExchangeRate(null);
  }

  async function handleSaveDomain() {
    if (!domainInput.trim()) return;
    const val = domainInput.trim().toLowerCase();
    if (!val.startsWith('www.')) {
      setDomainError('Domain must start with www. (e.g. www.mystore.com)');
      return;
    }
    const parts = val.split('.');
    if (parts.length < 3) {
      setDomainError('Please enter a full domain like www.mystore.com');
      return;
    }
    setDomainError('');
    setDomainMsg('');
    setDomainSaving(true);
    try {

      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}/custom-domain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ domain: val }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setCustomDomain(result.data.custom_domain);
        setDomainStatus(result.data.domain_status);
        setDomainToken(result.data.domain_verification_token);
        setDomainMsg('Domain saved! Now add the DNS records below and click Verify.');
      } else {
        setDomainError(result.error || 'Failed to save domain');
      }
    } catch (e) {
      setDomainError('Failed to save domain: ' + e.message);
    } finally {
      setDomainSaving(false);
    }
  }

  async function handleVerifyDomain() {
    setDomainMsg('');
    setDomainError('');
    setDomainVerifying(true);
    try {

      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}/verify-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setDomainStatus(result.data.domain_status);
        if (result.data.domain_status === 'verified') {
          setDomainMsg('Domain verified successfully! Your custom domain is now active.');
        } else {
          const errDetails = (result.data.errors || []).join(' ');
          setDomainError('Verification failed. ' + errDetails);
        }
      } else {
        setDomainError(result.error || 'Verification failed');
      }
    } catch (e) {
      setDomainError('Verification failed: ' + e.message);
    } finally {
      setDomainVerifying(false);
    }
  }

  async function handleRemoveDomain() {
    if (!window.confirm('Are you sure you want to remove the custom domain?')) return;
    setDomainMsg('');
    setDomainError('');
    try {

      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}/custom-domain`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setCustomDomain('');
        setDomainInput('');
        setDomainStatus(null);
        setDomainToken('');
        setDomainMsg('Custom domain removed.');
        if (storageKey) localStorage.removeItem(storageKey);
      } else {
        setDomainError(result.error || 'Failed to remove domain');
      }
    } catch (e) {
      setDomainError('Failed to remove domain: ' + e.message);
    }
  }

  async function handleRenameSubdomain() {
    const newSub = subdomainInput.trim().toLowerCase();
    if (!newSub || newSub === currentSubdomain) {
      setSubdomainError('Enter a different subdomain');
      setShowSubdomainConfirm(false);
      return;
    }
    if (newSub.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters');
      setShowSubdomainConfirm(false);
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(newSub) && newSub.length > 1) {
      setSubdomainError('Only lowercase letters, numbers, and hyphens allowed. Must start and end with a letter or number.');
      setShowSubdomainConfirm(false);
      return;
    }
    setSubdomainError('');
    setSubdomainMsg('');
    setSubdomainSaving(true);
    setShowSubdomainConfirm(false);
    try {

      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}/rename-subdomain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ subdomain: newSub }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setCurrentSubdomain(newSub);
        setSubdomainMsg('Subdomain renamed successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setSubdomainError(result.error || 'Failed to rename subdomain');
      }
    } catch (e) {
      setSubdomainError('Failed to rename subdomain: ' + e.message);
    } finally {
      setSubdomainSaving(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function CollapsibleHeader({ sectionKey, title }) {
    const open = isSectionOpen(sectionKey);
    return (
      <div className="card-header" onClick={() => toggleSection(sectionKey)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', fontSize: 28, color: '#475569', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0, fontWeight: 700 }}>&#9662;</span>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <CollapsibleHeader sectionKey="storeUrl" title="Store URL" />
        {isSectionOpen('storeUrl') && <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Your store is currently accessible at <a href={`https://${currentSubdomain}.${PLATFORM_DOMAIN}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#2563eb' }}>{currentSubdomain}.{PLATFORM_DOMAIN}</a>
          </p>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Subdomain</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              type="text"
              value={subdomainInput}
              onChange={(e) => { setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainError(''); setSubdomainMsg(''); setShowSubdomainConfirm(false); }}
              placeholder="my-store"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px 0 0 6px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <span style={{ padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 14, color: '#64748b', whiteSpace: 'nowrap' }}>.{PLATFORM_DOMAIN}</span>
          </div>
          {subdomainInput && subdomainInput !== currentSubdomain && !showSubdomainConfirm && !subdomainSaving && (
            <button type="button" className="btn btn-primary" onClick={() => setShowSubdomainConfirm(true)} style={{ marginTop: 12, fontSize: 13 }}>
              Change Subdomain
            </button>
          )}
          {showSubdomainConfirm && (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Are you sure?</p>
              <p style={{ fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                Changing your subdomain will update your store URL from <strong>{currentSubdomain}.{PLATFORM_DOMAIN}</strong> to <strong>{subdomainInput.trim()}.{PLATFORM_DOMAIN}</strong>. The old URL will stop working immediately.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={handleRenameSubdomain} disabled={subdomainSaving} style={{ fontSize: 13, background: '#f59e0b', borderColor: '#f59e0b' }}>
                  {subdomainSaving ? 'Renaming...' : 'Yes, Rename'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowSubdomainConfirm(false); setSubdomainInput(currentSubdomain); }} style={{ fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {subdomainSaving && !showSubdomainConfirm && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Renaming subdomain...</p>
          )}
          {subdomainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 8 }}>{subdomainMsg}</p>}
          {subdomainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{subdomainError}</p>}
        </div>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <CollapsibleHeader sectionKey="customDomain" title="Custom Domain" />
        {isSectionOpen('customDomain') && <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Connect your own domain (e.g. <strong>www.mystore.com</strong>) to your store. Only <code>www.</code> subdomains are supported — root domains like <code>mystore.com</code> are not supported.
          </p>

          {customDomain && domainStatus === 'verified' ? (
            <div>
              <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#16a34a', fontSize: 18 }}>&#10003;</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{customDomain}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', background: '#dcfce7', color: '#166534' }}>verified</span>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleRemoveDomain} style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: 12, padding: '6px 12px' }}>
                    Remove Domain
                  </button>
                </div>
                <p style={{ fontSize: 13, color: '#166534', marginTop: 8, marginBottom: 0 }}>
                  Your domain has been verified and SSL certificate is being provisioned.
                </p>
              </div>

              {!whatsNextDismissed && (
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', position: 'relative' }}>
                <button type="button" onClick={() => { setWhatsNextDismissed(true); dismissTip(customDomain, 'whatsNext'); }} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#1e40af', opacity: 0.6, lineHeight: 1 }} title="Dismiss">&times;</button>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6, paddingRight: 20 }}>What happens next?</p>
                <ul style={{ fontSize: 12, color: '#1e40af', margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 4 }}>SSL certificate is issued automatically — this usually takes <strong>5–15 minutes</strong>.</li>
                  <li style={{ marginBottom: 4 }}>DNS changes can take up to <strong>48 hours</strong> to propagate worldwide, though most work within 1–2 hours.</li>
                  <li style={{ marginBottom: 4 }}>During this time, visitors may see a security warning or "site not found" — this is normal.</li>
                  <li>Once live, your store will be accessible at <strong>https://{customDomain}</strong></li>
                </ul>
              </div>
              )}

              {!rootDomainTipDismissed && (
                <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', position: 'relative' }}>
                  <button type="button" onClick={() => { setRootDomainTipDismissed(true); dismissTip(customDomain, 'rootRedirect'); }} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e', opacity: 0.6, lineHeight: 1 }} title="Dismiss">&times;</button>
                  <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 8, paddingRight: 20 }}>Root domain redirect (recommended)</p>
                  <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                    So visitors who type <strong>{customDomain.replace(/^www\./, '')}</strong> are automatically sent to <strong>{customDomain}</strong>
                  </p>
                  <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Cloudflare DNS:</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #fde68a', wordBreak: 'break-all' }}>
                        CNAME &nbsp; @ &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
                    </div>
                    <p style={{ fontSize: 11, color: '#92400e', marginTop: 4, opacity: 0.8 }}>Only works on Cloudflare (CNAME flattening). Then add a Redirect Rule: <strong>{customDomain.replace(/^www\./, '')}</strong> → <strong>https://{customDomain}</strong></p>
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>GoDaddy, Namecheap & others:</p>
                    <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>These providers don't support CNAME on the root domain. Instead, use the <strong>"Forwarding"</strong> or <strong>"URL Redirect"</strong> feature in your domain settings to forward <strong>{customDomain.replace(/^www\./, '')}</strong> → <strong>https://{customDomain}</strong></p>
                  </div>
                </div>
              )}

              {domainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>{domainMsg}</p>}
              {domainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{domainError}</p>}
            </div>
          ) : (
            <>
              {customDomain && domainStatus ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: domainStatus === 'failed' ? '#fef2f2' : '#fffbeb', border: `1px solid ${domainStatus === 'failed' ? '#fecaca' : '#fde68a'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{customDomain}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                          background: domainStatus === 'failed' ? '#fee2e2' : '#fef3c7',
                          color: domainStatus === 'failed' ? '#dc2626' : '#92400e',
                        }}>{domainStatus}</span>
                      </div>
                      <button type="button" className="btn btn-outline" onClick={handleRemoveDomain} style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: 12, padding: '4px 10px' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {domainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>{domainMsg}</p>}
                  {domainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{domainError}</p>}
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Domain</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => { setDomainInput(e.target.value); setDomainError(''); }}
                      placeholder="www.mystore.com"
                      style={{ flex: 1, padding: '10px 12px', border: `1px solid ${domainError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleSaveDomain} disabled={domainSaving} style={{ whiteSpace: 'nowrap' }}>
                      {domainSaving ? 'Saving...' : 'Save Domain'}
                    </button>
                  </div>
                  {domainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{domainError}</p>}
                  {domainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>{domainMsg}</p>}
                </div>
              )}

              {customDomain && domainToken && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>DNS Records to Add</p>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Step 1: CNAME Record (for routing)</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                        CNAME &nbsp; www &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Step 2: TXT Record (for ownership verification)</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                        TXT &nbsp; _fluxe-verify &nbsp; → &nbsp; {domainToken}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(domainToken)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>Add this as a TXT record with host <code>_fluxe-verify</code> on your domain provider.</p>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>Step 3: Root domain redirect (recommended)</p>
                    <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                      So visitors who type <strong>{customDomain.replace(/^www\./, '')}</strong> are automatically sent to <strong>{customDomain}</strong>
                    </p>
                    <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Cloudflare DNS:</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #fde68a', wordBreak: 'break-all' }}>
                          CNAME &nbsp; @ &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                        </code>
                        <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
                      </div>
                      <p style={{ fontSize: 11, color: '#92400e', marginTop: 4, opacity: 0.8 }}>Only works on Cloudflare (CNAME flattening). Then add a Redirect Rule: <strong>{customDomain.replace(/^www\./, '')}</strong> → <strong>https://{customDomain}</strong></p>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10 }}>
                      <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>GoDaddy, Namecheap & others:</p>
                      <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>These providers don't support CNAME on the root domain. Instead, use the <strong>"Forwarding"</strong> or <strong>"URL Redirect"</strong> feature in your domain settings to forward <strong>{customDomain.replace(/^www\./, '')}</strong> → <strong>https://{customDomain}</strong></p>
                    </div>
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleVerifyDomain} disabled={domainVerifying} style={{ width: '100%' }}>
                    {domainVerifying ? 'Verifying...' : 'Verify Now'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>}
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="brand" title="Brand Information" />
          {isSectionOpen('brand') && <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Brand Name</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="contact" title="Contact Information" />
          {isSectionOpen('contact') && <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fas fa-phone" style={{ marginRight: 6, color: '#2563eb' }} />Phone Number
              </label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Used for contact page, store locations, and as fallback for the floating button if no WhatsApp is set</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-whatsapp" style={{ marginRight: 6, color: '#25D366' }} />WhatsApp Number
              </label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>If added, the floating button and featured video chat will redirect to WhatsApp</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Show Floating Contact Button</label>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {whatsapp ? 'Shows WhatsApp icon' : phone ? 'Shows phone call icon' : 'Add a phone or WhatsApp number first'}
                </span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={showFloatingButton} onChange={() => setShowFloatingButton(!showFloatingButton)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showFloatingButton ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                  <span style={{ position: 'absolute', left: showFloatingButton ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@store.com" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Store address" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="currency" title="Default Currency" />
          {isSectionOpen("currency") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Set the default currency for your store. All prices on your website, admin panel, and email notifications will be shown in this currency.
            </p>
            <select
              value={defaultCurrency}
              onChange={e => handleCurrencyChange(e.target.value)}
              style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
            >
              <option value="INR">🇮🇳 INR — Indian Rupee (₹)</option>
              <option value="USD">🇺🇸 USD — US Dollar ($)</option>
              <option value="EUR">🇪🇺 EUR — Euro (€)</option>
              <option value="GBP">🇬🇧 GBP — British Pound (£)</option>
              <option value="AED">🇦🇪 AED — UAE Dirham</option>
              <option value="CAD">🇨🇦 CAD — Canadian Dollar</option>
              <option value="AUD">🇦🇺 AUD — Australian Dollar</option>
              <option value="SAR">🇸🇦 SAR — Saudi Riyal</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>Show Currency Selector</label>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Toggle the currency selector on the bottom navigation bar</span>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                <input type="checkbox" checked={showCurrencySelector} onChange={() => setShowCurrencySelector(!showCurrencySelector)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showCurrencySelector ? '#10b981' : '#cbd5e1', borderRadius: 24, transition: 'background-color 0.2s' }}>
                  <span style={{ position: 'absolute', left: showCurrencySelector ? 22 : 2, top: 2, width: 20, height: 20, backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="timezone" title="Store Timezone" />
          {isSectionOpen("timezone") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Set your store's business timezone. All dates and times in the admin panel (orders, analytics, etc.) will be displayed in this timezone. Your customers will see times in their own local timezone.
            </p>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{ width: '100%', maxWidth: 400, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            {timezone && (
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                Current time in selected timezone: {safeFormatInTimezone(new Date(), timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="shipping" title="Shipping & Delivery Charges" />
          {isSectionOpen("shipping") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Configure delivery charges for your store. When disabled, all orders ship free.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: deliveryEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Charge Delivery Fee</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{deliveryEnabled ? 'Delivery charges are active' : 'All orders ship free'}</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={deliveryEnabled} onChange={e => setDeliveryEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: deliveryEnabled ? '#22c55e' : '#cbd5e1' }}>
                  <span style={{ position: 'absolute', left: deliveryEnabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
            {deliveryEnabled && (
              <div style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Base Delivery Charge</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryFlatRate}
                    onChange={e => setDeliveryFlatRate(e.target.value)}
                    placeholder="e.g. 50"
                    style={{ width: 180, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>This flat rate applies to every order by default</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: deliveryFreeAboveEnabled ? '#f0fdf4' : '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Free Shipping Above Threshold</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Waive delivery fee for orders above a minimum value</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                    <input type="checkbox" checked={deliveryFreeAboveEnabled} onChange={e => setDeliveryFreeAboveEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: deliveryFreeAboveEnabled ? '#22c55e' : '#cbd5e1' }}>
                      <span style={{ position: 'absolute', left: deliveryFreeAboveEnabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </span>
                  </label>
                </div>
                {deliveryFreeAboveEnabled && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Free Shipping Minimum Order Value</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={deliveryFreeAbove}
                      onChange={e => setDeliveryFreeAbove(e.target.value)}
                      placeholder="e.g. 499"
                      style={{ width: 180, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Orders at or above this amount get free delivery</p>
                  </div>
                )}

                <div style={{ marginTop: 8, padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: deliveryRegionRates.length > 0 ? 12 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Country / Region Overrides</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Set different rates per country or country + state (optional)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryRegionRates(prev => [...prev, { country: '', state: '', rate: '' }])}
                      style={{ padding: '6px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      + Add Override
                    </button>
                  </div>
                  {deliveryRegionRates.map((rr, idx) => {
                    const countryCode = COUNTRIES.find(c => c.name === rr.country)?.code || '';
                    const statesForOverride = countryCode ? getStatesForCountry(countryCode) : [];
                    return (
                      <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <select
                          value={rr.country || ''}
                          onChange={e => {
                            const updated = [...deliveryRegionRates];
                            updated[idx] = { ...updated[idx], country: e.target.value, state: '' };
                            setDeliveryRegionRates(updated);
                          }}
                          style={{ flex: '1 1 140px', minWidth: 0, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
                        >
                          <option value="">Select Country</option>
                          {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                        {statesForOverride.length > 0 && (
                          <select
                            value={rr.state || ''}
                            onChange={e => {
                              const updated = [...deliveryRegionRates];
                              updated[idx] = { ...updated[idx], state: e.target.value };
                              setDeliveryRegionRates(updated);
                            }}
                            style={{ flex: '1 1 140px', minWidth: 0, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
                          >
                            <option value="">All States (country-wide)</option>
                            {statesForOverride.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={rr.rate}
                            onChange={e => {
                              const updated = [...deliveryRegionRates];
                              updated[idx] = { ...updated[idx], rate: e.target.value };
                              setDeliveryRegionRates(updated);
                            }}
                            placeholder="Rate"
                            style={{ width: 80, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                          />
                          <button
                            type="button"
                            onClick={() => setDeliveryRegionRates(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}
                            title="Remove"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {deliveryRegionRates.length > 0 && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>
                      Priority: country + state match first, then country-only match, then flat rate fallback. Leave state empty for a country-wide rate.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="cancellation" title="Order Cancellation" />
          {isSectionOpen("cancellation") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Allow customers to request cancellation of pending or confirmed orders. When enabled, a cancel link will be included in order confirmation emails.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: cancellationEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Enable Order Cancellation</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customers can request cancellation before shipping</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={cancellationEnabled} onChange={e => setCancellationEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: cancellationEnabled ? '#22c55e' : '#cbd5e1',
                }}>
                  <span style={{
                    position: 'absolute', left: cancellationEnabled ? 22 : 2, top: 2, width: 20, height: 20,
                    background: '#fff', borderRadius: '50%', transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>
            {cancellationEnabled && (
              <div style={{ marginTop: 4 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Cancellation Window (hours after order)</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={cancellationWindowHours}
                  onChange={e => setCancellationWindowHours(e.target.value)}
                  style={{ width: 120, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Customers can request cancellation within this many hours after placing their order</p>
              </div>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="returns" title="Return Orders" />
          {isSectionOpen("returns") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Allow customers to request returns on delivered orders. When enabled, a return link will be included in delivery emails.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: returnsEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Enable Return Orders</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customers can request returns after delivery</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={returnsEnabled} onChange={e => setReturnsEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: returnsEnabled ? '#22c55e' : '#cbd5e1',
                }}>
                  <span style={{
                    position: 'absolute', left: returnsEnabled ? 22 : 2, top: 2, width: 20, height: 20,
                    background: '#fff', borderRadius: '50%', transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>
            {returnsEnabled && (
              <>
                <div style={{ marginTop: 4 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Return Window (days after delivery)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={returnWindowDays}
                    onChange={e => setReturnWindowDays(e.target.value)}
                    style={{ width: 120, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Customers can request a return within this many days after their order is delivered</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 12, background: replacementEnabled ? '#f0fdf4' : '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Allow Replacement Option</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customers can choose between refund or replacement when returning</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                    <input type="checkbox" checked={replacementEnabled} onChange={e => setReplacementEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                      background: replacementEnabled ? '#22c55e' : '#cbd5e1',
                    }}>
                      <span style={{
                        position: 'absolute', left: replacementEnabled ? 22 : 2, top: 2, width: 20, height: 20,
                        background: '#fff', borderRadius: '50%', transition: '0.3s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="tracking" title="Order Tracking" />
          {isSectionOpen("tracking") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Configure how customers can track their orders. You can use the built-in tracking page or redirect to an external tracking service.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: showOrderTrack ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Show Order Tracking Link</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Show or hide the Order Tracking link in the navigation bar</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={showOrderTrack} onChange={e => setShowOrderTrack(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: showOrderTrack ? '#22c55e' : '#cbd5e1',
                }}>
                  <span style={{
                    position: 'absolute', left: showOrderTrack ? 22 : 2, top: 2, width: 20, height: 20,
                    background: '#fff', borderRadius: '50%', transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>External Tracking URL (optional)</label>
              <input
                type="text"
                value={orderTrackUrl}
                onChange={e => setOrderTrackUrl(e.target.value)}
                placeholder="https://shiprocket.co/tracking or leave empty for built-in page"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                If provided, customers without a specific order number will be redirected to this URL. Leave empty to use the built-in order tracking page where customers can search by order number.
              </p>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="gst" title="GST & Invoicing" />
          {isSectionOpen("gst") && <div className="card-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: gstEnabled ? '#f0fdf4' : '#f8fafc', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Enable GST</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Turn on to add GST fields to products and generate tax invoices</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: gstEnabled ? '#22c55e' : '#cbd5e1', borderRadius: 24, transition: '0.3s' }}>
                  <span style={{ position: 'absolute', content: '""', height: 18, width: 18, left: gstEnabled ? 22 : 3, bottom: 3, backgroundColor: 'white', borderRadius: '50%', transition: '0.3s' }}></span>
                </span>
              </label>
            </div>
            {!gstEnabled && (
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 0 }}>
                GST is disabled. Enable it to configure GSTIN, HSN codes, GST rates, and tax invoicing.
              </p>
            )}
            {gstEnabled && (<>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Set up your GST details to generate proper tax invoices for orders. If you are not GST registered, leave these empty — a simple bill will still be available.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder="e.g., 27AABCU9603R1ZX"
                  maxLength={15}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${gstinError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', letterSpacing: 1 }}
                />
                {gstinError ? (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{gstinError}</p>
                ) : gstin && !gstinError ? (
                  <p style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Valid GSTIN format</p>
                ) : (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Your 15-digit GST Identification Number</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Legal Business Name</label>
                <input
                  type="text"
                  value={gstLegalName}
                  onChange={e => setGstLegalName(e.target.value)}
                  placeholder="As registered with GST"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>May differ from your store display name</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Registered State</label>
                <input
                  type="text"
                  value={gstState}
                  onChange={e => setGstState(e.target.value)}
                  placeholder="e.g., Maharashtra"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Used to determine CGST/SGST vs IGST</p>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Business Address</label>
                <input
                  type="text"
                  value={gstAddress}
                  onChange={e => setGstAddress(e.target.value)}
                  placeholder="Full registered address"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Printed on every GST invoice</p>
              </div>
            </div>
            </>)}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: gstInvoiceEmailEnabled ? '#f0fdf4' : '#f8fafc', marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Include Invoice Link in Order Emails</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customers will get a "Download Invoice" link in their order confirmation email</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={gstInvoiceEmailEnabled} onChange={e => setGstInvoiceEmailEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: gstInvoiceEmailEnabled ? '#22c55e' : '#cbd5e1' }}>
                  <span style={{ position: 'absolute', left: gstInvoiceEmailEnabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="payment" title="Payment Methods" />
          {isSectionOpen("payment") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Control which payment options are available to customers at checkout.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: codEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Customer pays when the order is delivered</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={codEnabled} onChange={e => setCodEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s',
                  background: codEnabled ? '#22c55e' : '#cbd5e1',
                }}>
                  <span style={{
                    position: 'absolute', left: codEnabled ? 22 : 2, top: 2, width: 20, height: 20,
                    background: '#fff', borderRadius: '50%', transition: '0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Pay Online (Razorpay)</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Credit/Debit Card, UPI, Net Banking — configure credentials below</div>
              </div>
              <span style={{ fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Always On</span>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="credentials" title="Payment Credentials" />
          {isSectionOpen("credentials") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Enter your Razorpay credentials to enable online payments on your store.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Razorpay Key ID</label>
              <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Razorpay Key Secret</label>
              <input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="Leave empty to keep current secret" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>}
        </div>

        {message && (
          <div style={{ background: message.includes('success') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.includes('success') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '12px 16px', color: message.includes('success') ? '#166534' : '#dc2626', marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginBottom: 24 }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {showCurrencyConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Change Store Currency</h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                {savedCurrencyRef.current} → {pendingCurrency}
              </p>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 8 }}>Important Warning</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>
                  <li>Exchange rates fluctuate constantly. The rate used is a snapshot at this moment and may differ from the actual rate later.</li>
                  <li>Minor rounding differences may occur during conversion (e.g., $9.99 may become a slightly different value if converted back).</li>
                  <li>This action cannot be perfectly reversed — converting back will use the then-current exchange rate, which may differ.</li>
                </ul>
              </div>

              {currencyExchangeRate ? (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0c4a6e', marginBottom: 4 }}>Exchange Rate</p>
                  <p style={{ margin: 0, fontSize: 15, color: '#0369a1' }}>
                    1 {savedCurrencyRef.current} = {currencyExchangeRate} {pendingCurrency}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
                    Example: {formatPrice(100, savedCurrencyRef.current)} → {formatPrice(Math.round(100 * currencyExchangeRate * 100) / 100, pendingCurrency)}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 14 }}>
                  Fetching exchange rate...
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#16a34a', marginBottom: 6 }}>Will be converted:</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                  <li>Product prices (price, compare price, cost price)</li>
                  <li>Coupon values (fixed discount amounts, minimum order values, max discount caps)</li>
                </ul>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#dc2626', marginBottom: 6 }}>Will NOT be converted:</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                  <li>Existing orders — they are historical records and will retain their original currency</li>
                  <li>Shipping charges in settings — you will need to update these manually</li>
                  <li>Percentage-based coupon values — only the fixed amounts and thresholds are converted</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCurrencyCancel}
                disabled={currencyConverting}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#334155' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCurrencyConfirm}
                disabled={!currencyExchangeRate || currencyConverting}
                style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: (!currencyExchangeRate || currencyConverting) ? '#94a3b8' : '#dc2626', color: '#fff', cursor: (!currencyExchangeRate || currencyConverting) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
              >
                {currencyConverting ? 'Converting...' : 'Convert & Change Currency'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
