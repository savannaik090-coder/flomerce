import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../services/api.js';
import { useToast } from '../../../shared/ui/Toast.jsx';

const PRESHIPPED = ['hi', 'es', 'zh-CN', 'ar'];
const LABELS = { hi: 'हिन्दी (Hindi)', es: 'Español (Spanish)', 'zh-CN': '简体中文 (Chinese)', ar: 'العربية (Arabic)' };

export default function I18nAdminPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyLang, setBusyLang] = useState(null);
  const [target, setTarget] = useState('hi');

  async function loadLocales() {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/i18n/locales');
      const data = res?.data || res;
      setLocales(data?.locales || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load locales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLocales(); }, []);

  async function regenerate(lang) {
    setBusyLang(lang);
    try {
      const res = await apiRequest(`/api/admin/i18n/regenerate/${encodeURIComponent(lang)}`, { method: 'POST' });
      const data = res?.data || res;
      toast.success(t('owner.i18n.regenerated', { lang, count: data.keyCount || '?' }));
      await loadLocales();
    } catch (e) {
      const msg = e?.message || '';
      if (/rate limit/i.test(msg)) toast.error(t('owner.i18n.rateLimited'));
      else toast.error(msg || t('owner.i18n.regenerateFailed'));
    } finally {
      setBusyLang(null);
    }
  }

  async function purge(lang) {
    if (!confirm(`Purge cached locale "${lang}"? It will be regenerated on next request.`)) return;
    try {
      await apiRequest(`/api/admin/i18n/locale/${encodeURIComponent(lang)}`, { method: 'DELETE' });
      await loadLocales();
    } catch (e) {
      toast.error(e.message || 'Purge failed');
    }
  }

  return (
    <div className="oa-section">
      <div className="oa-card">
        <h3>{t('owner.i18n.title')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{t('owner.i18n.desc')}</p>

        <div className="oa-form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>{t('owner.i18n.selectLocale')}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {PRESHIPPED.map((l) => <option key={l} value={l}>{LABELS[l] || l}</option>)}
            </select>
          </div>
          <button
            className="oa-btn oa-btn-primary"
            disabled={busyLang === target}
            onClick={() => regenerate(target)}
          >
            {busyLang === target ? t('owner.i18n.regenerating') : t('owner.i18n.regenerate')}
          </button>
        </div>
      </div>

      <div className="oa-card" style={{ marginTop: '1rem' }}>
        <h3>{t('owner.i18n.cachedLocales')}</h3>
        {loading ? (
          <p className="oa-empty">{t('common.loading')}</p>
        ) : locales.length === 0 ? (
          <p className="oa-empty">{t('owner.i18n.noLocales')}</p>
        ) : (
          <table className="oa-table" style={{ width: '100%', marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t('common.language')}</th>
                <th>Size</th>
                <th>{t('owner.i18n.lastUpdated')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {locales.map((l) => (
                <tr key={l.lang}>
                  <td><code>{l.lang}</code> {LABELS[l.lang] ? <span style={{ color: '#64748b', fontSize: '0.8rem' }}>— {LABELS[l.lang]}</span> : null}</td>
                  <td>{(l.size / 1024).toFixed(1)} KB</td>
                  <td>{l.uploaded ? new Date(l.uploaded).toLocaleString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => regenerate(l.lang)} style={{ marginRight: 6 }}>
                      {busyLang === l.lang ? t('owner.i18n.regenerating') : t('owner.i18n.regenerate')}
                    </button>
                    <button className="oa-btn oa-btn-outline" onClick={() => purge(l.lang)}>{t('owner.i18n.purge')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
