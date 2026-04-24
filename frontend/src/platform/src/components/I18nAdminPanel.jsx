import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { refreshLocale, PRESHIPPED as ALL_ACTIVE } from '../../../shared/i18n/init.js';

// Owner-side translation panel manages every active non-English locale. The
// list is derived from the shared PRESHIPPED set (India bucket ∪ Foreign
// bucket) so adding/removing a language in `init.js` automatically flows here
// — no parallel hardcoded list to keep in sync. English is excluded because
// it's the source catalog (no translation to manage).
const PRESHIPPED = ALL_ACTIVE.filter((c) => c !== 'en');
const LABELS = {
  hi: 'हिन्दी (Hindi)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  ml: 'മലയാളം (Malayalam)',
  kn: 'ಕನ್ನಡ (Kannada)',
  mr: 'मराठी (Marathi)',
  bn: 'বাংলা (Bengali)',
  gu: 'ગુજરાતી (Gujarati)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  it: 'Italiano (Italian)',
  nl: 'Nederlands (Dutch)',
  pt: 'Português (Portuguese)',
  ja: '日本語 (Japanese)',
  ko: '한국어 (Korean)',
  'zh-CN': '简体中文 (Chinese Simplified)',
};

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
  // `"Admin UI Translations"` resolves there directly; `common` is also bound so
  // cross-namespace lookups can use the explicit `common:…` prefix syntax.
  const toast = useToast();
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyLang, setBusyLang] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [target, setTarget] = useState('hi');
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNs, setSelectedNs] = useState(''); // '' = all namespaces

  // Phase A: per-key editor sub-view. When `editor.lang` is set we render the
  // string-editing panel instead of the locales table; otherwise the main
  // panel is shown. Editor namespace defaults to "common" because all-keys
  // would be huge to render at once.
  const [editor, setEditor] = useState(null); // { lang, namespace }

  // Phase D: TM efficiency stats card.
  const [tmStats, setTmStats] = useState(null);

  async function loadLocales() {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/i18n/locales');
      const data = res?.data || res;
      setLocales(data?.locales || []);
    } catch (e) {
      toast.error(e.message || "Failed to load locales");
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

  async function loadTmStats() {
    try {
      const res = await apiRequest('/api/admin/i18n/tm-stats');
      setTmStats(res?.data || res);
    } catch {
      // Non-fatal — TM card just hides itself.
      setTmStats(null);
    }
  }

  useEffect(() => {
    loadLocales();
    loadNamespaces();
    loadTmStats();
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
      return confirm(`Could not load cost preview. ${actionLabel} ${lang} anyway?`);
    }
    if (preview.keysToTranslate === 0) {
      return confirm(`${lang} is already up to date for this scope. Nothing to translate. Run anyway?`);
    }
    const scope = namespace
      ? `Namespace: ${namespace}`
      : "All namespaces";
    const msg = [
      `Cost preview for ${lang} (${actionLabel})`,
      '',
      `${"Scope"}: ${scope}`,
      `${"Keys to translate"}: ${fmtNumber(preview.keysToTranslate)}` +
        (preview.keysReused > 0 ? ` (${preview.keysReused} reused from cache)` : ''),
      `${"Characters"}: ${fmtNumber(preview.charCount)}`,
      `${"Estimated cost"}: ${fmtUSD(preview.estimatedCostUSD)} ` +
        `(at $${preview.pricePerMillionCharsUSD} per 1M chars)`,
      '',
      "Proceed?",
    ].join('\n');
    return confirm(msg);
  }

  async function regenerate(lang) {
    const ok = await confirmWithPreview({
      lang,
      namespace: selectedNs || null,
      force: false,
      actionLabel: "Regenerate",
    });
    if (!ok) return;
    setBusyLang(lang);
    try {
      const qs = selectedNs ? `?namespace=${encodeURIComponent(selectedNs)}` : '';
      const res = await apiRequest(`/api/admin/i18n/regenerate/${encodeURIComponent(lang)}${qs}`, { method: 'POST' });
      const data = res?.data || res;
      const s = data?.stats;
      const detail = s ? ` (${s.translated} translated, ${s.kept} reused)` : '';
      toast.success(`Regenerated ${lang} successfully (${data.keyCount || '?'} keys).` + detail);
      await loadLocales();
      await loadTmStats();
      // Phase B: live update — re-fetch the catalog into i18next so React
      // re-renders this tab AND broadcast to other open tabs.
      await refreshLocale(lang);
    } catch (e) {
      const msg = e?.message || '';
      if (/rate limit/i.test(msg)) toast.error("Rate limit reached for this locale (50/day). Try again tomorrow, or use Force regenerate to bypass.");
      else toast.error(msg || "Regeneration failed");
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
      actionLabel: "Force regenerate",
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
      const detail = s ? ` (${s.translated} translated, ${s.kept} reused)` : '';
      toast.success(`Regenerated ${lang} successfully (${data.keyCount || '?'} keys).` + detail);
      await loadLocales();
      await loadTmStats();
      await refreshLocale(lang);
    } catch (e) {
      toast.error(e?.message || "Regeneration failed");
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
      await loadTmStats();
      // Phase B: refresh every locale that the worker actually regenerated.
      for (const r of results) {
        if (r.ok && r.lang) {
          // eslint-disable-next-line no-await-in-loop
          await refreshLocale(r.lang);
        }
      }
    } catch (e) {
      toast.error(e.message || "Refresh-all failed");
    } finally {
      setRefreshingAll(false);
    }
  }

  // "Delete & reset" — drops R2 + every override row, busts the edge.
  async function purgeReset(lang) {
    if (!confirm(`Delete the cached "${lang}" catalog AND clear all manual overrides for it? The next request will lazy-regenerate from scratch.`)) return;
    try {
      await apiRequest(`/api/admin/i18n/locale/${encodeURIComponent(lang)}`, { method: 'DELETE' });
      await loadLocales();
      await refreshLocale(lang);
    } catch (e) {
      toast.error(e.message || "Purge failed");
    }
  }

  // Phase C: edge-only purge, leaves R2 + overrides intact.
  async function purgeEdge(lang) {
    if (!confirm(`Bust the Cloudflare edge cache for "${lang}"? Storage and overrides are kept.`)) return;
    try {
      const res = await apiRequest(`/api/admin/i18n/purge-edge/${encodeURIComponent(lang)}`, { method: 'POST' });
      const data = res?.data || res;
      if (data?.ok) {
        toast.success(`Edge cache purged for ${lang}.`);
      } else if (data?.result?.reason === 'missing-credentials') {
        // Local dev / unconfigured Cloudflare zone: not really a failure, the
        // operator just hasn't wired up CF_API_TOKEN + CF_ZONE_ID yet. Use a
        // distinct toast so they know storage is intact and how to enable it.
        toast("Edge cache purge skipped: Cloudflare API credentials (CF_API_TOKEN, CF_ZONE_ID) are not configured. Storage was not changed.", { icon: 'ℹ️' });
      } else {
        toast.error(`Edge cache purge failed for ${lang}.`);
      }
    } catch (e) {
      toast.error(e.message || `Edge cache purge failed for ${lang}.`);
    }
  }

  const totalStale = locales.reduce((s, l) => s + (l.stale || 0) + (l.added || 0), 0);
  const staleLocaleCount = locales.filter((l) => !l.upToDate).length;

  // Editor sub-view short-circuits the main render so the user has a focused
  // workspace for per-key edits without the locales table competing for room.
  if (editor) {
    return (
      <StringEditor
        lang={editor.lang}
        initialNamespace={editor.namespace || 'common'}
        namespaces={namespaces}
        onClose={async () => {
          setEditor(null);
          await loadLocales();
          await loadTmStats();
          await refreshLocale(editor.lang);
        }}
      />
    );
  }

  return (
    <div className="oa-section">
      <GuideCard t={t} />

      <div className="oa-card">
        <h3>{"Admin UI Translations"}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{"Pre-shipped languages: English, Hindi, Spanish, Simplified Chinese, Arabic. Other locales are auto-generated via Microsoft Translator on first request and cached in R2 storage."}</p>

        <div className="oa-form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label>{"Select locale to regenerate"}</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              {PRESHIPPED.map((l) => <option key={l} value={l}>{LABELS[l] || l}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label>{"Namespace (optional)"}</label>
            <select
              value={selectedNs}
              onChange={(e) => setSelectedNs(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}
            >
              <option value="">{"All namespaces (full catalog)"}</option>
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
            {busyLang === target ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
          {'Pick a single namespace to translate just that section and reduce cost. Leave as "all" to refresh the full catalog.'}
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
              <strong style={{ color: '#9a3412' }}>{`${totalStale} translation${totalStale === 1 ? '' : 's'} out of date`}</strong>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', marginTop: 4 }}>
                {`${staleLocaleCount} language${staleLocaleCount === 1 ? '' : 's'} need${staleLocaleCount === 1 ? 's' : ''} refresh. Only changed strings will be re-translated.`}
              </div>
            </div>
            <button
              className="oa-btn oa-btn-primary"
              disabled={refreshingAll}
              onClick={refreshAll}
            >
              {refreshingAll ? "Refreshing…" : "Refresh all out-of-date"}
            </button>
          </div>
        </div>
      )}

      <TmStatsCard stats={tmStats} t={t} />

      <div className="oa-card" style={{ marginTop: '1rem' }}>
        <h3>{"Cached locales"}</h3>
        {loading ? (
          <p className="oa-empty">{"Loading..."}</p>
        ) : locales.length === 0 ? (
          <p className="oa-empty">{"No locales cached yet."}</p>
        ) : (
          <>
            <div className="oa-table-wrap">
              <table className="oa-table" style={{ width: '100%', marginTop: '0.5rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'start' }}>{"Language"}</th>
                    <th>{"Status"}</th>
                    <th>{"Size"}</th>
                    <th>{"Last updated"}</th>
                    <th style={{ textAlign: 'end' }}>{"Actions"}</th>
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
                            <span style={{ color: '#9a3412', fontSize: '0.85rem' }} title={"These translations were produced by an older translator pipeline and may contain corrupted placeholders or formatting. Click Force regenerate to rebuild from scratch."}>
                              {"⚠ Pipeline outdated — force regenerate"}
                            </span>
                          ) : l.upToDate ? (
                            <span style={{ color: '#15803d', fontSize: '0.85rem' }}>{"✓ Up to date"}</span>
                          ) : (
                            <span style={{ color: '#9a3412', fontSize: '0.85rem' }}>
                              {`${pendingCount} pending`}
                              {l.removed ? ` · ${l.removed} removed` : ''}
                            </span>
                          )}
                        </td>
                        <td>{(l.size / 1024).toFixed(1)} KB</td>
                        <td>{l.uploaded ? new Date(l.uploaded).toLocaleString() : '—'}</td>
                        <td style={{ textAlign: 'end' }}>
                          <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => regenerate(l.lang)} style={{ marginInlineEnd: 6, marginBlockEnd: 4 }}>
                            {busyLang === l.lang ? "Regenerating..." : "Regenerate"}
                          </button>
                          <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => forceRegenerate(l.lang)} style={{ marginInlineEnd: 6, marginBlockEnd: 4 }}>
                            {"Force regenerate"}
                          </button>
                          <button
                            className="oa-btn oa-btn-outline"
                            onClick={() => setEditor({ lang: l.lang, namespace: selectedNs || 'common' })}
                            style={{ marginInlineEnd: 6, marginBlockEnd: 4 }}
                          >
                            {"Edit translations"}
                          </button>
                          <button className="oa-btn oa-btn-outline" onClick={() => purgeEdge(l.lang)} style={{ marginInlineEnd: 6, marginBlockEnd: 4 }}>
                            {"Purge edge cache"}
                          </button>
                          <button className="oa-btn oa-btn-outline" onClick={() => purgeReset(l.lang)} style={{ marginBlockEnd: 4 }}>
                            {"Delete & reset"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-only card variant — `.oa-card-list-mobile` is hidden on
                desktop and replaces the table at <=640px via owner-admin.css. */}
            <div className="oa-card-list-mobile">
              {locales.map((l) => {
                const pendingCount = (l.stale || 0) + (l.added || 0);
                return (
                  <div key={l.lang} className="oa-i18n-locale-card">
                    <div className="oa-i18n-locale-card-header">
                      <div>
                        <div className="oa-i18n-locale-card-name">
                          <code>{l.lang}</code>
                          {LABELS[l.lang] && <span> — {LABELS[l.lang]}</span>}
                        </div>
                        <div className="oa-i18n-locale-card-meta">
                          {(l.size / 1024).toFixed(1)} KB · {l.uploaded ? new Date(l.uploaded).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div>
                        {l.pipelineMismatch ? (
                          <span className="oa-i18n-status oa-i18n-status-warn" title={"These translations were produced by an older translator pipeline and may contain corrupted placeholders or formatting. Click Force regenerate to rebuild from scratch."}>
                            {"⚠ Pipeline outdated — force regenerate"}
                          </span>
                        ) : l.upToDate ? (
                          <span className="oa-i18n-status oa-i18n-status-ok">{"✓ Up to date"}</span>
                        ) : (
                          <span className="oa-i18n-status oa-i18n-status-warn">
                            {`${pendingCount} pending`}
                            {l.removed ? ` · ${l.removed} removed` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="oa-i18n-locale-card-actions">
                      <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => regenerate(l.lang)}>
                        {busyLang === l.lang ? "Regenerating..." : "Regenerate"}
                      </button>
                      <button className="oa-btn oa-btn-outline" disabled={busyLang === l.lang} onClick={() => forceRegenerate(l.lang)}>
                        {"Force regenerate"}
                      </button>
                      <button
                        className="oa-btn oa-btn-outline"
                        onClick={() => setEditor({ lang: l.lang, namespace: selectedNs || 'common' })}
                      >
                        {"Edit translations"}
                      </button>
                      <button className="oa-btn oa-btn-outline" onClick={() => purgeEdge(l.lang)}>
                        {"Purge edge cache"}
                      </button>
                      <button className="oa-btn oa-btn-outline" onClick={() => purgeReset(l.lang)}>
                        {"Delete & reset"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Collapsible "how this works" guide. Defaults to collapsed so it       */
/* doesn't push the actual controls below the fold on first visit, but   */
/* the toggle state persists in localStorage so power users keep their   */
/* preference across sessions.                                           */
/* --------------------------------------------------------------------- */
function GuideCard({ t }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('flomerce.i18n.guideOpen') === '1'; } catch { return false; }
  });
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem('flomerce.i18n.guideOpen', next ? '1' : '0'); } catch (_) { /* ignore */ }
      return next;
    });
  };
  return (
    <div className="oa-card oa-i18n-guide">
      <div className="oa-i18n-guide-header">
        <h3 style={{ margin: 0 }}>{"How this works — quick guide"}</h3>
        <button className="oa-btn oa-btn-outline" onClick={toggle}>
          {open ? "Hide guide" : "Show guide"}
        </button>
      </div>
      {open && (
        <div className="oa-i18n-guide-body">
          <p>{"Your admin UI ships with 5 built-in languages. Other languages are auto-translated by Microsoft Translator on first use, cached in storage, and served from Cloudflare's edge for 7 days."}</p>

          <h4>{"What each button does"}</h4>
          <ul>
            <li>{"Regenerate — Re-translates only the strings that changed since last time. Cheapest option. Use this most of the time."}</li>
            <li>{"Force regenerate — Re-translates every string from scratch (manual overrides are still preserved). Use only if a language looks broken."}</li>
            <li>{"Refresh all out-of-date — Same as Regenerate but loops through every stale language in one click."}</li>
            <li>{'Edit translations — Hand-edit any string. "Save" pins your version forever (sticky override). "Re-translate" redoes one key. "Clear override" returns to auto.'}</li>
            <li>{"Purge edge cache — Tells Cloudflare to drop the cached copy. You almost never need this — every other action already does it automatically."}</li>
            <li>{"Delete & reset — Wipes the language file AND all manual overrides for it. Destructive. Use only for a full factory reset."}</li>
          </ul>

          <h4>{"About Translation Memory"}</h4>
          <p>{"Every translated phrase is saved in a shared phrasebook keyed by (English source + target language). Future regenerates of the same language — and re-creating a deleted language — reuse those entries for free, skipping the Microsoft API entirely."}</p>

          <h4>{"Quick decision guide"}</h4>
          <ul>
            <li>{"Shipped new English strings? → Refresh all out-of-date"}</li>
            <li>{"One language looks broken? → Force regenerate on that row"}</li>
            <li>{"Microsoft mistranslated a phrase? → Edit translations → Save"}</li>
            <li>{"Backend changed but old copy still served? → Purge edge cache"}</li>
            <li>{"Want to start a language from zero? → Delete & reset"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Phase D: TM efficiency stats card.                                    */
/* --------------------------------------------------------------------- */
function TmStatsCard({ stats, t }) {
  if (!stats) return null;
  const empty = !stats.rows;
  return (
    <div className="oa-card" style={{ marginTop: '1rem' }}>
      <h3>{"Translation Memory"}</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>{"Every translated string is cached platform-wide. Subsequent locales reuse known translations and skip the Microsoft API call entirely."}</p>
      {empty ? (
        <p className="oa-empty">{"No translation memory yet — generate a locale to start filling it."}</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Stat label={"Stored phrases"} value={fmtNumber(stats.rows)} />
            <Stat label={"Reuse hits"} value={fmtNumber(stats.hits)} />
            <Stat label={"Characters saved"} value={fmtNumber(stats.charsSaved)} />
            <Stat label={"Estimated savings"} value={fmtUSD(stats.costSavedUSD)} accent />
          </div>
          {stats.byLang && stats.byLang.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>{"Top languages"}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {stats.byLang.slice(0, 8).map((row) => (
                  <span
                    key={row.lang}
                    style={{
                      display: 'inline-flex',
                      gap: 6,
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      background: '#f1f5f9',
                      borderRadius: 999,
                      color: '#0f172a',
                    }}
                  >
                    <code>{row.lang}</code>
                    <span style={{ color: '#64748b' }}>·</span>
                    <span>{fmtNumber(row.rows)}</span>
                    <span style={{ color: '#64748b' }}>·</span>
                    <span>{fmtNumber(row.hits)}↻</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div
      style={{
        background: accent ? '#ecfdf5' : '#f8fafc',
        border: `1px solid ${accent ? '#a7f3d0' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: accent ? '#047857' : '#0f172a' }}>{value}</div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Phase A: per-key string editor.                                       */
/* --------------------------------------------------------------------- */
function StringEditor({ lang, initialNamespace, namespaces, onClose }) {
  const toast = useToast();
  const [ns, setNs] = useState(initialNamespace);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState({}); // path -> in-progress edit value
  const [busyPath, setBusyPath] = useState(null);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/admin/i18n/strings/${encodeURIComponent(lang)}?namespace=${encodeURIComponent(ns)}`);
      const data = res?.data || res;
      setRows(data?.rows || []);
      setDrafts({});
    } catch (e) {
      toast.error(e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lang, ns]);

  // Save the current draft as a manual override. Refreshing this locale into
  // i18next at the end means the parent admin tab updates immediately.
  async function save(path) {
    const value = drafts[path];
    if (typeof value !== 'string' || value.length === 0) return;
    setBusyPath(path);
    try {
      const res = await apiRequest(`/api/admin/i18n/translate-key/${encodeURIComponent(lang)}`, {
        method: 'POST',
        body: JSON.stringify({ path, value }),
      });
      const data = res?.data || res;
      // Reflect change locally without a full reload — keeps cursor position
      // and the user's edit context intact.
      setRows((prev) => prev.map((r) => (r.path === path ? { ...r, current: data.value, hasOverride: true } : r)));
      setDrafts((prev) => { const c = { ...prev }; delete c[path]; return c; });
      toast.success(`Saved override for ${path}.`);
      await refreshLocale(lang);
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setBusyPath(null);
    }
  }

  // Re-translate a single key from EN through Microsoft, no override stored.
  async function retranslate(path) {
    setBusyPath(path);
    try {
      const res = await apiRequest(`/api/admin/i18n/translate-key/${encodeURIComponent(lang)}`, {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
      const data = res?.data || res;
      setRows((prev) => prev.map((r) => (r.path === path ? { ...r, current: data.value, hasOverride: false } : r)));
      setDrafts((prev) => { const c = { ...prev }; delete c[path]; return c; });
      toast.success(`Re-translated ${path}.`);
      await refreshLocale(lang);
    } catch (e) {
      const msg = e?.message || '';
      if (/rate limit/i.test(msg)) toast.error("Rate limit reached for this locale (50/day). Try again tomorrow, or use Force regenerate to bypass.");
      else toast.error(msg || "Re-translate failed");
    } finally {
      setBusyPath(null);
    }
  }

  // Clear an existing override AND re-translate, in one round-trip.
  async function clearOverride(path) {
    setBusyPath(path);
    try {
      const res = await apiRequest(
        `/api/admin/i18n/override/${encodeURIComponent(lang)}?path=${encodeURIComponent(path)}`,
        { method: 'DELETE' },
      );
      const data = res?.data || res;
      setRows((prev) => prev.map((r) => (r.path === path ? { ...r, current: data.value, hasOverride: false } : r)));
      setDrafts((prev) => { const c = { ...prev }; delete c[path]; return c; });
      toast.success(`Cleared override and re-translated ${path}.`);
      await refreshLocale(lang);
    } catch (e) {
      const msg = e?.message || '';
      if (/rate limit/i.test(msg)) toast.error("Rate limit reached for this locale (50/day). Try again tomorrow, or use Force regenerate to bypass.");
      else toast.error(msg || "Re-translate failed");
    } finally {
      setBusyPath(null);
    }
  }

  const filtered = filter
    ? rows.filter((r) => r.path.toLowerCase().includes(filter.toLowerCase()) ||
                         (r.en || '').toLowerCase().includes(filter.toLowerCase()) ||
                         (r.current || '').toLowerCase().includes(filter.toLowerCase()))
    : rows;

  return (
    <div className="oa-section">
      <div className="oa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>{`Edit translations — ${lang}`}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6, marginBottom: 0 }}>
              {"Edit any string by hand. Manual overrides survive future regenerates. Clear an override to fall back to the auto-translated value."}
            </p>
          </div>
          <button className="oa-btn oa-btn-outline" onClick={onClose}>{"Back"}</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 220px' }}>
            <label>{"Namespace (optional)"}</label>
            <select
              value={ns}
              onChange={(e) => setNs(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}
            >
              {namespaces.map((n) => (
                <option key={n.name} value={n.name}>{n.name} ({n.keyCount})</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <label>Filter</label>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="key, English, or current value…"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}
            />
          </div>
        </div>
      </div>

      <div className="oa-card" style={{ marginTop: '1rem' }}>
        {loading ? (
          <p className="oa-empty">{"Loading strings…"}</p>
        ) : filtered.length === 0 ? (
          <p className="oa-empty">{"No strings in this namespace."}</p>
        ) : (
          <>
          <div className="oa-table-wrap">
          <table className="oa-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'start', width: '22%' }}>{"Key"}</th>
                <th style={{ textAlign: 'start', width: '32%' }}>{"English"}</th>
                <th style={{ textAlign: 'start', width: '32%' }}>{`Current (${lang})`}</th>
                <th style={{ textAlign: 'end', width: '14%' }}>{"Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const draft = drafts[r.path];
                const value = typeof draft === 'string' ? draft : (r.current ?? '');
                const dirty = typeof draft === 'string' && draft !== (r.current ?? '');
                return (
                  <tr key={r.path}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', verticalAlign: 'top', wordBreak: 'break-all' }}>
                      {r.path}
                      {r.hasOverride && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            background: '#fef3c7',
                            border: '1px solid #fcd34d',
                            borderRadius: 4,
                            color: '#92400e',
                          }}>{"Override"}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top', fontSize: '0.85rem', color: '#334155' }}>{r.en}</td>
                    <td style={{ verticalAlign: 'top' }}>
                      <textarea
                        value={value}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [r.path]: e.target.value }))}
                        rows={Math.min(4, Math.max(1, Math.ceil((value || '').length / 60)))}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '0.85rem',
                          borderRadius: 6,
                          border: dirty ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'end', verticalAlign: 'top' }}>
                      <button
                        className="oa-btn oa-btn-primary"
                        onClick={() => save(r.path)}
                        disabled={!dirty || busyPath === r.path}
                        style={{ marginBlockEnd: 4, marginInlineEnd: 4 }}
                      >
                        {"Save override"}
                      </button>
                      <button
                        className="oa-btn oa-btn-outline"
                        onClick={() => retranslate(r.path)}
                        disabled={busyPath === r.path}
                        style={{ marginBlockEnd: 4, marginInlineEnd: 4 }}
                      >
                        {"Re-translate"}
                      </button>
                      {r.hasOverride && (
                        <button
                          className="oa-btn oa-btn-outline"
                          onClick={() => clearOverride(r.path)}
                          disabled={busyPath === r.path}
                          style={{ marginBlockEnd: 4 }}
                        >
                          {"Clear override"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Mobile card variant for the per-key editor. The desktop table
              hides at <=640px (see `.oa-table-wrap` rule); this stacked
              layout takes over so each row is fully reachable on a phone. */}
          <div className="oa-card-list-mobile">
            {filtered.map((r) => {
              const draft = drafts[r.path];
              const value = typeof draft === 'string' ? draft : (r.current ?? '');
              const dirty = typeof draft === 'string' && draft !== (r.current ?? '');
              return (
                <div key={r.path} className="oa-i18n-string-card">
                  <div className="oa-i18n-string-card-key">
                    <code>{r.path}</code>
                    {r.hasOverride && (
                      <span className="oa-i18n-override-badge">{"Override"}</span>
                    )}
                  </div>
                  <div className="oa-i18n-string-card-row">
                    <div className="oa-i18n-string-card-label">{"English"}</div>
                    <div className="oa-i18n-string-card-en">{r.en}</div>
                  </div>
                  <div className="oa-i18n-string-card-row">
                    <div className="oa-i18n-string-card-label">{`Current (${lang})`}</div>
                    <textarea
                      value={value}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [r.path]: e.target.value }))}
                      rows={Math.min(5, Math.max(2, Math.ceil((value || '').length / 40)))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '0.9rem',
                        borderRadius: 6,
                        border: dirty ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div className="oa-i18n-string-card-actions">
                    <button
                      className="oa-btn oa-btn-primary"
                      onClick={() => save(r.path)}
                      disabled={!dirty || busyPath === r.path}
                    >
                      {"Save override"}
                    </button>
                    <button
                      className="oa-btn oa-btn-outline"
                      onClick={() => retranslate(r.path)}
                      disabled={busyPath === r.path}
                    >
                      {"Re-translate"}
                    </button>
                    {r.hasOverride && (
                      <button
                        className="oa-btn oa-btn-outline"
                        onClick={() => clearOverride(r.path)}
                        disabled={busyPath === r.path}
                      >
                        {"Clear override"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
