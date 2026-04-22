import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../services/api.js';
import { useToast } from '../../../shared/ui/Toast.jsx';

const PRESHIPPED = ['hi', 'es', 'zh-CN', 'ar'];
const LABELS = { hi: 'हिन्दी (Hindi)', es: 'Español (Spanish)', 'zh-CN': '简体中文 (Chinese)', ar: 'العربية (Arabic)' };

export default function I18nAdminPanel() {
  // Bind explicit namespaces this panel reads from. With these declared,
  // i18next short-circuits the per-key fallbackNS walk and resolves every
  // `t('…')` / `t('common:…')` lookup in the named bundle directly,
  // which is the recommended namespaced-access pattern. (Legacy components
  // that haven't been migrated yet still work via the global fallbackNS
  // chain registered in shared/i18n/init.js.)
  const { t } = useTranslation(['owner', 'common']);
  const toast = useToast();
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyLang, setBusyLang] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
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
      const s = data?.stats;
      const detail = s ? ` (${s.translated} translated, ${s.kept} reused)` : '';
      toast.success(t('i18n.regenerated', { lang, count: data.keyCount || '?' }) + detail);
      await loadLocales();
    } catch (e) {
      const msg = e?.message || '';
      if (/rate limit/i.test(msg)) toast.error(t('i18n.rateLimited'));
      else toast.error(msg || t('i18n.regenerateFailed'));
    } finally {
      setBusyLang(null);
    }
  }

  async function refreshAll() {
    setRefreshingAll(true);
    try {
      const res = await apiRequest('/api/admin/i18n/refresh-all', { method: 'POST' });
      const data = res?.data || res;
      const results = data?.results || [];
      const okCount = results.filter((r) => r.ok).length;
      const skipCount = results.filter((r) => r.skipped).length;
      const errCount = results.filter((r) => r.error).length;
      const totalTranslated = results.reduce((sum, r) => sum + (r.stats?.translated || 0), 0);
      toast.success(`Refreshed ${okCount}, skipped ${skipCount}, failed ${errCount}. ${totalTranslated} strings re-translated.`);
      await loadLocales();
    } catch (e) {
      toast.error(e.message || 'Refresh-all failed');
    } finally {
      setRefreshingAll(false);
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

  const totalStale = locales.reduce((s, l) => s + (l.stale || 0) + (l.added || 0), 0);
  const staleLocaleCount = locales.filter((l) => !l.upToDate).length;

  return (
    <div className="oa-section">
      <div className="oa-card">
        <h3>{t('i18n.title')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{t('i18n.desc')}</p>

        <div className="oa-form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>{t('i18n.selectLocale')}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {PRESHIPPED.map((l) => <option key={l} value={l}>{LABELS[l] || l}</option>)}
            </select>
          </div>
          <button
            className="oa-btn oa-btn-primary"
            disabled={busyLang === target}
            onClick={() => regenerate(target)}
          >
            {busyLang === target ? t('i18n.regenerating') : t('i18n.regenerate')}
          </button>
        </div>
      </div>

      {staleLocaleCount > 0 && (
        <div
          className="oa-card"
          style={{
            marginTop: '1rem',
            background: '#fff7ed',
            borderLeft: '4px solid #f97316',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong style={{ color: '#9a3412' }}>{totalStale} translation{totalStale === 1 ? '' : 's'} out of date</strong>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', marginTop: 4 }}>
                {staleLocaleCount} language{staleLocaleCount === 1 ? '' : 's'} need refresh. Only changed strings will be re-translated.
              </div>
            </div>
            <button
              className="oa-btn oa-btn-primary"
              disabled={refreshingAll}
              onClick={refreshAll}
            >
              {refreshingAll ? 'Refreshing…' : 'Refresh all out-of-date'}
            </button>
          </div>
        </div>
      )}

      <div className="oa-card" style={{ marginTop: '1rem' }}>
        <h3>{t('i18n.cachedLocales')}</h3>
        {loading ? (
          <p className="oa-empty">{t('common:loading')}</p>
        ) : locales.length === 0 ? (
          <p className="oa-empty">{t('i18n.noLocales')}</p>
        ) : (
          <table className="oa-table" style={{ width: '100%', marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t('common:language')}</th>
                <th>Status</th>
                <th>Size</th>
                <th>{t('i18n.lastUpdated')}</th>
                <th style={{ textAlign: 'right' }}>{t('common:actions')}</th>
              </tr>
            </thead>
            <tbody>
              {locales.map((l) => {
                const pendingCount = (l.stale || 0) + (l.added || 0);
                return (
                  <tr key={l.lang}>
                    <td><code>{l.lang}</code> {LABELS[l.lang] ? <span style={{ color: '#64748b', fontSize: '0.8rem' }}>— {LABELS[l.lang]}</span> : null}</td>
                    <td>
                      {l.upToDate ? (
                        <span style={{ color: '#15803d', fontSize: '0.85rem' }}>✓ Up to date</span>
                      ) : (
                        <span style={{ color: '#9a3412', fontSize: '0.85rem' }}>
                          {pendingCount} pending
                          {l.removed ? ` · ${l.removed} removed` : ''}
                        </span>
                      )}
                    </td>
                    <td>{(l.size / 1024).toFixed(1)} KB</td>
                    <td>{l.uploaded ? new Date(l.uploaded).toLocaleString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => regenerate(l.lang)} style={{ marginRight: 6 }}>
                        {busyLang === l.lang ? t('i18n.regenerating') : t('i18n.regenerate')}
                      </button>
                      <button className="oa-btn oa-btn-outline" onClick={() => purge(l.lang)}>{t('i18n.purge')}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
