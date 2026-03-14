import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function getDefaultSections(brand, email, phone) {
  return [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and placing an order with ${brand}, you confirm that you are in agreement with and bound by these Terms and Conditions. These terms apply to the entire website and any email or other type of communication between you and ${brand}.`,
    },
    {
      title: '2. Products and Pricing',
      content: `All products are subject to availability. We reserve the right to discontinue any product at any time.\nPrices are listed in Indian Rupees (INR) and are subject to change without notice.\nWe make every effort to display accurate product descriptions and images, but we do not warrant that product descriptions are accurate, complete, or current.`,
    },
    {
      title: '3. Orders and Payment',
      content: `By placing an order, you offer to purchase a product subject to these terms. We reserve the right to refuse or cancel any order at our discretion.\nPayment must be received before orders are processed. We accept payments via Razorpay (credit/debit cards, UPI, net banking) and Cash on Delivery (where available).`,
    },
    {
      title: '4. Shipping and Delivery',
      content: `Delivery times are estimates only and may vary. We are not responsible for delays caused by courier services or unforeseen circumstances.\nRisk of loss and title pass to you upon delivery to the carrier. We are not liable for any loss, theft, or damage during transit.`,
    },
    {
      title: '5. Returns and Refunds',
      content: `We want you to be completely satisfied with your purchase. If you are not satisfied, you may return eligible items within 7 days of delivery.\nItems must be unused, in original packaging, and accompanied by the original receipt.\nRefunds will be processed within 5-7 business days after we receive and inspect the returned item.\nCustom or personalized items may not be eligible for return.`,
    },
    {
      title: '6. Intellectual Property',
      content: `All content on this website, including text, graphics, logos, images, and software, is the property of ${brand} and is protected by applicable intellectual property laws.\nYou may not reproduce, distribute, or create derivative works without our express written permission.`,
    },
    {
      title: '7. User Accounts',
      content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Please notify us immediately of any unauthorized use of your account.`,
    },
    {
      title: '8. Limitation of Liability',
      content: `To the fullest extent permitted by law, ${brand} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or products.\nOur total liability shall not exceed the amount paid by you for the specific product giving rise to the claim.`,
    },
    {
      title: '9. Governing Law',
      content: `These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in the location of our registered office.`,
    },
    {
      title: '10. Contact Information',
      content: `For any questions regarding these Terms and Conditions, please contact us at ${email}${phone ? ` or ${phone}` : ''}.`,
    },
  ];
}

export default function TermsEditor({ onSaved }) {
  const { siteConfig } = useContext(SiteContext);
  const brand = siteConfig?.brand_name || 'Our Store';
  const email = siteConfig?.email || 'support@example.com';
  const phone = siteConfig?.phone || '';

  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

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
        const termsContent = settings.termsContent;
        if (termsContent && termsContent.sections && termsContent.sections.length > 0) {
          setIntro(termsContent.intro || '');
          setSections(termsContent.sections);
        } else {
          setIntro(`Please read these Terms and Conditions carefully before using ${brand}'s website and services. By accessing or using our service, you agree to be bound by these terms.`);
          setSections(getDefaultSections(brand, email, phone));
        }
      }
    } catch (e) {
      console.error('Failed to load terms settings:', e);
      setIntro(`Please read these Terms and Conditions carefully before using ${brand}'s website and services. By accessing or using our service, you agree to be bound by these terms.`);
      setSections(getDefaultSections(brand, email, phone));
    } finally {
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
            termsContent: {
              intro: intro,
              sections: sections,
            },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save');
      }
      setStatus('success');
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
    setSections(prev => [...prev, { title: `${prev.length + 1}. New Section`, content: '' }]);
  }

  function removeSection(index) {
    if (!window.confirm('Remove this section?')) return;
    setSections(prev => prev.filter((_, i) => i !== index));
  }

  function moveSection(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    setSections(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <form onSubmit={handleSave} style={{ maxWidth: 700 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Introduction</h3>
          </div>
          <div className="card-content">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              This text appears at the top of your Terms & Conditions page before the sections.
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Sections ({sections.length})</h3>
          <button type="button" className="btn btn-secondary" onClick={addSection} style={{ fontSize: 13 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }} />Add Section
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={index} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: 14 }}>Section {index + 1}</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                >
                  <i className="fas fa-arrow-up" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer', color: index === sections.length - 1 ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                >
                  <i className="fas fa-arrow-down" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
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
                  rows={4}
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
            {status === 'success' ? 'Terms & Conditions saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save Terms & Conditions'}
        </button>
      </form>
    </div>
  );
}
