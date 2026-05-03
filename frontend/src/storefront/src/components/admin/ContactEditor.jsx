import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';

export default function ContactEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [showContact, setShowContact] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const dirty = useDirtyTracker({ showContact });

  useEffect(() => {
    if (siteConfig?.settings) {
      const val = siteConfig.settings.showContact !== false;
      setShowContact(val);
      dirty.baseline({ showContact: val });
    }
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (onPreviewUpdate) onPreviewUpdate({ showContact });
  }, [showContact]);

  async function handleSave(e) {
    if (e && e.preventDefault) e.preventDefault();
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
        body: JSON.stringify({ settings: { showContact } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        dirty.markSaved();
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
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showContact}
          onChange={setShowContact}
          label="Show Contact in Footer"
          description="Display 'Contact' link in the footer's customer service section"
        />

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
      </form>
    </div>
  );
}
