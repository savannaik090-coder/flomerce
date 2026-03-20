import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';

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
  const [showCurrencySelector, setShowCurrencySelector] = useState(true);
  const [returnsEnabled, setReturnsEnabled] = useState(false);
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [cancellationEnabled, setCancellationEnabled] = useState(false);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [showOrderTrack, setShowOrderTrack] = useState(true);
  const [orderTrackUrl, setOrderTrackUrl] = useState('');
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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
        setDefaultCurrency(settings.defaultCurrency || 'INR');
        setShowCurrencySelector(settings.showCurrencySelector !== false);
        setReturnsEnabled(settings.returnsEnabled === true);
        setReturnWindowDays(settings.returnWindowDays || 7);
        setCancellationEnabled(settings.cancellationEnabled === true);
        setCancellationWindowHours(settings.cancellationWindowHours || 24);
        setShowOrderTrack(settings.showOrderTrack !== false);
        setOrderTrackUrl(settings.orderTrackUrl || '');
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

  async function handleSaveSettings(e) {
    e.preventDefault();
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
        cancellationEnabled,
        cancellationWindowHours: Number(cancellationWindowHours) || 24,
        showOrderTrack,
        orderTrackUrl: orderTrackUrl.trim(),
      };
      if (razorpayKeyId) {
        settings.razorpayKeyId = razorpayKeyId;
      }
      if (razorpayKeySecret) {
        settings.razorpayKeySecret = razorpayKeySecret;
      }
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
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

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Store URL</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Your store is currently accessible at <a href={`https://${currentSubdomain}.fluxe.in`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#2563eb' }}>{currentSubdomain}.fluxe.in</a>
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
            <span style={{ padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 14, color: '#64748b', whiteSpace: 'nowrap' }}>.fluxe.in</span>
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
                Changing your subdomain will update your store URL from <strong>{currentSubdomain}.fluxe.in</strong> to <strong>{subdomainInput.trim()}.fluxe.in</strong>. The old URL will stop working immediately.
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
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Custom Domain</h3></div>
        <div className="card-content">
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
                        CNAME &nbsp; @ &nbsp; → &nbsp; fluxe.in
                      </code>
                      <button type="button" onClick={() => copyToClipboard('fluxe.in')} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
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
                        CNAME &nbsp; www &nbsp; → &nbsp; fluxe.in
                      </code>
                      <button type="button" onClick={() => copyToClipboard('fluxe.in')} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
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
                          CNAME &nbsp; @ &nbsp; → &nbsp; fluxe.in
                        </code>
                        <button type="button" onClick={() => copyToClipboard('fluxe.in')} style={{ padding: '6px 10px', border: '1px solid #fde68a', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Copy</button>
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
        </div>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Brand Information</h3></div>
          <div className="card-content">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Brand Name</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Contact Information</h3></div>
          <div className="card-content">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Default Currency</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Set the default currency for your store. All prices on your website, admin panel, and email notifications will be shown in this currency.
            </p>
            <select
              value={defaultCurrency}
              onChange={e => setDefaultCurrency(e.target.value)}
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Order Cancellation</h3>
          </div>
          <div className="card-content">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Return Orders</h3>
          </div>
          <div className="card-content">
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
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Order Tracking</h3>
          </div>
          <div className="card-content">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Payment Methods</h3>
          </div>
          <div className="card-content">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3 className="card-title">Payment Credentials</h3></div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Enter your Razorpay credentials to enable online payments on your store.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Razorpay Key ID</label>
              <input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} placeholder="rzp_live_..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Razorpay Key Secret</label>
              <input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} placeholder="Leave empty to keep current secret" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
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

    </div>
  );
}
