import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SaveBar from './SaveBar.jsx';
import { getPrivacyDefaults } from '../../defaults/index.js';
import { API_BASE } from '../../config.js';

export default function PrivacyEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const brand = siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';
  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ intro, sections });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ privacyContent: { intro, sections: sections.map(s => ({ title: s.title, content: s.content })) } });
  }, [intro, sections]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const pc = settings.privacyContent;
        let iVal, sVal;
        if (pc && pc.sections && pc.sections.length > 0) {
          iVal = pc.intro || '';
          sVal = pc.sections;
        } else {
          const d = getPrivacyDefaults(brand, email, phone);
          iVal = d.intro;
          sVal = d.sections;
        }
        setIntro(iVal);
        setSections(sVal);
        serverValuesRef.current = JSON.stringify({ intro: iVal, sections: sVal });
      }
    } catch (e) {
      console.error('Failed to load privacy settings:', e);
      const d = getPrivacyDefaults(brand, email, phone);
      const iVal = d.intro;
      const sVal = d.sections;
      setIntro(iVal);
      setSections(sVal);
      serverValuesRef.current = JSON.stringify({ intro: iVal, sections: sVal });
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
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
        body: JSON.stringify({
          settings: {
            privacyContent: {
              intro,
              sections: sections.map(s => ({ title: s.title, content: s.content })),
            },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save');
      }
      setStatus('success');
      serverValuesRef.current = JSON.stringify({ intro, sections: sections.map(s => ({ title: s.title, content: s.content })) });
      setHasChanges(false);
      if (onSaved) onSaved();
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateSection(index, field, value) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function addSection() {
    setSections(prev => [...prev, { title: '', content: '' }]);
  }

  function removeSection(index) {
    if (!window.confirm('Remove this section?')) return;
    setSections(prev => prev.filter((_, i) => i !== index));
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave} style={{ maxWidth: 700 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Privacy Policy Introduction</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This text appears at the top of your Privacy Policy page before the sections.
            </p>
            <textarea
              value={intro}
              onChange={e => setIntro(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Sections</h3>
          <button type="button" className="btn btn-secondary" onClick={addSection} style={{ fontSize: 13 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={index} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>Section {index + 1}</h3>
              <button
                type="button"
                onClick={() => removeSection(index)}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}
              >
                <i className="fas fa-trash" style={{ marginRight: 4 }} />Remove
              </button>
            </div>
            <div className="card-content">
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title</label>
                <input
                  type="text"
                  value={section.title}
                  onChange={e => updateSection(index, 'title', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Content</label>
                <textarea
                  value={section.content}
                  onChange={e => updateSection(index, 'content', e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        ))}

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? 'Privacy Policy saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
