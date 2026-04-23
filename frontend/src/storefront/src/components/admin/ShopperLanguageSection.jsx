import React, { useState, useEffect, useContext } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { API_BASE } from '../../config.js';
import FeatureGate from './FeatureGate.jsx';

const TRANSLATOR_REGIONS = [
  { code: 'global', labelKey: 'regionGlobal' },
  { code: 'eastus', labelKey: 'regionEastUs' },
  { code: 'eastus2', labelKey: 'regionEastUs2' },
  { code: 'westus', labelKey: 'regionWestUs' },
  { code: 'westus2', labelKey: 'regionWestUs2' },
  { code: 'westeurope', labelKey: 'regionWestEurope' },
  { code: 'northeurope', labelKey: 'regionNorthEurope' },
  { code: 'centralindia', labelKey: 'regionCentralIndia' },
  { code: 'southeastasia', labelKey: 'regionSoutheastAsia' },
  { code: 'japaneast', labelKey: 'regionJapanEast' },
  { code: 'australiaeast', labelKey: 'regionAustraliaEast' },
  { code: 'brazilsouth', labelKey: 'regionBrazilSouth' },
  { code: 'uaenorth', labelKey: 'regionUaeNorth' },
];

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'pt-BR', label: 'Portuguese — Brazil' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'sv', label: 'Swedish (Svenska)' },
  { code: 'th', label: 'Thai (ไทย)' },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'fil', label: 'Filipino' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'fa', label: 'Persian (فارسی)' },
  { code: 'he', label: 'Hebrew (עברית)' },
  { code: 'el', label: 'Greek (Ελληνικά)' },
  { code: 'cs', label: 'Czech (Čeština)' },
  { code: 'da', label: 'Danish (Dansk)' },
  { code: 'fi', label: 'Finnish (Suomi)' },
  { code: 'no', label: 'Norwegian (Norsk)' },
  { code: 'ro', label: 'Romanian (Română)' },
  { code: 'hu', label: 'Hungarian (Magyar)' },
  { code: 'uk', label: 'Ukrainian (Українська)' },
  { code: 'zh-CN', label: 'Chinese — Simplified (简体中文)' },
  { code: 'zh-TW', label: 'Chinese — Traditional (繁體中文)' },
];

function authHeaders() {
  const token = sessionStorage.getItem('site_admin_token');
  return token ? { Authorization: `SiteAdmin ${token}` } : {};
}

function CollapsibleHeader({ open, onToggle, title }) {
  return (
    <div
      className="card-header"
      onClick={onToggle}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
    >
      <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', fontSize: 28, color: '#475569', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0, fontWeight: 700 }}>&#9662;</span>
    </div>
  );
}

