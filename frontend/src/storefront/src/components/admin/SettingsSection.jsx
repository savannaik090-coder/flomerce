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
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeMsg, setVerificationCodeMsg] = useState('');
  const [loading, setLoading] = useState(true);

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
        let socialLinks = data.social_links || data.socialLinks || {};
        if (typeof socialLinks === 'string') {
          try { socialLinks = JSON.parse(socialLinks); } catch (e) { socialLinks = {}; }
        }
        setBrandName(data.brand_name || data.brandName || '');
        setPhone(settings.phone || data.phone || '');
        setEmail(settings.email || data.email || '');
        setAddress(settings.address || data.address || '');
        setInstagram(settings.social?.instagram || socialLinks.instagram || '');
        setFacebook(settings.social?.facebook || socialLinks.facebook || '');
        setTwitter(settings.social?.twitter || socialLinks.twitter || '');
        setYoutube(settings.social?.youtube || socialLinks.youtube || '');
        setRazorpayKeyId(settings.razorpayKeyId || '');
        setRazorpayKeySecret(settings.razorpayKeySecret || '');
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
        social: { instagram, facebook, twitter, youtube },
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
          <div className="card-header"><h3 className="card-title">Social Links</h3></div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Instagram</label>
                <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Facebook</label>
                <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Twitter</label>
                <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>YouTube</label>
                <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
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

      <div className="card">
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
    </div>
  );
}
