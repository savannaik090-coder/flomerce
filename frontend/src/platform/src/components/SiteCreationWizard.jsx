import { useState } from 'react';
import { createSite } from '../services/siteService.js';

const BUSINESS_CATEGORIES = [
  { id: 'jewellery', name: 'Jewellery', icon: '💎' },
  { id: 'clothing', name: 'Clothing / Fashion', icon: '👗' },
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
};

export default function SiteCreationWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [businessCategory, setBusinessCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subdomain, setSubdomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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

  const handleCreate = async () => {
    const validCategories = categories.filter(c => c.name.trim());
    if (validCategories.length === 0) {
      setError('Add at least one category');
      return;
    }
    setCreating(true);
    setError('');
    try {
      let logoBase64 = null;
      if (logoFile) {
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(logoFile);
        });
      }
      const result = await createSite({
        subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        brandName,
        templateId: selectedTemplate,
        category: businessCategory,
        logo: logoBase64,
        categories: validCategories.map(c => ({
          name: c.name.trim(),
          subtitle: c.subtitle.trim() || null,
          showOnHome: true,
          slug: c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        })),
      });
      if (result.success || result.site) {
        onCreated();
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
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Choose Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { id: 'storefront', name: 'Storefront', img: '/assets/images/storefront-preview.jpg' },
                  { id: 'clothing', name: 'Clothing', img: '/assets/images/clothing-preview.jpg' },
                ].map(tmpl => (
                  <div
                    key={tmpl.id}
                    className={`template-option site-card${selectedTemplate === tmpl.id ? ' selected' : ''}`}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    style={{ cursor: 'pointer', padding: '0.5rem' }}
                  >
                    <img src={tmpl.img} alt={tmpl.name} style={{ width: '100%', borderRadius: '4px' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{tmpl.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Domain Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="my-awesome-shop"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {subdomain && `${subdomain}.fluxe.in`}
                </span>
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
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!subdomain || !brandName || !selectedTemplate} style={{ flex: 1 }}>Next: Categories</button>
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
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating} style={{ flex: 1 }}>
                {creating ? 'Creating...' : 'Create Website'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