export default function ShopperLanguageSection({ open, onToggle }) {
  const { t } = useTranslation('admin');
  const { siteConfig } = useContext(SiteContext);
  const siteId = siteConfig?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const [hasKey, setHasKey] = useState(false);
  const [keyMasked, setKeyMasked] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState('global');
  const [enabled, setEnabled] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [purging, setPurging] = useState(false);

  const currentPlan = siteConfig?.subscriptionPlan
    || siteConfig?.subscription_plan
    || siteConfig?.plan
    || 'free';

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sites/${siteId}/translator-settings`, {
          headers: authHeaders(),
        });
        const result = await res.json();
        if (cancelled) return;
        if (result?.success && result?.data) {
          const d = result.data;
          setHasKey(!!d.hasKey);
          setKeyMasked(d.keyMasked || '');
          setRegion(d.region || 'global');
          setEnabled(!!d.enabled);
          setLanguages(Array.isArray(d.languages) ? d.languages : []);
          setUsage(d.usage || null);
        }
      } catch (e) {
        if (!cancelled) setMessage({ type: 'error', text: t('shopperLanguageSection.errorLoad') });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  function toggleLanguage(code) {
    setLanguages((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const body = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (region) body.region = region;
      const res = await fetch(`${API_BASE}/api/sites/${siteId}/translator-settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      const probe = result?.data || result;
      if (probe?.ok) {
        setTestResult({ ok: true, text: t('shopperLanguageSection.testSuccess', { translation: probe.translation || '' }) });
      } else {
        setTestResult({ ok: false, text: probe?.error || result?.error || t('shopperLanguageSection.testFailed') });
      }
    } catch (e) {
      setTestResult({ ok: false, text: e.message || t('shopperLanguageSection.networkError') });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const body = { region, enabled, languages };
      if (apiKey.trim() && !apiKey.trim().startsWith('•')) body.apiKey = apiKey.trim();
      const res = await fetch(`${API_BASE}/api/sites/${siteId}/translator-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (res.ok && result?.success) {
        setMessage({ type: 'success', text: t('shopperLanguageSection.savedSuccess') });
        setApiKey('');
        const refresh = await fetch(`${API_BASE}/api/sites/${siteId}/translator-settings`, { headers: authHeaders() });
        const refreshed = (await refresh.json())?.data;
        if (refreshed) {
          setHasKey(!!refreshed.hasKey);
          setKeyMasked(refreshed.keyMasked || '');
          setEnabled(!!refreshed.enabled);
          setUsage(refreshed.usage || null);
        }
      } else {
        setMessage({ type: 'error', text: result?.error || t('shopperLanguageSection.errorSave') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message || t('shopperLanguageSection.networkError') });
    } finally {
      setSaving(false);
    }
  }

  async function handlePurgeCache() {
    if (!window.confirm(t('shopperLanguageSection.confirmPurge'))) return;
    setPurging(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/storefront/${siteId}/translate/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ scope: 'site' }),
      });
      const result = await res.json();
      if (res.ok && result?.success) {
        const count = Number(result?.data?.deleted || 0);
        try {
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('flomerce_xlt_')) sessionStorage.removeItem(k);
          }
        } catch (e) { /* ignore storage errors */ }
        setMessage({ type: 'success', text: t('shopperLanguageSection.purgeSuccess', { count }) });
      } else {
        setMessage({ type: 'error', text: result?.error || t('shopperLanguageSection.errorPurge') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message || t('shopperLanguageSection.networkError') });
    } finally {
      setPurging(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm(t('shopperLanguageSection.confirmRemove'))) return;
    setRemoving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/sites/${siteId}/translator-settings`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const result = await res.json();
      if (res.ok && result?.success) {
        setHasKey(false);
        setKeyMasked('');
        setEnabled(false);
        setApiKey('');
        setMessage({ type: 'success', text: t('shopperLanguageSection.removeSuccess') });
      } else {
        setMessage({ type: 'error', text: result?.error || t('shopperLanguageSection.errorRemove') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message || t('shopperLanguageSection.networkError') });
    } finally {
      setRemoving(false);
    }
  }

  const enableToggleDisabled = !hasKey;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <CollapsibleHeader open={open} onToggle={onToggle} title={t('shopperLanguageSection.title')} />
      {open && (
        <div className="card-content">
          <FeatureGate currentPlan={currentPlan} requiredPlan="growth" featureName={t('shopperLanguageSection.title')}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>{t('shopperLanguageSection.loading')}</div>
            ) : (
              <div>
                <p style={{ marginTop: 0, color: '#475569', fontSize: 14, lineHeight: 1.5 }}>
                  {t('shopperLanguageSection.intro')}
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                    {t('shopperLanguageSection.apiKeyLabel')}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasKey ? keyMasked : t('shopperLanguageSection.apiKeyPlaceholder')}
                    autoComplete="off"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {t('shopperLanguageSection.apiKeyHint')} {hasKey ? t('shopperLanguageSection.apiKeyHintHasKey') : ''}
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                    {t('shopperLanguageSection.regionLabel')}
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    style={{ width: '100%', maxWidth: 320, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
                  >
                    {TRANSLATOR_REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>{t(`shopperLanguageSection.${r.labelKey}`)} ({r.code})</option>
                    ))}
                  </select>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {t('shopperLanguageSection.regionHint')}
                  </p>
                </div>

                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    style={{ padding: '10px 18px', border: '1px solid #4f46e5', background: '#fff', color: '#4f46e5', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.6 : 1 }}
                  >
                    {testing ? t('shopperLanguageSection.testing') : t('shopperLanguageSection.testConnection')}
                  </button>
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handlePurgeCache}
                      disabled={purging}
                      title={t('shopperLanguageSection.purgeTitle')}
                      style={{ padding: '10px 18px', border: '1px solid #f59e0b', background: '#fff', color: '#b45309', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: purging ? 'not-allowed' : 'pointer', opacity: purging ? 0.6 : 1 }}
                    >
                      {purging ? t('shopperLanguageSection.clearing') : t('shopperLanguageSection.clearCache')}
                    </button>
                  )}
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={removing}
                      style={{ padding: '10px 18px', border: '1px solid #ef4444', background: '#fff', color: '#ef4444', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.6 : 1 }}
                    >
                      {removing ? t('shopperLanguageSection.removing') : t('shopperLanguageSection.removeKey')}
                    </button>
                  )}
                </div>

                {testResult && (
                  <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, background: testResult.ok ? '#f0fdf4' : '#fef2f2', color: testResult.ok ? '#166534' : '#991b1b', border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}` }}>
                    {testResult.text}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                    {t('shopperLanguageSection.languagesLabel')}
                  </label>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 0, marginBottom: 8 }}>
                    {t('shopperLanguageSection.languagesHint')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, maxHeight: 280, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const checked = languages.includes(lang.code);
                      return (
                        <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLanguage(lang.code)}
                          />
                          <span>{lang.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, background: enabled ? '#f0fdf4' : '#f8fafc', opacity: enableToggleDisabled ? 0.7 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{t('shopperLanguageSection.enableToggle')}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {enableToggleDisabled
                        ? t('shopperLanguageSection.enableHintDisabled')
                        : t('shopperLanguageSection.enableHintEnabled')}
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: enableToggleDisabled ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={enableToggleDisabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{ position: 'absolute', cursor: enableToggleDisabled ? 'not-allowed' : 'pointer', inset: 0, borderRadius: 24, transition: '0.3s', background: enabled ? '#10b981' : '#cbd5e1' }}>
                      <span style={{ position: 'absolute', left: enabled ? 22 : 2, top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </span>
                  </label>
                </div>

                {usage && (
                  <div style={{ padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b' }}>{t('shopperLanguageSection.usageTitle')}</div>
                    <div>
                      <Trans
                        i18nKey="shopperLanguageSection.usageMonth"
                        ns="admin"
                        values={{ chars: Number(usage.monthChars || 0).toLocaleString(), monthSuffix: usage.month ? ` (${usage.month})` : '' }}
                        components={{ b: <strong /> }}
                      />
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Trans
                        i18nKey="shopperLanguageSection.usageToday"
                        ns="admin"
                        values={{ chars: Number(usage.dayChars || 0).toLocaleString(), capSuffix: usage.dailyCap ? t('shopperLanguageSection.usageTodayCapSuffix', { cap: Number(usage.dailyCap).toLocaleString() }) : '' }}
                        components={{ b: <strong /> }}
                      />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                      {t('shopperLanguageSection.usageBilling')}
                    </div>
                  </div>
                )}

                {message && (
                  <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                    {message.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '12px 24px', border: 'none', background: '#4f46e5', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? t('shopperLanguageSection.saving') : t('shopperLanguageSection.saveSettings')}
                </button>
              </div>
            )}
          </FeatureGate>
        </div>
      )}
    </div>
  );
}
