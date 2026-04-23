import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../services/api.js';
import { useToast } from '../../../shared/ui/Toast.jsx';

const PRESHIPPED = ['hi', 'es', 'zh-CN', 'ar'];
const LABELS = { hi: 'हिन्दी (Hindi)', es: 'Español (Spanish)', 'zh-CN': '简体中文 (Chinese)', ar: 'العربية (Arabic)' };

// Format USD with up to 4 decimals so very small amounts ($0.0012) still
// surface a real number instead of rounding to "$0.00".
function fmtUSD(n) {
  const v = Number(n) || 0;
  if (v === 0) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function fmtNumber(n) {
  return new Intl.NumberFormat().format(Number(n) || 0);
}

export default function I18nAdminPanel() {
  // Bind the namespaces this panel reads from. `owner` is primary so
  // `t('i18n.title')` resolves there directly; `common` is also bound so
  // cross-namespace lookups can use the explicit `common:…` prefix syntax.
  const { t } = useTranslation(['owner', 'common']);
  const toast = useToast();
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyLang, setBusyLang] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [target, setTarget] = useState('hi');
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNs, setSelectedNs] = useState(''); // '' = all namespaces

  async function loadLocales() {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/i18n/locales');
      const data = res?.data || res;
      setLocales(data?.locales || []);
    } catch (e) {
      toast.error(e.message || t('i18n.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadNamespaces() {
    try {
      const res = await apiRequest('/api/admin/i18n/namespaces');
      const data = res?.data || res;
      setNamespaces(data?.namespaces || []);
    } catch {
      // Non-fatal — namespace dropdown just stays empty so the user defaults
      // to "all namespaces" behavior.
    }
  }

  useEffect(() => {
    loadLocales();
    loadNamespaces();
  }, []);

  // Fetch the cost preview for a (lang, namespace, force) combination and
  // ask the user to confirm before spending translator quota. Returns true
  // when the user accepts. Falls back to a plain confirm if the preview
  // request itself fails — better to proceed with an honest prompt than to
  // hard-block on a transient API error.
  async function confirmWithPreview({ lang, namespace, force, actionLabel }) {
    let preview = null;
    try {
      const qs = new URLSearchParams();
      if (force) qs.set('force', '1');
      if (namespace) qs.set('namespace', namespace);
      const res = await apiRequest(`/api/admin/i18n/preview/${encodeURIComponent(lang)}?${qs.toString()}`);
      preview = res?.data || res;
    } catch (e) {
      return confirm(t('i18n.previewFallbackConfirm', { lang, action: actionLabel }));
    }
    if (preview.keysToTranslate === 0) {
      return confirm(t('i18n.previewNothingToDo', { lang }));
    }
    const scope = namespace
      ? t('i18n.previewScopeNamespace', { namespace })
      : t('i18n.previewScopeAll');
    const msg = [
      t('i18n.previewHeader', { lang, action: actionLabel }),
      '',
      `${t('i18n.previewScopeLabel')}: ${scope}`,
      `${t('i18n.previewKeysLabel')}: ${fmtNumber(preview.keysToTranslate)}` +
        (preview.keysReused > 0 ? ` (${t('i18n.previewKeysReused', { count: preview.keysReused })})` : ''),
      `${t('i18n.previewCharsLabel')}: ${fmtNumber(preview.charCount)}`,
      `${t('i18n.previewCostLabel')}: ${fmtUSD(preview.estimatedCostUSD)} ` +
        t('i18n.previewCostNote', { rate: preview.pricePerMillionCharsUSD }),
      '',
      t('i18n.previewProceed'),
    ].join('\n');
    return confirm(msg);
  }

  async function regenerate(lang) {
    const ok = await confirmWithPreview({
      lang,
      namespace: selectedNs || null,
      force: false,
      actionLabel: t('i18n.actionRegenerate'),
    });
    if (!ok) return;
    setBusyLang(lang);
    try {
      const qs = selectedNs ? `?namespace=${encodeURIComponent(selectedNs)}` : '';
      const res = await apiRequest(`/api/admin/i18n/regenerate/${encodeURIComponent(lang)}${qs}`, { method: 'POST' });
      const data = res?.data || res;
      const s = data?.stats;
      const detail = s ? t('i18n.regenDetail', { translated: s.translated, kept: s.kept }) : '';
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

  // Force = bypass throttle + ignore prior cache + re-translate every key
  // (in scope — full catalog OR the selected namespace). Used after a
  // translator-pipeline change or when output is visibly corrupted.
  async function forceRegenerate(lang) {
    const ok = await confirmWithPreview({
      lang,
      namespace: selectedNs || null,
      force: true,
      actionLabel: t('i18n.actionForceRegenerate'),
    });
    if (!ok) return;
    setBusyLang(lang);
    try {
      const qs = new URLSearchParams();
      if (selectedNs) qs.set('namespace', selectedNs);
      const url = `/api/admin/i18n/force-regenerate/${encodeURIComponent(lang)}${qs.toString() ? '?' + qs.toString() : ''}`;
      const res = await apiRequest(url, { method: 'POST' });
      const data = res?.data || res;
      const s = data?.stats;
      const detail = s ? t('i18n.regenDetail', { translated: s.translated, kept: s.kept }) : '';
      toast.success(t('i18n.regenerated', { lang, count: data.keyCount || '?' }) + detail);
      await loadLocales();
    } catch (e) {
      toast.error(e?.message || t('i18n.regenerateFailed'));
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
      toast.success(t('i18n.refreshAllSummary', { ok: okCount, skip: skipCount, err: errCount, count: totalTranslated }));
      await loadLocales();
    } catch (e) {
      toast.error(e.message || t('i18n.refreshAllFailed'));
    } finally {
      setRefreshingAll(false);
    }
  }

  async function purge(lang) {
    if (!confirm(t('i18n.purgeConfirm', { lang }))) return;
    try {
      await apiRequest(`/api/admin/i18n/locale/${encodeURIComponent(lang)}`, { method: 'DELETE' });
      await loadLocales();
    } catch (e) {
      toast.error(e.message || t('i18n.purgeFailed'));
    }
  }

  const totalStale = locales.reduce((s, l) => s + (l.stale || 0) + (l.added || 0), 0);
  const staleLocaleCount = locales.filter((l) => !l.upToDate).length;

  return (
    <div className="oa-section">
      <div className="oa-card">
        <h3>{t('i18n.title')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{t('i18n.desc')}</p>

        <div className="oa-form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label>{t('i18n.selectLocale')}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {PRESHIPPED.map((l) => <option key={l} value={l}>{LABELS[l] || l}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label>{t('i18n.namespaceLabel')}</label>
            <select
              value={selectedNs}
              onChange={(e) => setSelectedNs(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}
            >
              <option value="">{t('i18n.namespaceAll')}</option>
              {namespaces.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name} ({n.keyCount})
                </option>
              ))}
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
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
          {t('i18n.namespaceHint')}
        </p>
      </div>

      {staleLocaleCount > 0 && (
        <div
          className="oa-card"
          style={{
            marginTop: '1rem',
            background: '#fff7ed',
            borderInlineStart: '4px solid #f97316',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong style={{ color: '#9a3412' }}>{t('i18n.staleHeader', { count: totalStale })}</strong>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', marginTop: 4 }}>
                {t('i18n.staleSubheader', { count: staleLocaleCount })}
              </div>
            </div>
            <button
              className="oa-btn oa-btn-primary"
              disabled={refreshingAll}
              onClick={refreshAll}
            >
              {refreshingAll ? t('i18n.refreshing') : t('i18n.refreshAll')}
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
                <th style={{ textAlign: 'start' }}>{t('common:language')}</th>
                <th>{t('common:status')}</th>
                <th>{t('i18n.size')}</th>
                <th>{t('i18n.lastUpdated')}</th>
                <th style={{ textAlign: 'end' }}>{t('common:actions')}</th>
              </tr>
            </thead>
            <tbody>
              {locales.map((l) => {
                const pendingCount = (l.stale || 0) + (l.added || 0);
                return (
                  <tr key={l.lang}>
                    <td><code>{l.lang}</code> {LABELS[l.lang] ? <span style={{ color: '#64748b', fontSize: '0.8rem' }}>— {LABELS[l.lang]}</span> : null}</td>
                    <td>
                      {l.pipelineMismatch ? (
                        <span style={{ color: '#9a3412', fontSize: '0.85rem' }} title={t('i18n.pipelineMismatchHint')}>
                          {t('i18n.pipelineOutdated')}
                        </span>
                      ) : l.upToDate ? (
                        <span style={{ color: '#15803d', fontSize: '0.85rem' }}>{t('i18n.upToDate')}</span>
                      ) : (
                        <span style={{ color: '#9a3412', fontSize: '0.85rem' }}>
                          {t('i18n.pending', { count: pendingCount })}
                          {l.removed ? t('i18n.removedSuffix', { count: l.removed }) : ''}
                        </span>
                      )}
                    </td>
                    <td>{(l.size / 1024).toFixed(1)} KB</td>
                    <td>{l.uploaded ? new Date(l.uploaded).toLocaleString() : '—'}</td>
                    <td style={{ textAlign: 'end' }}>
                      <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => regenerate(l.lang)} style={{ marginInlineEnd: 6 }}>
                        {busyLang === l.lang ? t('i18n.regenerating') : t('i18n.regenerate')}
                      </button>
                      <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => forceRegenerate(l.lang)} style={{ marginInlineEnd: 6 }}>
                        {t('i18n.forceRegenerate')}
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
