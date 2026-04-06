import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createSite, checkSubdomain } from '../services/siteService.js';
import { PLATFORM_DOMAIN } from '../config.js';

const BUSINESS_CATEGORIES = [
  { id: 'jewellery', name: 'Jewellery', icon: '💎' },
  { id: 'clothing', name: 'Clothing / Fashion', icon: '👗' },
  { id: 'beauty', name: 'Beauty / Cosmetics', icon: '💄' },
  { id: 'general', name: 'General / Other', icon: '🛍️' },
];

const DEFAULT_CATEGORIES = {
  jewellery: [
    { name: 'New Arrivals', subtitle: 'Discover our latest exquisite collections' },
    { name: 'Jewellery Collection', subtitle: 'Exquisite pieces for every occasion' },
    { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  ],
  clothing: [
    { name: 'New Arrivals', subtitle: 'Discover our latest fashion trends' },
    { name: 'Clothing Collection', subtitle: 'Stylish wear for every occasion' },
    { name: 'Featured Collection', subtitle: 'Handpicked favourites just for you' },
  ],
  beauty: [
    { name: 'New Arrivals', subtitle: 'Discover our latest beauty essentials' },
    { name: 'Skincare', subtitle: 'Nourish and glow with our skincare range' },
    { name: 'Makeup', subtitle: 'Premium makeup for every look' },
  ],
  general: [
    { name: 'New Arrivals', subtitle: 'Check out what just landed' },
    { name: 'Our Collection', subtitle: 'Browse our complete product range' },
    { name: 'Featured Products', subtitle: 'Handpicked favourites just for you' },
  ],
};

export default function SiteCreationWizard({ onClose, onCreated, onNeedsPlan, isTrialActive }) {
  const [step, setStep] = useState(1);
  const [businessCategory, setBusinessCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('storefront');
  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [subdomain, setSubdomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const debounceRef = useRef(null);
  const latestCheckRef = useRef('');

  const validateSubdomain = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    latestCheckRef.current = value;
    if (!value || value.length < 3) {
      setSubdomainStatus(value ? { available: false, reason: 'Must be at least 3 characters' } : null);
      setCheckingSubdomain(false);
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
      setSubdomainStatus({ available: false, reason: 'Only lowercase letters, numbers, and hyphens (not at start/end)' });
      setCheckingSubdomain(false);
      return;
    }
    setCheckingSubdomain(true);
    setSubdomainStatus(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkSubdomain(value);
        if (latestCheckRef.current === value) {
          setSubdomainStatus(result);
        }
      } catch {
        if (latestCheckRef.current === value) {
          setSubdomainStatus({ available: false, reason: 'Unable to verify. Try again.' });
        }
      } finally {
        if (latestCheckRef.current === value) {
          setCheckingSubdomain(false);
        }
      }
    }, 500);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleBusinessCategorySelect = (catId) => {
    setBusinessCategory(catId);
    const defaults = DEFAULT_CATEGORIES[catId] || DEFAULT_CATEGORIES.jewellery;
    setCategories(defaults.map(c => ({ name: c.name, subtitle: c.subtitle })));
  };

  const addCategory = () => setCategories([...categories, { name: '', subtitle: '' }]);

  const removeCategory = (index) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategoryName = (index, value) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], name: value };
    setCategories(updated);
  };

  const updateCategorySubtitle = (index, value) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], subtitle: value };
    setCategories(updated);
  };

  const buildFormData = async () => {
    const validCategories = categories.filter(c => c.name.trim());
    if (validCategories.length === 0) {
      setError('Add at least one category');
      return null;
    }
    let logoBase64 = null;
    if (logoFile) {
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoFile);
      });
    }
    return {
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      brandName,
      templateId: selectedTemplate,
      theme: selectedTheme,
      category: businessCategory,
      logo: logoBase64,
      categories: validCategories.map(c => ({
        name: c.name.trim(),
        subtitle: c.subtitle.trim() || null,
        showOnHome: true,
        slug: c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      })),
    };
  };

  const handleCreate = async () => {
    setError('');
    const formData = await buildFormData();
    if (!formData) return;

    if (!isTrialActive) {
      onNeedsPlan(formData);
      onClose();
      return;
    }

    setCreating(true);
    try {
      const result = await createSite(formData);
      if (result.success || result.site) {
        onCreated(result.data || result.site || result);
        onClose();
      } else {
        setError(result.message || result.error || 'Failed to create site');
      }
    } catch (err) {
      setError(err.message || 'Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Select Business Category</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              What type of products will you sell?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
              {BUSINESS_CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  className={`template-option site-card${businessCategory === cat.id ? ' selected' : ''}`}
                  onClick={() => handleBusinessCategorySelect(cat.id)}
                  style={{ cursor: 'pointer', textAlign: 'center', padding: '2rem 1rem' }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{cat.icon}</div>
                  <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{cat.name}</p>
                  <button
                    className={`btn ${businessCategory === cat.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem', width: '100%' }}
                    onClick={(e) => { e.stopPropagation(); handleBusinessCategorySelect(cat.id); }}
                  >
                    {businessCategory === cat.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!businessCategory} style={{ flex: 1 }}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Website Details</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Choose a Design</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  className={`template-option site-card${selectedTheme === 'classic' ? ' selected' : ''}`}
                  onClick={() => setSelectedTheme('classic')}
                  style={{ cursor: 'pointer', padding: '0.5rem' }}
                >
                  <div style={{ background: '#f8f5f0', borderRadius: '4px', padding: '24px 16px', textAlign: 'center', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#5a3f2a' }}>Aa</span>
                    <div style={{ width: '40px', height: '2px', background: '#d4af37' }}></div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>Serif + Gold</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0' }}>Classic</p>
                  <p style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', margin: '0.25rem 0 0' }}>Elegant, traditional look</p>
                </div>
                <div
                  className={`template-option site-card${selectedTheme === 'modern' ? ' selected' : ''}`}
                  onClick={() => setSelectedTheme('modern')}
                  style={{ cursor: 'pointer', padding: '0.5rem' }}
                >
                  <div style={{ background: '#fff', borderRadius: '4px', padding: '24px 16px', textAlign: 'center', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #eee' }}>
                    <span style={{ fontSize: '1.5rem', fontFamily: 'Inter, Helvetica, sans-serif', fontWeight: 800, color: '#111' }}>Aa</span>
                    <div style={{ width: '40px', height: '2px', background: '#111' }}></div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>Sans-serif + Bold</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0' }}>Modern</p>
                  <p style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', margin: '0.25rem 0 0' }}>Clean, minimal look</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Domain Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="my-awesome-shop"
                  value={subdomain}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setSubdomain(val);
                    validateSubdomain(val);
                  }}
                  style={{
                    borderColor: subdomainStatus
                      ? subdomainStatus.available ? '#16a34a' : '#dc2626'
                      : undefined,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {subdomain && `${subdomain}.${PLATFORM_DOMAIN}`}
                  </span>
                  {checkingSubdomain && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checking...</span>
                  )}
                  {!checkingSubdomain && subdomainStatus && (
                    <span style={{ fontSize: '0.75rem', color: subdomainStatus.available ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {subdomainStatus.available ? 'Available' : subdomainStatus.reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Brand Name</label>
              <input
                type="text"
                placeholder="My Awesome Shop"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Logo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0] || null)}
                style={{ padding: '0.5rem', border: '1px dashed var(--border)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!subdomain || !brandName || !selectedTemplate || checkingSubdomain || !subdomainStatus?.available} style={{ flex: 1 }}>Next: Categories</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Product Categories</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              These categories will appear on your homepage and navigation. You can rename them or add more.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '40vh', overflowY: 'auto', padding: '0.5rem' }}>
              {categories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder="Category Name"
                      value={cat.name}
                      onChange={(e) => updateCategoryName(i, e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <input
                      type="text"
                      placeholder="Subtitle (optional)"
                      value={cat.subtitle}
                      onChange={(e) => updateCategorySubtitle(i, e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.85rem', color: '#666' }}
                    />
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.5rem', minWidth: '2rem', marginTop: '2px' }}
                    onClick={() => removeCategory(i)}
                    disabled={categories.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-outline" onClick={addCategory} style={{ width: '100%', marginBottom: '1.5rem', borderStyle: 'dashed' }}>
              + Add Another Category
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '1rem 0' }}>
              <input type="checkbox" id="wizard-agree-terms" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} style={{ marginTop: '0.2rem', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }} />
              <label htmlFor="wizard-agree-terms" style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, cursor: 'pointer' }}>
                I agree to the <Link to="/terms" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Terms & Conditions</Link>, <Link to="/privacy-policy" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</Link>, and <Link to="/refund-policy" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Refund & Cancellation Policy</Link>.
              </label>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !agreedTerms} style={{ flex: 1 }}>
                {creating ? 'Creating...' : 'Create Website'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
