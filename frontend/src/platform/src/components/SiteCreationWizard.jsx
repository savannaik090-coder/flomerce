import { useState } from 'react';
import { createSite } from '../services/siteService.js';

const businessCategoryOptions = [
  { id: 'jewellery', name: 'Jewellery', icon: '💎', description: 'Rings, necklaces, earrings & more' },
  { id: 'clothing', name: 'Clothing & Fashion', icon: '👗', description: 'Apparel, accessories & fashion' },
  { id: 'electronics', name: 'Electronics', icon: '📱', description: 'Phones, laptops & gadgets' },
  { id: 'general', name: 'General Store', icon: '🏪', description: 'Multi-category retail shop' },
];

const categoryTemplates = {
  jewellery: ['Gold', 'Silver', 'Featured Collection', 'New Arrivals'],
  clothing: ['Men', 'Women', 'New Arrivals', 'Sale'],
  electronics: ['Phones', 'Laptops', 'Accessories', 'New Arrivals'],
  general: ['Category 1', 'Category 2'],
};

export default function SiteCreationWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subdomain, setSubdomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [categories, setCategories] = useState(['']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const addCategory = () => setCategories([...categories, '']);

  const removeCategory = (index) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index, value) => {
    const updated = [...categories];
    updated[index] = value;
    setCategories(updated);
  };

  const handleBusinessCategorySelect = (catId) => {
    setSelectedBusinessCategory(catId);
    const template = categoryTemplates[catId] || categoryTemplates.general;
    setCategories([...template]);
  };

  const handleCreate = async () => {
    const validCategories = categories.filter(c => c.trim());
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
        category: selectedBusinessCategory || 'general',
        logo: logoBase64,
        categories: validCategories.map(name => ({
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                style={{
                  width: '2rem',
                  height: '4px',
                  borderRadius: '2px',
                  background: s <= step ? 'var(--primary, #6366f1)' : 'var(--border, #e5e7eb)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Step {step} of 4</span>
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>What do you sell?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Select your business category to get started
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {businessCategoryOptions.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => handleBusinessCategorySelect(cat.id)}
                  style={{
                    border: selectedBusinessCategory === cat.id ? '2px solid var(--primary, #6366f1)' : '2px solid var(--border, #e5e7eb)',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                    background: selectedBusinessCategory === cat.id ? 'var(--primary-light, #eef2ff)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.description}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!selectedBusinessCategory} style={{ flex: 1 }}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Choose Template</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem', maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' }}>
              {[
                { id: 'template1', name: 'Template 1', img: '/assets/images/template1-preview.jpg' },
                { id: 'clothing', name: 'Clothing', img: '/assets/images/clothing-preview.jpg' },
              ].map(tmpl => (
                <div
                  key={tmpl.id}
                  className={`template-option site-card${selectedTemplate === tmpl.id ? ' selected' : ''}`}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                >
                  <img src={tmpl.img} alt={tmpl.name} />
                  <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{tmpl.name}</p>
                  <button
                    className={`btn ${selectedTemplate === tmpl.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem', width: '100%' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedTemplate(tmpl.id); }}
                  >
                    {selectedTemplate === tmpl.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedTemplate} style={{ flex: 1 }}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Website Details</h2>
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
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
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
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!subdomain || !brandName} style={{ flex: 1 }}>Next: Categories</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Product Categories</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              We've pre-filled categories based on your business type. Feel free to add, remove, or rename them.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '40vh', overflowY: 'auto', padding: '0.5rem' }}>
              {categories.map((cat, i) => (
                <div key={i} className="category-input-group">
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Rings)"
                    value={cat}
                    onChange={(e) => updateCategory(i, e.target.value)}
                  />
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.5rem', minWidth: '2rem' }}
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
              <button className="btn btn-outline" onClick={() => setStep(3)} style={{ flex: 1 }}>Back</button>
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
