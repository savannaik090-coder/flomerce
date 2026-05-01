import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createSite, checkSubdomain } from '../services/siteService.js';
import { PLATFORM_DOMAIN } from '../config.js';

// English-only seed data. The storefront translates on demand at runtime via
// the per-merchant Microsoft Translator integration, so we ship one canonical
// English copy and let System B do the rest.
const SEO_TITLE_TEMPLATES = {
  jewellery: '{brand} - Jewellery Store Online',
  clothing: '{brand} - Fashion & Clothing Store',
  beauty: '{brand} - Beauty & Cosmetics Store',
  general: '{brand} - Shop Online',
};

const SEO_DESCRIPTION_TEMPLATES = {
  jewellery: 'Shop exquisite jewellery at {brand}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.',
  clothing: 'Discover the latest fashion at {brand}. Shop clothing, accessories & more with easy returns & fast shipping.',
  beauty: 'Shop premium beauty & cosmetics at {brand}. Skincare, makeup & more with secure checkout & fast delivery.',
  general: 'Shop online at {brand}. Explore our curated collection with secure checkout, easy returns & fast delivery.',
};

const DEFAULT_CATEGORIES_BY_TYPE = {
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

function fillTemplate(tpl, brand) {
  return tpl.replace(/\{brand\}/g, brand);
}

function generateSEODefaults(category, brandName, fallbackName) {
  const cat = category && SEO_TITLE_TEMPLATES[category] ? category : 'general';
  const name = brandName || fallbackName || 'Your Store';
  return {
    title: fillTemplate(SEO_TITLE_TEMPLATES[cat], name),
    description: fillTemplate(SEO_DESCRIPTION_TEMPLATES[cat], name),
  };
}

function getDefaultCategories(catId) {
  return (DEFAULT_CATEGORIES_BY_TYPE[catId] || DEFAULT_CATEGORIES_BY_TYPE.general).map(
    (c) => ({ name: c.name, subtitle: c.subtitle })
  );
}

const WIZARD_STORAGE_KEY = 'flomerce_wizard_draft';

function loadWizardDraft() {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveWizardDraft(data) {
  try { localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function clearWizardDraft() {
  try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
}

export default function SiteCreationWizard({ onClose, onCreated, onNeedsPlan, isTrialActive }) {
  const BUSINESS_CATEGORIES = [
    { id: 'jewellery', name: 'Jewellery', icon: '💎' },
    { id: 'clothing', name: 'Clothing / Fashion', icon: '👗' },
    { id: 'beauty', name: 'Beauty / Cosmetics', icon: '💄' },
    { id: 'general', name: 'General / Other', icon: '🛍️' },
  ];

  const draft = useRef(loadWizardDraft()).current;
  const [step, setStep] = useState(draft?.step || 1);
  const [businessCategory, setBusinessCategory] = useState(draft?.businessCategory || null);
  const [selectedTemplate, setSelectedTemplate] = useState(draft?.selectedTemplate || 'storefront');
  const [selectedTheme, setSelectedTheme] = useState(draft?.selectedTheme || 'classic');
  const [subdomain, setSubdomain] = useState(draft?.subdomain || '');
  const [brandName, setBrandName] = useState(draft?.brandName || '');
  const [logoFile, setLogoFile] = useState(null);
  const [categories, setCategories] = useState(draft?.categories || []);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [seoTitle, setSeoTitle] = useState(draft?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(draft?.seoDescription || '');
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [seoTouched, setSeoTouched] = useState(draft?.seoTouched || false);
  // Track whether the user actually customized the category seed. When they
  // didn't (just clicked through the defaults), we omit categories from the
  // backend payload so the server-side localized seed runs — this is what
  // makes a Hindi merchant land on Hindi categories even if the wizard's UI
  // language was English.
  const [categoriesTouched, setCategoriesTouched] = useState(draft?.categoriesTouched || false);

  const debounceRef = useRef(null);
  const latestCheckRef = useRef('');

  const validateSubdomain = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    latestCheckRef.current = value;
    if (!value || value.length < 3) {
      setSubdomainStatus(value ? { available: false, reason: "Must be at least 3 characters" } : null);
      setCheckingSubdomain(false);
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
      setSubdomainStatus({ available: false, reason: "Only lowercase letters, numbers, and hyphens (not at start/end)" });
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
          setSubdomainStatus({ available: false, reason: "Unable to verify. Try again." });
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

  useEffect(() => {
    if (draft?.subdomain) validateSubdomain(draft.subdomain);
  }, []);

  useEffect(() => {
    saveWizardDraft({
      step, businessCategory, selectedTemplate, selectedTheme,
      subdomain, brandName, categories, seoTitle, seoDescription, seoTouched,
      categoriesTouched,
    });
  }, [step, businessCategory, selectedTemplate, selectedTheme, subdomain, brandName, categories, seoTitle, seoDescription, seoTouched, categoriesTouched]);

  const handleBusinessCategorySelect = (catId) => {
    setBusinessCategory(catId);
    if (!categoriesTouched) {
      const defaults = getDefaultCategories(catId);
      setCategories(defaults);
    }
  };

  const addCategory = () => {
    setCategoriesTouched(true);
    setCategories([...categories, { name: '', subtitle: '' }]);
  };

  const removeCategory = (index) => {
    if (categories.length <= 1) return;
    setCategoriesTouched(true);
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategoryName = (index, value) => {
    setCategoriesTouched(true);
    const updated = [...categories];
    updated[index] = { ...updated[index], name: value };
    setCategories(updated);
  };

  const updateCategorySubtitle = (index, value) => {
    setCategoriesTouched(true);
    const updated = [...categories];
    updated[index] = { ...updated[index], subtitle: value };
    setCategories(updated);
  };

  const buildFormData = async () => {
    // We only enforce "at least one category" for users who actually
    // customized the list; an untouched seed will be filled in by the
    // backend in the merchant's selected content language.
    const validCategories = categories.filter(c => c.name.trim());
    if (categoriesTouched && validCategories.length === 0) {
      setError("Add at least one category");
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
    let faviconBase64 = null;
    if (faviconFile) {
      faviconBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(faviconFile);
      });
    }
    // Send empty strings for SEO/categories the user didn't customize so the
    // backend can fill them in using the localized wizard seed for the
    // selected content_language. If the user typed something, we send their
    // literal value verbatim regardless of language.
    const finalSeoTitle = seoTouched ? seoTitle.trim() : '';
    const finalSeoDescription = seoTouched ? seoDescription.trim() : '';
    const finalCategories = categoriesTouched
      ? validCategories.map((c, i) => {
          // Derive an ASCII slug from the (possibly non-Latin) name. If the
          // strip leaves nothing usable, fall back to an indexed placeholder
          // so the backend never receives an empty slug.
          const stripped = c.name.toLowerCase().trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
          return {
            name: c.name.trim(),
            subtitle: c.subtitle.trim() || null,
            showOnHome: true,
            slug: stripped || `category-${i + 1}`,
          };
        })
      : [];
    return {
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      brandName,
      templateId: selectedTemplate,
      theme: selectedTheme,
      category: businessCategory,
      logo: logoBase64,
      favicon: faviconBase64,
      seoTitle: finalSeoTitle,
      seoDescription: finalSeoDescription,
      categories: finalCategories,
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
        clearWizardDraft();
        onCreated(result.data || result.site || result);
        onClose();
      } else {
        setError(result.message || result.error || "Failed to create site");
      }
    } catch (err) {
      setError(err.message || "Failed to create site");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
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
                    {businessCategory === cat.id ? "Selected" : "Select"}
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
                      {subdomainStatus.available ? "Available" : subdomainStatus.reason}
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
              <button className="btn btn-primary" onClick={() => {
                if (!seoTouched) {
                  const defaults = generateSEODefaults(businessCategory, brandName, "Your Store");
                  setSeoTitle(defaults.title);
                  setSeoDescription(defaults.description);
                }
                setStep(3);
              }} disabled={!subdomain || !brandName || !selectedTemplate || checkingSubdomain || !subdomainStatus?.available} style={{ flex: 1 }}>Next: SEO</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>SEO & Branding</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Help your store get discovered on Google. You can always change these later from the admin panel.
            </p>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Favicon (Optional)</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                Small icon shown in browser tabs. Recommended: 32×32 or 64×64 px.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {faviconPreview && (
                  <img
                    src={faviconPreview}
                    alt="Favicon preview"
                    style={{ width: '32px', height: '32px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0] || null;
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError("Favicon must be under 2 MB");
                      return;
                    }
                    if (faviconPreview) URL.revokeObjectURL(faviconPreview);
                    setFaviconFile(file);
                    setFaviconPreview(file ? URL.createObjectURL(file) : null);
                    setError('');
                  }}
                  style={{ padding: '0.5rem', border: '1px dashed var(--border)', flex: 1 }}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ fontWeight: 600 }}>Site Title</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                Appears in search results and browser tabs.
              </p>
              <input
                type="text"
                placeholder={generateSEODefaults(businessCategory, brandName, "Your Store").title}
                value={seoTitle}
                onChange={(e) => { setSeoTitle(e.target.value); setSeoTouched(true); }}
                maxLength={70}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recommended: 50–60 characters</span>
                <span style={{ fontSize: '0.7rem', color: (seoTitle || '').length > 60 ? '#dc2626' : 'var(--text-muted)' }}>{(seoTitle || '').length}/70</span>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ fontWeight: 600 }}>Meta Description</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                A short summary shown below your title in search results.
              </p>
              <textarea
                placeholder={generateSEODefaults(businessCategory, brandName, "Your Store").description}
                value={seoDescription}
                onChange={(e) => { setSeoDescription(e.target.value); setSeoTouched(true); }}
                maxLength={160}
                rows={3}
                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recommended: 120–160 characters</span>
                <span style={{ fontSize: '0.7rem', color: (seoDescription || '').length > 155 ? '#dc2626' : 'var(--text-muted)' }}>{(seoDescription || '').length}/160</span>
              </div>
            </div>
            {(seoTitle || seoDescription) && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Google Search Preview</p>
                <div style={{ fontSize: '1rem', color: '#1a0dab', fontWeight: 500, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {seoTitle || generateSEODefaults(businessCategory, brandName, "Your Store").title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#006621', marginBottom: '0.25rem' }}>
                  {subdomain}.{PLATFORM_DOMAIN}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#545454', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {seoDescription || generateSEODefaults(businessCategory, brandName, "Your Store").description}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-outline" onClick={() => setStep(4)} style={{ flex: 1 }}>Skip</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} style={{ flex: 1 }}>Next: Categories</button>
            </div>
          </div>
        )}

        {step === 4 && (
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
              <button className="btn btn-outline" onClick={() => setStep(3)} style={{ flex: 1 }}>Back</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !agreedTerms} style={{ flex: 1 }}>
                {creating ? "Creating..." : "Create Website"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
