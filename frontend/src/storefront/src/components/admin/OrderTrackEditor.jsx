import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import { API_BASE } from '../../config.js';

export default function OrderTrackEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [showOrderTrack, setShowOrderTrack] = useState(true);
  const [orderTrackUrl, setOrderTrackUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (siteConfig?.settings) {
      setShowOrderTrack(siteConfig.settings.showOrderTrack !== false);
      setOrderTrackUrl(siteConfig.settings.orderTrackUrl || '');
    }
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate({ showOrderTrack, orderTrackUrl });
    }
  }, [showOrderTrack, orderTrackUrl]);

  async function handleSave(e) {
    e.preventDefault();
    if (orderTrackUrl && !orderTrackUrl.startsWith('http://') && !orderTrackUrl.startsWith('https://')) {
      setStatus('error:Please enter a valid URL starting with http:// or https://');
      return;
    }
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { showOrderTrack, orderTrackUrl: orderTrackUrl.trim() } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        if (refetchSite) refetchSite();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Failed to save'));
      }
    } catch (err) {
      setStatus('error:' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <SectionToggle
        enabled={showOrderTrack}
        onChange={setShowOrderTrack}
        label="Show Order Tracking Link"
        description="Show or hide the Order Tracking link in the navigation bar"
      />

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
          External Tracking URL (optional)
        </label>
        <input
          type="text"
          value={orderTrackUrl}
          onChange={(e) => setOrderTrackUrl(e.target.value)}
          placeholder="https://shiprocket.co/tracking or leave empty for default page"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
            color: '#334155',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          If provided, clicking "Order Track" in the navbar will redirect to this URL.
          Leave empty to use the built-in tracking page.
        </p>
      </div>

      {status.startsWith('error:') && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {status.replace('error:', '')}
        </div>
      )}
      {status === 'success' && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: 13, marginBottom: 16 }}>
          Settings saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
