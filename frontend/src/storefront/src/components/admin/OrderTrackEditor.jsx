import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

export default function OrderTrackEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [showOrderTrack, setShowOrderTrack] = useState(true);
  const [orderTrackUrl, setOrderTrackUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);

  const dirty = useDirtyTracker({ showOrderTrack, orderTrackUrl });

  useEffect(() => {
    if (siteConfig?.settings) {
      const s = siteConfig.settings;
      const showVal = s.showOrderTrack !== false;
      const urlVal = s.orderTrackUrl || '';
      setShowOrderTrack(showVal);
      setOrderTrackUrl(urlVal);
      dirty.baseline({ showOrderTrack: showVal, orderTrackUrl: urlVal });
      setLoaded(true);
    }
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate({ showOrderTrack, orderTrackUrl });
    }
  }, [showOrderTrack, orderTrackUrl]);

  async function handleSave() {
    if (orderTrackUrl && !orderTrackUrl.startsWith('http://') && !orderTrackUrl.startsWith('https://')) {
      setStatus('error:' + "URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const trimmedUrl = orderTrackUrl.trim();
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { showOrderTrack, orderTrackUrl: trimmedUrl } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setOrderTrackUrl(trimmedUrl);
        dirty.markSaved({ showOrderTrack, orderTrackUrl: trimmedUrl });
        setStatus('success');
        if (refetchSite) refetchSite();
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || "Failed to save"));
      }
    } catch (err) {
      setStatus('error:' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SaveBar topBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSave} />

      <SectionToggle
        enabled={showOrderTrack}
        onChange={setShowOrderTrack}
        label="Show Track Order in Footer"
        description="Display 'Track Order' link in the footer's customer service section"
      />

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
          Tracking URL (Optional)
        </label>
        <input
          type="text"
          value={orderTrackUrl}
          onChange={(e) => setOrderTrackUrl(e.target.value)}
          placeholder="https://example.com/track"
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
          If set, customers will be redirected to this URL. Otherwise, they'll see the built-in order tracking page.
        </p>
      </div>

      {status.startsWith('error:') && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {status.replace('error:', '')}
        </div>
      )}
      {status === 'success' && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: 13, marginBottom: 16 }}>
          Saved successfully!
        </div>
      )}

      <SaveBar saving={saving} hasChanges={dirty.hasChanges} onSave={handleSave} />
      {!loaded && null}
    </div>
  );
}
