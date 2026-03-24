import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const DEFAULT_SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes:
• Name, email address, and phone number
• Billing and shipping address
• Payment information (processed securely — we do not store card details)
• Order history and preferences
• Device and usage information when you visit our website`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:
• Process and fulfill your orders
• Send order confirmations and updates
• Respond to your comments, questions, and requests
• Send promotional communications (you can opt out at any time)
• Improve our products and services
• Comply with legal obligations`,
  },
  {
    title: '3. Sharing of Information',
    content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with:
• Payment processors to complete transactions
• Shipping partners to deliver your orders
• Service providers who assist in our operations
• Law enforcement when required by law`,
  },
  {
    title: '4. Data Security',
    content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All payment transactions are encrypted using SSL technology.`,
  },
  {
    title: '5. Cookies',
    content: `We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookies through your browser settings. Disabling cookies may affect some features of our website.`,
  },
  {
    title: '6. Your Rights',
    content: `You have the right to:
• Access the personal information we hold about you
• Correct inaccurate or incomplete information
• Request deletion of your personal information
• Opt out of marketing communications
• Lodge a complaint with a supervisory authority`,
  },
  {
    title: "7. Children's Privacy",
    content: `Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13.`,
  },
  {
    title: '8. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.`,
  },
  {
    title: '9. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us using the contact information provided on our website.`,
  },
];

const DEFAULT_INTRO = 'We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our services.';

export default function PrivacyEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setHasChanges(true);
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
        if (pc && pc.sections && pc.sections.length > 0) {
          setIntro(pc.intro || '');
          setSections(pc.sections);
        } else {
          setIntro(DEFAULT_INTRO);
          setSections(DEFAULT_SECTIONS.map(s => ({ ...s })));
        }
      }
    } catch (e) {
      console.error('Failed to load privacy settings:', e);
      setIntro(DEFAULT_INTRO);
      setSections(DEFAULT_SECTIONS.map(s => ({ ...s })));
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
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
