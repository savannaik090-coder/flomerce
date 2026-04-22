import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createSite, checkSubdomain } from '../services/siteService.js';
import { PLATFORM_DOMAIN } from '../config.js';
import { PRESHIPPED } from '../../../shared/i18n/init.js';

// Native labels for the content-language picker. Mirrors the platform
// language switcher so the wizard offers the same locales out of the box.
const CONTENT_LANGUAGE_LABELS = {
  en: 'English',
  hi: 'हिन्दी',
  es: 'Español',
  'zh-CN': '简体中文',
  ar: 'العربية',
};

// SEO + category seed data are now sourced from the wizard i18n catalog so
// merchants in non-English locales land on localized defaults. We resolve
// the templates through i18next at call time (see generateSEODefaults below
// and the DEFAULT_CATEGORIES helper inside the component).
function generateSEODefaults(t, category, brandName, fallbackName) {
  const cat = category || 'general';
  const name = brandName || fallbackName || 'Your Store';
  const titleKey = `seoTitleTemplates.${cat}`;
  const descKey = `seoDescriptionTemplates.${cat}`;
  // i18next falls back to defaultValue when the key (or its locale file)
  // isn't loaded — this also guards against an unknown business category.
  const title = t(titleKey, {
    brand: name,
    defaultValue: t(`seoTitleTemplates.general`, { brand: name, defaultValue: `${name} - Shop Online` }),
  });
  const description = t(descKey, {
    brand: name,
    defaultValue: t(`seoDescriptionTemplates.general`, { brand: name, defaultValue: '' }),
  });
  return { title, description };
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
  const { t, i18n } = useTranslation(['wizard', 'auth', 'landing']);

  // Default the content language to the user's current admin UI language so a
  // Hindi-speaking merchant defaults to Hindi without an extra click. Falls back
  // to English when the active locale isn't one we ship a picker option for.
  const defaultContentLanguage = (() => {
    const current = (i18n.language || 'en').split('-')[0] === 'zh' ? 'zh-CN' : (i18n.language || 'en');
    return PRESHIPPED.includes(current) ? current : 'en';
  })();

  const BUSINESS_CATEGORIES = [
    { id: 'jewellery', name: t('categories.jewellery'), icon: '💎' },
    { id: 'clothing', name: t('categories.clothing'), icon: '👗' },
    { id: 'beauty', name: t('categories.beauty'), icon: '💄' },
    { id: 'general', name: t('categories.general'), icon: '🛍️' },
  ];

  // Read the localized starter categories for a business category from the
  // wizard i18n catalog. Falls through to jewellery (then to an empty list)
  // when the locale file hasn't loaded the section yet.
  const getDefaultCategories = (catId) => {
    const tryCat = (id) => {
      const obj = t(`defaultCategories.${id}`, { returnObjects: true, defaultValue: null });
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.values(obj)
          .filter((c) => c && typeof c === 'object' && c.name)
          .map((c) => ({ name: c.name, subtitle: c.subtitle || '' }));
      }
      return null;
    };
    return tryCat(catId) || tryCat('jewellery') || [];
  };

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
  const [contentLanguage, setContentLanguage] = useState(
    draft?.contentLanguage && PRESHIPPED.includes(draft.contentLanguage)
      ? draft.contentLanguage
      : defaultContentLanguage
  );
  const debounceRef = useRef(null);
  const latestCheckRef = useRef('');

  const validateSubdomain = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    latestCheckRef.current = value;
    if (!value || value.length < 3) {
      setSubdomainStatus(value ? { available: false, reason: t('domainMinLength') } : null);
      setCheckingSubdomain(false);
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
      setSubdomainStatus({ available: false, reason: t('domainCharRule') });
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
          setSubdomainStatus({ available: false, reason: t('domainCheckFailed') });
        }
      } finally {
        if (latestCheckRef.current === value) {
          setCheckingSubdomain(false);
        }
      }
    }, 500);
  }, [t]);

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
      categoriesTouched, contentLanguage,
    });
  }, [step, businessCategory, selectedTemplate, selectedTheme, subdomain, brandName, categories, seoTitle, seoDescription, seoTouched, categoriesTouched, contentLanguage]);

  const handleBusinessCategorySelect = (catId) => {
    setBusinessCategory(catId);
    if (!categoriesTouched) {
      const defaults = getDefaultCategories(catId);
      setCategories(defaults);
    }
  };

  // Refresh the un-touched category preview when the merchant flips the
  // content-language picker so they see Hindi previews after picking Hindi.
  // (Backend still owns persistence — see buildFormData.)
  useEffect(() => {
    if (categoriesTouched || !businessCategory) return;
    const defaults = getDefaultCategories(businessCategory);
    if (defaults.length > 0) setCategories(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentLanguage, businessCategory]);

  // Lazy-load the i18n bundle for the chosen content language so previews
  // render in the merchant's selected language even if their admin UI is
  // currently in English. Failure is silent (preview just stays in EN).
  useEffect(() => {
    if (!contentLanguage || contentLanguage === i18n.language) return;
    try {
      i18n.loadLanguages?.(contentLanguage);
    } catch {}
  }, [contentLanguage, i18n]);

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
      setError(t('needAtLeastOne'));
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
      ? validCategories.map(c => ({
          name: c.name.trim(),
          subtitle: c.subtitle.trim() || null,
          showOnHome: true,
          slug: c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        }))
      : [];
    return {
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      brandName,
      templateId: selectedTemplate,
      theme: selectedTheme,
      category: businessCategory,
      content_language: contentLanguage,
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
        setError(result.message || result.error || t('createSiteFailed'));
      }
    } catch (err) {
      setError(err.message || t('createSiteFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>{t('step1Title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {t('step1Subtitle')}
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
                    {businessCategory === cat.id ? t('selected') : t('select')}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!businessCategory} style={{ flex: 1 }}>{t('next')}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>{t('step2Title')}</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>{t('chooseDesign')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  className={`template-option site-card${selectedTheme === 'classic' ? ' selected' : ''}`}
                  onClick={() => setSelectedTheme('classic')}
                  style={{ cursor: 'pointer', padding: '0.5rem' }}
                >
                  <div style={{ background: '#f8f5f0', borderRadius: '4px', padding: '24px 16px', textAlign: 'center', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#5a3f2a' }}>Aa</span>
                    <div style={{ width: '40px', height: '2px', background: '#d4af37' }}></div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('themeClassicSwatch')}</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{t('themeClassic')}</p>
                  <p style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', margin: '0.25rem 0 0' }}>{t('themeClassicDesc')}</p>
                </div>
                <div
                  className={`template-option site-card${selectedTheme === 'modern' ? ' selected' : ''}`}
                  onClick={() => setSelectedTheme('modern')}
                  style={{ cursor: 'pointer', padding: '0.5rem' }}
                >
                  <div style={{ background: '#fff', borderRadius: '4px', padding: '24px 16px', textAlign: 'center', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #eee' }}>
                    <span style={{ fontSize: '1.5rem', fontFamily: 'Inter, Helvetica, sans-serif', fontWeight: 800, color: '#111' }}>Aa</span>
                    <div style={{ width: '40px', height: '2px', background: '#111' }}></div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('themeModernSwatch')}</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', margin: '0.5rem 0 0' }}>{t('themeModern')}</p>
                  <p style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', margin: '0.25rem 0 0' }}>{t('themeModernDesc')}</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>{t('domainName')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={t('domainPlaceholder')}
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('checking')}</span>
                  )}
                  {!checkingSubdomain && subdomainStatus && (
                    <span style={{ fontSize: '0.75rem', color: subdomainStatus.available ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {subdomainStatus.available ? t('available') : subdomainStatus.reason}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>{t('brandName')}</label>
              <input
                type="text"
                placeholder={t('brandPlaceholder')}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('logoOptional')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0] || null)}
                style={{ padding: '0.5rem', border: '1px dashed var(--border)' }}
              />
            </div>
            <div className="form-group">
              <label>{t('contentLanguagePrompt')}</label>
              <select
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 4, background: '#fff' }}
              >
                {PRESHIPPED.map((lng) => (
                  <option key={lng} value={lng}>{CONTENT_LANGUAGE_LABELS[lng] || lng}</option>
                ))}
              </select>
              {contentLanguage !== 'en' && (
                <p
                  role="alert"
                  style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, fontSize: '0.75rem', color: '#92400e' }}
                >
                  {t('contentLanguageWarning', { language: CONTENT_LANGUAGE_LABELS[contentLanguage] || contentLanguage })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1 }}>{t('back')}</button>
              <button className="btn btn-primary" onClick={() => {
                if (!seoTouched) {
                  const defaults = generateSEODefaults(t, businessCategory, brandName, t("yourStoreFallback"));
                  setSeoTitle(defaults.title);
                  setSeoDescription(defaults.description);
                }
                setStep(3);
              }} disabled={!subdomain || !brandName || !selectedTemplate || checkingSubdomain || !subdomainStatus?.available} style={{ flex: 1 }}>{t('nextSeo')}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>{t('step3Title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {t('step3Subtitle')}
            </p>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>{t('faviconOptional')}</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                {t('faviconHelp')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {faviconPreview && (
                  <img
                    src={faviconPreview}
                    alt={t('faviconAlt')}
                    style={{ width: '32px', height: '32px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0] || null;
                    if (file && file.size > 2 * 1024 * 1024) {
                      setError(t('faviconTooLarge'));
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
              <label style={{ fontWeight: 600 }}>{t('siteTitle')}</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                {t('siteTitleHelp')}
              </p>
              <input
                type="text"
                placeholder={generateSEODefaults(t, businessCategory, brandName, t("yourStoreFallback")).title}
                value={seoTitle}
                onChange={(e) => { setSeoTitle(e.target.value); setSeoTouched(true); }}
                maxLength={70}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('siteTitleHint')}</span>
                <span style={{ fontSize: '0.7rem', color: (seoTitle || '').length > 60 ? '#dc2626' : 'var(--text-muted)' }}>{(seoTitle || '').length}/70</span>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ fontWeight: 600 }}>{t('metaDescription')}</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                {t('metaDescriptionHelp')}
              </p>
              <textarea
                placeholder={generateSEODefaults(t, businessCategory, brandName, t("yourStoreFallback")).description}
                value={seoDescription}
                onChange={(e) => { setSeoDescription(e.target.value); setSeoTouched(true); }}
                maxLength={160}
                rows={3}
                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('metaDescriptionHint')}</span>
                <span style={{ fontSize: '0.7rem', color: (seoDescription || '').length > 155 ? '#dc2626' : 'var(--text-muted)' }}>{(seoDescription || '').length}/160</span>
              </div>
            </div>
            {(seoTitle || seoDescription) && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('googlePreview')}</p>
                <div style={{ fontSize: '1rem', color: '#1a0dab', fontWeight: 500, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {seoTitle || generateSEODefaults(t, businessCategory, brandName, t("yourStoreFallback")).title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#006621', marginBottom: '0.25rem' }}>
                  {subdomain}.{PLATFORM_DOMAIN}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#545454', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {seoDescription || generateSEODefaults(t, businessCategory, brandName, t("yourStoreFallback")).description}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>{t('back')}</button>
              <button className="btn btn-outline" onClick={() => setStep(4)} style={{ flex: 1 }}>{t('skip')}</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} style={{ flex: 1 }}>{t('nextCategories')}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>{t('step4Title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {t('step4Subtitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '40vh', overflowY: 'auto', padding: '0.5rem' }}>
              {categories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder={t('categoryName')}
                      value={cat.name}
                      onChange={(e) => updateCategoryName(i, e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <input
                      type="text"
                      placeholder={t('subtitleOptionalPlaceholder')}
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
              {t('addAnotherCategory')}
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '1rem 0' }}>
              <input type="checkbox" id="wizard-agree-terms" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} style={{ marginTop: '0.2rem', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }} />
              <label htmlFor="wizard-agree-terms" style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, cursor: 'pointer' }}>
                {t('auth:agreeTerms')} <Link to="/terms" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{t('landing:footerTerms')}</Link>, <Link to="/privacy-policy" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{t('landing:footerPrivacy')}</Link>, {t('auth:agreeTermsAnd')} <Link to="/refund-policy" target="_blank" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{t('landing:footerRefund')}</Link>.
              </label>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setStep(3)} style={{ flex: 1 }}>{t('back')}</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !agreedTerms} style={{ flex: 1 }}>
                {creating ? t('creating') : t('createWebsite')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
