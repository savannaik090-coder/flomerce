import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';
import { TIMEZONE_OPTIONS, safeFormatInTimezone } from '../../utils/dateFormatter.js';
import { getExchangeRates } from '../../services/currencyService.js';
import ConfirmModal from './ConfirmModal.jsx';
import { formatPrice } from '../../utils/priceFormatter.js';
import { COUNTRIES, getStatesForCountry } from '../../utils/countryStates.js';
import PhoneInput from '../ui/PhoneInput.jsx';
import { API_BASE, PLATFORM_DOMAIN } from '../../config.js';
import { isPlanSufficient } from './FeatureGate.jsx';
import ShopperLanguageSection from './ShopperLanguageSection.jsx';

export default function SettingsSection() {
  const { t } = useTranslation('admin');
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const [brandName, setBrandName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [email, setEmail] = useState('');
  const [notificationCcEmails, setNotificationCcEmails] = useState([]);
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

  const [whatsappNotificationsEnabled, setWhatsappNotificationsEnabled] = useState(false);
  const [whatsappProvider, setWhatsappProvider] = useState('meta');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [whatsappUseTemplates, setWhatsappUseTemplates] = useState(true);
  const [whatsappLanguage, setWhatsappLanguage] = useState('en');
  const [whatsappTestSending, setWhatsappTestSending] = useState(false);
  const [whatsappTestResult, setWhatsappTestResult] = useState('');

  const [abandonedCartEnabled, setAbandonedCartEnabled] = useState(false);
  const [abandonedCartDelayHours, setAbandonedCartDelayHours] = useState('1');
  const [abandonedCartMaxReminders, setAbandonedCartMaxReminders] = useState('1');
  const [abandonedCartWhatsApp, setAbandonedCartWhatsApp] = useState(true);
  const [abandonedCartEmail, setAbandonedCartEmail] = useState(true);

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
  const storageKey = siteConfig?.id ? `flomerce_domain_tips_${siteConfig.id}` : null;

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
        setNotificationCcEmails(Array.isArray(settings.notificationCcEmails) ? settings.notificationCcEmails.slice(0, 5) : []);
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
        setWhatsappNotificationsEnabled(settings.whatsappNotificationsEnabled === true);
        setWhatsappProvider(settings.whatsappProvider || 'meta');
        setWhatsappAccessToken(settings.whatsappAccessToken || '');
        setWhatsappPhoneNumberId(settings.whatsappPhoneNumberId || '');
        setWhatsappApiKey(settings.whatsappApiKey || '');
        setWhatsappUseTemplates(settings.whatsappUseTemplates !== false);
        setWhatsappLanguage(settings.whatsappLanguage || 'en');
        const ac = settings.abandonedCartConfig || {};
        setAbandonedCartEnabled(ac.enabled === true);
        setAbandonedCartDelayHours(ac.delayHours != null ? String(ac.delayHours) : '1');
        setAbandonedCartMaxReminders(ac.maxReminders != null ? String(ac.maxReminders) : '1');
        setAbandonedCartWhatsApp(ac.whatsapp !== false);
        setAbandonedCartEmail(ac.email !== false);
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
    if (value.length !== 15) return t('settingsSection.gst.gstinErrLen');
    if (!gstinRegex.test(value)) return t('settingsSection.gst.gstinErrFmt');
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
        setMessage(t('settingsSection.fixGstinFirst'));
        setMessageIsError(true);
        return;
      }
    }
    setSaving(true);
    setMessage('');
    setMessageIsError(false);
    try {
      const settings = {
        phone,
        whatsapp,
        showFloatingButton,
        email,
        notificationCcEmails: (notificationCcEmails || [])
          .map(e => (e || '').trim())
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
          .slice(0, 5),
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
        whatsappNotificationsEnabled,
        whatsappProvider,
        whatsappUseTemplates,
        whatsappLanguage,
        abandonedCartConfig: {
          enabled: abandonedCartEnabled,
          delayHours: Number(abandonedCartDelayHours) || 1,
          maxReminders: Number(abandonedCartMaxReminders) || 1,
          whatsapp: abandonedCartWhatsApp,
          email: abandonedCartEmail,
        },
      };
      if (whatsappProvider === 'meta') {
        if (whatsappAccessToken) settings.whatsappAccessToken = whatsappAccessToken;
        if (whatsappPhoneNumberId) settings.whatsappPhoneNumberId = whatsappPhoneNumberId;
      } else if (whatsappProvider === 'interakt') {
        if (whatsappApiKey) settings.whatsappApiKey = whatsappApiKey;
      }
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
        setMessage(t('settingsSection.savedSuccess'));
        setMessageIsError(false);
        if (refetchSite) refetchSite();
      } else {
        setMessage(t('settingsSection.saveFailed', { error: result.error || t('settingsSection.unknownError') }));
        setMessageIsError(true);
      }
    } catch (e) {
      setMessage(t('settingsSection.saveFailed', { error: e.message }));
      setMessageIsError(true);
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
        setMessage(t('settingsSection.currencyConvertFailed', { error: convResult.error || t('settingsSection.unknownError') }));
        setMessageIsError(true);
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
      setMessage(t('settingsSection.currencyChangedMsg', {
        currency: pendingCurrency,
        products: convData.converted?.products || 0,
        coupons: convData.converted?.coupons || 0,
      }));
      setMessageIsError(false);
    } catch (e) {
      setMessage(t('settingsSection.currencyConvertFailed', { error: e.message }));
      setMessageIsError(true);
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
      setDomainError(t('settingsSection.customDomain.errors.www'));
      return;
    }
    const parts = val.split('.');
    if (parts.length < 3) {
      setDomainError(t('settingsSection.customDomain.errors.full'));
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
        setDomainMsg(t('settingsSection.customDomain.savedDomainMsg'));
      } else {
        setDomainError(result.error || t('settingsSection.customDomain.saveDomainFailed'));
      }
    } catch (e) {
      setDomainError(t('settingsSection.customDomain.saveDomainFailedDetail', { error: e.message }));
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
          setDomainMsg(t('settingsSection.customDomain.verifiedMsg'));
        } else {
          const errDetails = (result.data.errors || []).join(' ');
          setDomainError(t('settingsSection.customDomain.verifyFailed', { details: errDetails }));
        }
      } else {
        setDomainError(result.error || t('settingsSection.customDomain.verifyFailedShort'));
      }
    } catch (e) {
      setDomainError(t('settingsSection.customDomain.verifyFailedDetail', { error: e.message }));
    } finally {
      setDomainVerifying(false);
    }
  }

  function handleRemoveDomain() {
    setConfirmModal({
      title: t('settingsSection.customDomain.removeTitle'),
      message: t('settingsSection.customDomain.removeMessage'),
      danger: true,
      confirmText: t('settingsSection.customDomain.removeConfirm'),
      onConfirm: async () => {
        await doRemoveDomain();
      }
    });
  }

  async function doRemoveDomain() {
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
        setDomainMsg(t('settingsSection.customDomain.removedMsg'));
        if (storageKey) localStorage.removeItem(storageKey);
      } else {
        setDomainError(result.error || t('settingsSection.customDomain.removeFailed'));
      }
    } catch (e) {
      setDomainError(t('settingsSection.customDomain.removeFailedDetail', { error: e.message }));
    }
  }

  async function handleRenameSubdomain() {
    const newSub = subdomainInput.trim().toLowerCase();
    if (!newSub || newSub === currentSubdomain) {
      setSubdomainError(t('settingsSection.storeUrl.errors.diff'));
      setShowSubdomainConfirm(false);
      return;
    }
    if (newSub.length < 3) {
      setSubdomainError(t('settingsSection.storeUrl.errors.short'));
      setShowSubdomainConfirm(false);
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(newSub) && newSub.length > 1) {
      setSubdomainError(t('settingsSection.storeUrl.errors.format'));
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
        setSubdomainMsg(t('settingsSection.storeUrl.successMsg'));
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setSubdomainError(result.error || t('settingsSection.storeUrl.renameFailed'));
      }
    } catch (e) {
      setSubdomainError(t('settingsSection.storeUrl.renameFailedDetail', { error: e.message }));
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
    <>
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <CollapsibleHeader sectionKey="storeUrl" title={t('settingsSection.storeUrl.title')} />
        {isSectionOpen('storeUrl') && <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            <Trans
              i18nKey="settingsSection.storeUrl.accessibleAt"
              t={t}
              values={{ url: `${currentSubdomain}.${PLATFORM_DOMAIN}` }}
              components={{
                a: <a href={`https://${currentSubdomain}.${PLATFORM_DOMAIN}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#2563eb' }} />,
              }}
            />
          </p>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.storeUrl.subdomainLabel')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              type="text"
              value={subdomainInput}
              onChange={(e) => { setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainError(''); setSubdomainMsg(''); setShowSubdomainConfirm(false); }}
              placeholder={t('settingsSection.storeUrl.placeholder')}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px 0 0 6px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <span style={{ padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderInlineStart: 'none', borderRadius: '0 6px 6px 0', fontSize: 14, color: '#64748b', whiteSpace: 'nowrap' }}>.{PLATFORM_DOMAIN}</span>
          </div>
          {subdomainInput && subdomainInput !== currentSubdomain && !showSubdomainConfirm && !subdomainSaving && (
            <button type="button" className="btn btn-primary" onClick={() => setShowSubdomainConfirm(true)} style={{ marginTop: 12, fontSize: 13 }}>
              {t('settingsSection.storeUrl.changeBtn')}
            </button>
          )}
          {showSubdomainConfirm && (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>{t('settingsSection.storeUrl.confirmTitle')}</p>
              <p style={{ fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                <Trans
                  i18nKey="settingsSection.storeUrl.confirmDesc"
                  t={t}
                  values={{ from: `${currentSubdomain}.${PLATFORM_DOMAIN}`, to: `${subdomainInput.trim()}.${PLATFORM_DOMAIN}` }}
                  components={{ b: <strong /> }}
                />
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={handleRenameSubdomain} disabled={subdomainSaving} style={{ fontSize: 13, background: '#f59e0b', borderColor: '#f59e0b' }}>
                  {subdomainSaving ? t('settingsSection.storeUrl.renaming') : t('settingsSection.storeUrl.yesRename')}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowSubdomainConfirm(false); setSubdomainInput(currentSubdomain); }} style={{ fontSize: 13 }}>
                  {t('settingsSection.storeUrl.cancel')}
                </button>
              </div>
            </div>
          )}
          {subdomainSaving && !showSubdomainConfirm && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{t('settingsSection.storeUrl.renamingMsg')}</p>
          )}
          {subdomainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 8 }}>{subdomainMsg}</p>}
          {subdomainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{subdomainError}</p>}
        </div>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <CollapsibleHeader sectionKey="customDomain" title={t('settingsSection.customDomain.title')} />
        {isSectionOpen('customDomain') && <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            <Trans i18nKey="settingsSection.customDomain.intro" t={t} components={{ b: <strong />, c: <code /> }} />
          </p>

          {customDomain && domainStatus === 'verified' ? (
            <div>
              <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#16a34a', fontSize: 18 }}>&#10003;</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{customDomain}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', background: '#dcfce7', color: '#166534' }}>{t('settingsSection.customDomain.statusVerified')}</span>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleRemoveDomain} style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: 12, padding: '6px 12px' }}>
                    {t('settingsSection.customDomain.removeDomain')}
                  </button>
                </div>
                <p style={{ fontSize: 13, color: '#166534', marginTop: 8, marginBottom: 0 }}>
                  {t('settingsSection.customDomain.verifiedDesc')}
                </p>
              </div>

              {!whatsNextDismissed && (
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', position: 'relative' }}>
                <button type="button" onClick={() => { setWhatsNextDismissed(true); dismissTip(customDomain, 'whatsNext'); }} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#1e40af', opacity: 0.6, lineHeight: 1 }} title={t('settingsSection.customDomain.dismiss')}>&times;</button>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6, paddingInlineEnd: 20 }}>{t('settingsSection.customDomain.whatsNext.title')}</p>
                <ul style={{ fontSize: 12, color: '#1e40af', margin: 0, paddingInlineStart: 18 }}>
                  <li style={{ marginBottom: 4 }}><Trans i18nKey="settingsSection.customDomain.whatsNext.item1" t={t} components={{ b: <strong /> }} /></li>
                  <li style={{ marginBottom: 4 }}><Trans i18nKey="settingsSection.customDomain.whatsNext.item2" t={t} components={{ b: <strong /> }} /></li>
                  <li style={{ marginBottom: 4 }}>{t('settingsSection.customDomain.whatsNext.item3')}</li>
                  <li><Trans i18nKey="settingsSection.customDomain.whatsNext.item4" t={t} values={{ domain: customDomain }} components={{ b: <strong /> }} /></li>
                </ul>
              </div>
              )}

              {!rootDomainTipDismissed && (
                <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', position: 'relative' }}>
                  <button type="button" onClick={() => { setRootDomainTipDismissed(true); dismissTip(customDomain, 'rootRedirect'); }} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e', opacity: 0.6, lineHeight: 1 }} title={t('settingsSection.customDomain.dismiss')}>&times;</button>
                  <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 8, paddingInlineEnd: 20 }}>{t('settingsSection.customDomain.rootRedirect.title')}</p>
                  <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                    <Trans i18nKey="settingsSection.customDomain.rootRedirect.desc" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                  </p>
                  <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>{t('settingsSection.customDomain.rootRedirect.cloudflareTitle')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #fde68a', wordBreak: 'break-all' }}>
                        CNAME &nbsp; @ &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{t('settingsSection.customDomain.copy')}</button>
                    </div>
                    <p style={{ fontSize: 11, color: '#92400e', marginTop: 4, opacity: 0.8 }}>
                      <Trans i18nKey="settingsSection.customDomain.rootRedirect.cloudflareNote" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                    </p>
                  </div>
                  <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>{t('settingsSection.customDomain.rootRedirect.othersTitle')}</p>
                    <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                      <Trans i18nKey="settingsSection.customDomain.rootRedirect.othersDesc" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                    </p>
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
                        }}>{t(`settingsSection.customDomain.status.${domainStatus}`, domainStatus)}</span>
                      </div>
                      <button type="button" className="btn btn-outline" onClick={handleRemoveDomain} style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: 12, padding: '4px 10px' }}>
                        {t('settingsSection.customDomain.remove')}
                      </button>
                    </div>
                  </div>
                  {domainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>{domainMsg}</p>}
                  {domainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{domainError}</p>}
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.customDomain.domainLabel')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => { setDomainInput(e.target.value); setDomainError(''); }}
                      placeholder={t('settingsSection.customDomain.placeholder')}
                      style={{ flex: 1, padding: '10px 12px', border: `1px solid ${domainError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleSaveDomain} disabled={domainSaving} style={{ whiteSpace: 'nowrap' }}>
                      {domainSaving ? t('settingsSection.customDomain.saving') : t('settingsSection.customDomain.saveBtn')}
                    </button>
                  </div>
                  {domainError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 6 }}>{domainError}</p>}
                  {domainMsg && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 6 }}>{domainMsg}</p>}
                </div>
              )}

              {customDomain && domainToken && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{t('settingsSection.customDomain.dnsTitle')}</p>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{t('settingsSection.customDomain.step1')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                        CNAME &nbsp; www &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{t('settingsSection.customDomain.copy')}</button>
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{t('settingsSection.customDomain.step2')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                        TXT &nbsp; _flomerce-verify &nbsp; → &nbsp; {domainToken}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(domainToken)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{t('settingsSection.customDomain.copy')}</button>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>
                      <Trans i18nKey="settingsSection.customDomain.step2Note" t={t} components={{ c: <code /> }} />
                    </p>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>{t('settingsSection.customDomain.step3Title')}</p>
                    <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                      <Trans i18nKey="settingsSection.customDomain.rootRedirect.desc" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                    </p>
                    <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>{t('settingsSection.customDomain.rootRedirect.cloudflareTitle')}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '6px 10px', borderRadius: 4, border: '1px solid #fde68a', wordBreak: 'break-all' }}>
                          CNAME &nbsp; @ &nbsp; → &nbsp; {PLATFORM_DOMAIN}
                        </code>
                        <button type="button" onClick={() => copyToClipboard(PLATFORM_DOMAIN)} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>{t('settingsSection.customDomain.copy')}</button>
                      </div>
                      <p style={{ fontSize: 11, color: '#92400e', marginTop: 4, opacity: 0.8 }}>
                        <Trans i18nKey="settingsSection.customDomain.rootRedirect.cloudflareNote" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                      </p>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 6, padding: 10 }}>
                      <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>{t('settingsSection.customDomain.rootRedirect.othersTitle')}</p>
                      <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                        <Trans i18nKey="settingsSection.customDomain.rootRedirect.othersDesc" t={t} values={{ root: customDomain.replace(/^www\./, ''), www: customDomain }} components={{ b: <strong /> }} />
                      </p>
                    </div>
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleVerifyDomain} disabled={domainVerifying} style={{ width: '100%' }}>
                    {domainVerifying ? t('settingsSection.customDomain.verifying') : t('settingsSection.customDomain.verifyNow')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>}
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="brand" title={t('settingsSection.brand.title')} />
          {isSectionOpen('brand') && <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.brand.nameLabel')}</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="contact" title={t('settingsSection.contact.title')} />
          {isSectionOpen('contact') && <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fas fa-phone" style={{ marginInlineEnd: 6, color: '#2563eb' }} />{t('settingsSection.contact.phoneLabel')}
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                countryCode="IN"
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.contact.phoneHelp')}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                <i className="fab fa-whatsapp" style={{ marginInlineEnd: 6, color: '#25D366' }} />{t('settingsSection.contact.whatsappLabel')}
              </label>
              <PhoneInput
                value={whatsapp}
                onChange={setWhatsapp}
                countryCode="IN"
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.contact.whatsappHelp')}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{t('settingsSection.contact.floatingLabel')}</label>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {whatsapp ? t('settingsSection.contact.floatingHelpWa') : phone ? t('settingsSection.contact.floatingHelpPhone') : t('settingsSection.contact.floatingHelpNone')}
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
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.contact.emailLabel')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('settingsSection.contact.emailPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            {(() => {
              const ccAllowed = isPlanSufficient(siteConfig?.subscriptionPlan, 'growth');
              return (
                <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>
                      {t('settingsSection.contact.ccLabel')}
                      {!ccAllowed && (
                        <span style={{ marginInlineStart: 8, fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 999, fontWeight: 600 }}>{t('settingsSection.contact.ccGrowthBadge')}</span>
                      )}
                    </label>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{notificationCcEmails.length}/5</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
                    {t('settingsSection.contact.ccDesc')}
                  </p>
                  {!ccAllowed ? (
                    <div style={{ fontSize: 12, color: '#64748b', padding: '8px 0' }}>
                      <Trans i18nKey="settingsSection.contact.ccGrowthLock" t={t} components={{ b: <strong /> }} />
                    </div>
                  ) : (
                    <>
                      {notificationCcEmails.map((cc, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input
                            type="email"
                            value={cc}
                            onChange={(e) => {
                              const next = [...notificationCcEmails];
                              next[idx] = e.target.value;
                              setNotificationCcEmails(next);
                            }}
                            placeholder={t('settingsSection.contact.ccPlaceholder')}
                            style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                          <button
                            type="button"
                            onClick={() => setNotificationCcEmails(notificationCcEmails.filter((_, i) => i !== idx))}
                            style={{ padding: '6px 10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            {t('settingsSection.contact.ccRemove')}
                          </button>
                        </div>
                      ))}
                      {notificationCcEmails.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setNotificationCcEmails([...notificationCcEmails, ''])}
                          style={{ padding: '8px 12px', background: '#fff', color: '#0f172a', border: '1px dashed #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        >
                          {t('settingsSection.contact.ccAdd')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.contact.addressLabel')}</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder={t('settingsSection.contact.addressPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="currency" title={t('settingsSection.currency.title')} />
          {isSectionOpen("currency") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              {t('settingsSection.currency.intro')}
            </p>
            <select
              value={defaultCurrency}
              onChange={e => handleCurrencyChange(e.target.value)}
              style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
            >
              <option value="INR">{t('settingsSection.currency.options.INR')}</option>
              <option value="USD">{t('settingsSection.currency.options.USD')}</option>
              <option value="EUR">{t('settingsSection.currency.options.EUR')}</option>
              <option value="GBP">{t('settingsSection.currency.options.GBP')}</option>
              <option value="AED">{t('settingsSection.currency.options.AED')}</option>
              <option value="CAD">{t('settingsSection.currency.options.CAD')}</option>
              <option value="AUD">{t('settingsSection.currency.options.AUD')}</option>
              <option value="SAR">{t('settingsSection.currency.options.SAR')}</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{t('settingsSection.currency.selectorToggle')}</label>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('settingsSection.currency.selectorDesc')}</span>
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
          <CollapsibleHeader sectionKey="timezone" title={t('settingsSection.timezone.title')} />
          {isSectionOpen("timezone") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              {t('settingsSection.timezone.intro')}
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
                {t('settingsSection.timezone.currentTime', { time: safeFormatInTimezone(new Date(), timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}
              </p>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="shipping" title={t('settingsSection.shipping.title')} />
          {isSectionOpen("shipping") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.shipping.intro')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: deliveryEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.shipping.toggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{deliveryEnabled ? t('settingsSection.shipping.toggleOn') : t('settingsSection.shipping.toggleOff')}</div>
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
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.shipping.baseLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryFlatRate}
                    onChange={e => setDeliveryFlatRate(e.target.value)}
                    placeholder={t('settingsSection.shipping.basePh')}
                    style={{ width: 180, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.shipping.baseHelp')}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: deliveryFreeAboveEnabled ? '#f0fdf4' : '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.shipping.freeAboveLabel')}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.shipping.freeAboveDesc')}</div>
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
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.shipping.freeAboveValueLabel')}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={deliveryFreeAbove}
                      onChange={e => setDeliveryFreeAbove(e.target.value)}
                      placeholder={t('settingsSection.shipping.freeAbovePh')}
                      style={{ width: 180, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.shipping.freeAboveHelp')}</p>
                  </div>
                )}

                <div style={{ marginTop: 8, padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: deliveryRegionRates.length > 0 ? 12 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.shipping.overridesTitle')}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.shipping.overridesDesc')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryRegionRates(prev => [...prev, { country: '', state: '', rate: '' }])}
                      style={{ padding: '6px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {t('settingsSection.shipping.addOverride')}
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
                          <option value="">{t('settingsSection.shipping.selectCountry')}</option>
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
                            <option value="">{t('settingsSection.shipping.allStates')}</option>
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
                            placeholder={t('settingsSection.shipping.ratePh')}
                            style={{ width: 80, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                          />
                          <button
                            type="button"
                            onClick={() => setDeliveryRegionRates(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}
                            title={t('settingsSection.shipping.removeTitle')}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {deliveryRegionRates.length > 0 && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>
                      {t('settingsSection.shipping.priorityNote')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="cancellation" title={t('settingsSection.cancellation.title')} />
          {isSectionOpen("cancellation") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.cancellation.intro')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: cancellationEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.cancellation.toggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.cancellation.toggleDesc')}</div>
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
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.cancellation.windowLabel')}</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={cancellationWindowHours}
                  onChange={e => setCancellationWindowHours(e.target.value)}
                  style={{ width: 120, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.cancellation.windowHelp')}</p>
              </div>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="returns" title={t('settingsSection.returns.title')} />
          {isSectionOpen("returns") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.returns.intro')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: returnsEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.returns.toggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.returns.toggleDesc')}</div>
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
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.returns.windowLabel')}</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={returnWindowDays}
                    onChange={e => setReturnWindowDays(e.target.value)}
                    style={{ width: 120, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.returns.windowHelp')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 12, background: replacementEnabled ? '#f0fdf4' : '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.returns.replacementLabel')}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.returns.replacementDesc')}</div>
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
          <CollapsibleHeader sectionKey="tracking" title={t('settingsSection.tracking.title')} />
          {isSectionOpen("tracking") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.tracking.intro')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: showOrderTrack ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.tracking.toggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.tracking.toggleDesc')}</div>
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
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.tracking.urlLabel')}</label>
              <input
                type="text"
                value={orderTrackUrl}
                onChange={e => setOrderTrackUrl(e.target.value)}
                placeholder={t('settingsSection.tracking.urlPh')}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {t('settingsSection.tracking.urlHelp')}
              </p>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="gst" title={t('settingsSection.gst.title')} />
          {isSectionOpen("gst") && <div className="card-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: gstEnabled ? '#f0fdf4' : '#f8fafc', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.gst.toggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.gst.toggleDesc')}</div>
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
                {t('settingsSection.gst.disabledNote')}
              </p>
            )}
            {gstEnabled && (<>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.gst.intro')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.gst.gstinLabel')}</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder={t('settingsSection.gst.gstinPh')}
                  maxLength={15}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${gstinError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', letterSpacing: 1 }}
                />
                {gstinError ? (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{gstinError}</p>
                ) : gstin && !gstinError ? (
                  <p style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>{t('settingsSection.gst.gstinValid')}</p>
                ) : (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.gst.gstinHelp')}</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.gst.legalNameLabel')}</label>
                <input
                  type="text"
                  value={gstLegalName}
                  onChange={e => setGstLegalName(e.target.value)}
                  placeholder={t('settingsSection.gst.legalNamePh')}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.gst.legalNameHelp')}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.gst.stateLabel')}</label>
                <input
                  type="text"
                  value={gstState}
                  onChange={e => setGstState(e.target.value)}
                  placeholder={t('settingsSection.gst.statePh')}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.gst.stateHelp')}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.gst.addressLabel')}</label>
                <input
                  type="text"
                  value={gstAddress}
                  onChange={e => setGstAddress(e.target.value)}
                  placeholder={t('settingsSection.gst.addressPh')}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.gst.addressHelp')}</p>
              </div>
            </div>
            </>)}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: gstInvoiceEmailEnabled ? '#f0fdf4' : '#f8fafc', marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.gst.emailToggleLabel')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.gst.emailToggleDesc')}</div>
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
          <CollapsibleHeader sectionKey="whatsappBusiness" title={t('settingsSection.whatsappBusiness.title')} />
          {isSectionOpen("whatsappBusiness") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.whatsappBusiness.intro')}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, background: whatsappNotificationsEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                  <i className="fab fa-whatsapp" style={{ marginInlineEnd: 6, color: '#25D366' }} />{t('settingsSection.whatsappBusiness.toggleLabel')}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.whatsappBusiness.toggleDesc')}</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={whatsappNotificationsEnabled} onChange={e => setWhatsappNotificationsEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: whatsappNotificationsEnabled ? '#25D366' : '#cbd5e1' }}>
                  <span style={{ position: 'absolute', left: whatsappNotificationsEnabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>

            {whatsappNotificationsEnabled && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.whatsappBusiness.providerLabel')}</label>
                  <select value={whatsappProvider} onChange={e => setWhatsappProvider(e.target.value)} style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                    <option value="meta">{t('settingsSection.whatsappBusiness.providerOptionMeta')}</option>
                    <option value="interakt">{t('settingsSection.whatsappBusiness.providerOptionInterakt')}</option>
                  </select>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {whatsappProvider === 'meta' ? t('settingsSection.whatsappBusiness.providerHelpMeta') : t('settingsSection.whatsappBusiness.providerHelpInterakt')}
                  </p>
                </div>

                {whatsappProvider === 'meta' && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.whatsappBusiness.accessTokenLabel')}</label>
                      <input type="password" value={whatsappAccessToken} onChange={e => setWhatsappAccessToken(e.target.value)} placeholder={t('settingsSection.whatsappBusiness.accessTokenPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.whatsappBusiness.phoneIdLabel')}</label>
                      <input type="text" value={whatsappPhoneNumberId} onChange={e => setWhatsappPhoneNumberId(e.target.value)} placeholder={t('settingsSection.whatsappBusiness.phoneIdPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.whatsappBusiness.phoneIdHelp')}</p>
                    </div>
                  </>
                )}

                {whatsappProvider === 'interakt' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.whatsappBusiness.apiKeyLabel')}</label>
                    <input type="password" value={whatsappApiKey} onChange={e => setWhatsappApiKey(e.target.value)} placeholder={t('settingsSection.whatsappBusiness.apiKeyPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.whatsappBusiness.apiKeyHelp')}</p>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.whatsappBusiness.languageLabel')}</label>
                  <select value={whatsappLanguage} onChange={e => setWhatsappLanguage(e.target.value)} style={{ width: '100%', maxWidth: 200, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                    <option value="en">{t('settingsSection.whatsappBusiness.langOptions.en')}</option>
                    <option value="hi">{t('settingsSection.whatsappBusiness.langOptions.hi')}</option>
                    <option value="ta">{t('settingsSection.whatsappBusiness.langOptions.ta')}</option>
                    <option value="te">{t('settingsSection.whatsappBusiness.langOptions.te')}</option>
                    <option value="kn">{t('settingsSection.whatsappBusiness.langOptions.kn')}</option>
                    <option value="ml">{t('settingsSection.whatsappBusiness.langOptions.ml')}</option>
                    <option value="mr">{t('settingsSection.whatsappBusiness.langOptions.mr')}</option>
                    <option value="bn">{t('settingsSection.whatsappBusiness.langOptions.bn')}</option>
                    <option value="gu">{t('settingsSection.whatsappBusiness.langOptions.gu')}</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{t('settingsSection.whatsappBusiness.useTemplatesLabel')}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('settingsSection.whatsappBusiness.useTemplatesDesc')}</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                    <input type="checkbox" checked={whatsappUseTemplates} onChange={e => setWhatsappUseTemplates(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: whatsappUseTemplates ? '#10b981' : '#cbd5e1' }}>
                      <span style={{ position: 'absolute', left: whatsappUseTemplates ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </span>
                  </label>
                </div>

                <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 6 }}>{t('settingsSection.whatsappBusiness.notifyTitle')}</p>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
                    <li>{t('settingsSection.whatsappBusiness.notifyItem1')}</li>
                    <li>{t('settingsSection.whatsappBusiness.notifyItem2')}</li>
                    <li>{t('settingsSection.whatsappBusiness.notifyItem3')}</li>
                    <li>{t('settingsSection.whatsappBusiness.notifyItem4')}</li>
                    <li>{t('settingsSection.whatsappBusiness.notifyItem5')}</li>
                  </ul>
                </div>

                {whatsappUseTemplates && (
                  <div style={{ padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0c4a6e', marginBottom: 6 }}>{t('settingsSection.whatsappBusiness.templateSetupTitle')}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
                      <Trans i18nKey="settingsSection.whatsappBusiness.templateSetupDesc" t={t} components={{ b: <strong /> }} />
                    </p>
                  </div>
                )}
              </>
            )}
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="abandonedCart" title={t('settingsSection.abandonedCart.title')} />
          {isSectionOpen("abandonedCart") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.abandonedCart.intro')}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, background: abandonedCartEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                  <i className="fas fa-shopping-cart" style={{ marginInlineEnd: 6, color: '#f59e0b' }} />{t('settingsSection.abandonedCart.toggleLabel')}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.abandonedCart.toggleDesc')}</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={abandonedCartEnabled} onChange={e => setAbandonedCartEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: abandonedCartEnabled ? '#f59e0b' : '#cbd5e1' }}>
                  <span style={{ position: 'absolute', left: abandonedCartEnabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </span>
              </label>
            </div>

            {abandonedCartEnabled && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.abandonedCart.delayLabel')}</label>
                  <select value={abandonedCartDelayHours} onChange={e => setAbandonedCartDelayHours(e.target.value)} style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                    <option value="1">{t('settingsSection.abandonedCart.delayOpts.1')}</option>
                    <option value="3">{t('settingsSection.abandonedCart.delayOpts.3')}</option>
                    <option value="6">{t('settingsSection.abandonedCart.delayOpts.6')}</option>
                    <option value="12">{t('settingsSection.abandonedCart.delayOpts.12')}</option>
                    <option value="24">{t('settingsSection.abandonedCart.delayOpts.24')}</option>
                  </select>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.abandonedCart.delayHelp')}</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.abandonedCart.maxLabel')}</label>
                  <select value={abandonedCartMaxReminders} onChange={e => setAbandonedCartMaxReminders(e.target.value)} style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}>
                    <option value="1">{t('settingsSection.abandonedCart.maxOpts.1')}</option>
                    <option value="2">{t('settingsSection.abandonedCart.maxOpts.2')}</option>
                    <option value="3">{t('settingsSection.abandonedCart.maxOpts.3')}</option>
                  </select>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('settingsSection.abandonedCart.maxHelp')}</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{t('settingsSection.abandonedCart.channelsLabel')}</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: abandonedCartEmail ? '#f0fdf4' : '#f8fafc', cursor: 'pointer' }}>
                      <input type="checkbox" checked={abandonedCartEmail} onChange={e => setAbandonedCartEmail(e.target.checked)} />
                      <i className="fas fa-envelope" style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: 14 }}>{t('settingsSection.abandonedCart.emailChannel')}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: abandonedCartWhatsApp ? '#f0fdf4' : '#f8fafc', cursor: 'pointer' }}>
                      <input type="checkbox" checked={abandonedCartWhatsApp} onChange={e => setAbandonedCartWhatsApp(e.target.checked)} />
                      <i className="fab fa-whatsapp" style={{ color: '#25D366' }} />
                      <span style={{ fontSize: 14 }}>{t('settingsSection.abandonedCart.whatsappChannel')}</span>
                    </label>
                  </div>
                  {abandonedCartWhatsApp && !whatsappNotificationsEnabled && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{t('settingsSection.abandonedCart.whatsappWarning')}</p>
                  )}
                </div>

                <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 6 }}>{t('settingsSection.abandonedCart.howItWorksTitle')}</p>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
                    <li>{t('settingsSection.abandonedCart.howItWorks1')}</li>
                    <li>{t('settingsSection.abandonedCart.howItWorks2')}</li>
                    <li>{t('settingsSection.abandonedCart.howItWorks3')}</li>
                    <li>{t('settingsSection.abandonedCart.howItWorks4')}</li>
                  </ul>
                </div>

                {abandonedCartWhatsApp && whatsappNotificationsEnabled && whatsappUseTemplates && (
                  <div style={{ padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, marginTop: 16 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0c4a6e', marginBottom: 6 }}>{t('settingsSection.abandonedCart.templateTitle')}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
                      <Trans i18nKey="settingsSection.abandonedCart.templateDesc" t={t} components={{ b: <strong /> }} />
                    </p>
                  </div>
                )}
              </>
            )}
          </div>}
        </div>

        <ShopperLanguageSection
          open={isSectionOpen('shopperLanguage')}
          onToggle={() => toggleSection('shopperLanguage')}
        />

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="payment" title={t('settingsSection.payment.title')} />
          {isSectionOpen("payment") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {t('settingsSection.payment.intro')}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, background: codEnabled ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.payment.codTitle')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.payment.codDesc')}</div>
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
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{t('settingsSection.payment.razorpayTitle')}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('settingsSection.payment.razorpayDesc')}</div>
              </div>
              <span style={{ fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>{t('settingsSection.payment.alwaysOn')}</span>
            </div>
          </div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <CollapsibleHeader sectionKey="credentials" title={t('settingsSection.credentials.title')} />
          {isSectionOpen("credentials") && <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{t('settingsSection.credentials.intro')}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.credentials.keyIdLabel')}</label>
              <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder={t('settingsSection.credentials.keyIdPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{t('settingsSection.credentials.secretLabel')}</label>
              <input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder={t('settingsSection.credentials.secretPh')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>}
        </div>

        {message && (
          <div style={{ background: !messageIsError ? '#f0fdf4' : '#fef2f2', border: `1px solid ${!messageIsError ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '12px 16px', color: !messageIsError ? '#166534' : '#dc2626', marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginBottom: 24 }}>
          {saving ? t('settingsSection.savingButton') : t('settingsSection.saveButton')}
        </button>
      </form>

      {showCurrencyConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{t('settingsSection.currency.confirm.title')}</h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                {savedCurrencyRef.current} → {pendingCurrency}
              </p>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 8 }}>{t('settingsSection.currency.confirm.warningTitle')}</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>
                  <li>{t('settingsSection.currency.confirm.warning1')}</li>
                  <li>{t('settingsSection.currency.confirm.warning2')}</li>
                  <li>{t('settingsSection.currency.confirm.warning3')}</li>
                </ul>
              </div>

              {currencyExchangeRate ? (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0c4a6e', marginBottom: 4 }}>{t('settingsSection.currency.confirm.exchangeTitle')}</p>
                  <p style={{ margin: 0, fontSize: 15, color: '#0369a1' }}>
                    {t('settingsSection.currency.confirm.exchangeRow', { from: savedCurrencyRef.current, rate: currencyExchangeRate, to: pendingCurrency })}
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
                    {t('settingsSection.currency.confirm.exampleLabel', {
                      original: formatPrice(100, savedCurrencyRef.current),
                      converted: formatPrice(Math.round(100 * currencyExchangeRate * 100) / 100, pendingCurrency),
                    })}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 14 }}>
                  {t('settingsSection.currency.confirm.fetching')}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#16a34a', marginBottom: 6 }}>{t('settingsSection.currency.confirm.willConvertTitle')}</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                  <li>{t('settingsSection.currency.confirm.willConvert1')}</li>
                  <li>{t('settingsSection.currency.confirm.willConvert2')}</li>
                </ul>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#dc2626', marginBottom: 6 }}>{t('settingsSection.currency.confirm.willNotTitle')}</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                  <li>{t('settingsSection.currency.confirm.willNot1')}</li>
                  <li>{t('settingsSection.currency.confirm.willNot2')}</li>
                  <li>{t('settingsSection.currency.confirm.willNot3')}</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCurrencyCancel}
                disabled={currencyConverting}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#334155' }}
              >
                {t('settingsSection.currency.confirm.cancel')}
              </button>
              <button
                onClick={handleCurrencyConfirm}
                disabled={!currencyExchangeRate || currencyConverting}
                style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: (!currencyExchangeRate || currencyConverting) ? '#94a3b8' : '#dc2626', color: '#fff', cursor: (!currencyExchangeRate || currencyConverting) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
              >
                {currencyConverting ? t('settingsSection.currency.confirm.converting') : t('settingsSection.currency.confirm.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmText={confirmModal?.confirmText}
        cancelText={confirmModal?.cancelText}
        danger={confirmModal?.danger}
        onConfirm={() => { confirmModal?.onConfirm?.(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
      />
    </>
  );
}
