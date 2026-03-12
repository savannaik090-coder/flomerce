import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';

export default function SettingsSection() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [brandName, setBrandName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeMsg, setVerificationCodeMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState(null);
  const [domainToken, setDomainToken] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainMsg, setDomainMsg] = useState('');
  const [domainError, setDomainError] = useState('');

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
        setPhone(settings.phone || data.phone || '');
        setEmail(settings.email || data.email || '');
        setAddress(settings.address || data.address || '');
        setRazorpayKeyId(settings.razorpayKeyId || '');
        setRazorpayKeySecret(settings.razorpayKeySecret || '');
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
        email,
        address,
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

  async function handleSetVerificationCode() {
    if (!verificationCode.trim()) return;
    if (verificationCode.length < 4 || verificationCode.length > 20) {
      setVerificationCodeMsg('Code must be 4-20 characters.');
      return;
    }
    setVerificationCodeMsg('');
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/site-admin/set-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ siteId: siteConfig.id, verificationCode: verificationCode.trim() }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setVerificationCode('');
        setVerificationCodeMsg('Verification code set successfully!');
      } else {
        setVerificationCodeMsg('Failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setVerificationCodeMsg('Failed: ' + e.message);
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
      } else {
        setDomainError(result.error || 'Failed to remove domain');
      }
    } catch (e) {
      setDomainError('Failed to remove domain: ' + e.message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
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
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Admin Panel Access</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Set a verification code for direct admin panel access. Keep this code private.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="e.g. mycode123 (4-20 characters)"
              maxLength={20}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <button type="button" className="btn btn-primary" onClick={handleSetVerificationCode} style={{ whiteSpace: 'nowrap' }}>Set Code</button>
          </div>
          {verificationCodeMsg && (
            <p style={{ color: verificationCodeMsg.includes('success') ? '#16a34a' : '#ef4444', fontSize: 13, marginTop: 8 }}>
              {verificationCodeMsg}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Custom Domain</h3></div>
        <div className="card-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Connect your own domain (e.g. <strong>www.mystore.com</strong>) to your store. Only <code>www.</code> subdomains are supported — root domains like <code>mystore.com</code> are not supported.
          </p>

          {customDomain && domainStatus && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: domainStatus === 'verified' ? '#f0fdf4' : domainStatus === 'failed' ? '#fef2f2' : '#fffbeb', border: `1px solid ${domainStatus === 'verified' ? '#bbf7d0' : domainStatus === 'failed' ? '#fecaca' : '#fde68a'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{customDomain}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                  background: domainStatus === 'verified' ? '#dcfce7' : domainStatus === 'failed' ? '#fee2e2' : '#fef3c7',
                  color: domainStatus === 'verified' ? '#166534' : domainStatus === 'failed' ? '#dc2626' : '#92400e',
                }}>{domainStatus}</span>
              </div>
            </div>
          )}

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

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={handleVerifyDomain} disabled={domainVerifying} style={{ flex: 1 }}>
                  {domainVerifying ? 'Verifying...' : 'Verify Now'}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleRemoveDomain} style={{ color: '#ef4444', borderColor: '#fecaca' }}>
                  Remove Domain
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
