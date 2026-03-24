import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

export default function BookAppointmentEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const [showBookAppointment, setShowBookAppointment] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);

  const serverValueRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.settings) {
      const val = siteConfig.settings.showBookAppointment !== false;
      setShowBookAppointment(val);
      serverValueRef.current = val;
      hasLoadedRef.current = true;
    }
  }, [siteConfig?.settings]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setHasChanges(showBookAppointment !== serverValueRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ showBookAppointment });
  }, [showBookAppointment]);

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
        body: JSON.stringify({ settings: { showBookAppointment } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setHasChanges(false);
        serverValueRef.current = showBookAppointment;
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
    <div>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={handleSave} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showBookAppointment}
          onChange={setShowBookAppointment}
          label="Show Book Appointment Page"
          description="Show or hide the Book Appointment link in the navigation bar"
        />

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

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={handleSave} />
      </form>
    </div>
  );
}
