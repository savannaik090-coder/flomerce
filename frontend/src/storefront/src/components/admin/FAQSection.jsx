import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { apiRequest } from '../../services/api.js';
import {
  FAQ_CLASSIC_STYLE_DEFAULTS,
  FAQ_MODERN_STYLE_DEFAULTS,
} from '../../defaults/index.js';
import { useDirtyTracker } from '../../hooks/useDirtyTracker.js';
import SaveBar from './SaveBar.jsx';
import AdminColorField from './style/AdminColorField.jsx';
import AdminFontPicker from './style/AdminFontPicker.jsx';

export default function FAQSection() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [faqItems, setFaqItems] = useState([]);
  const [showFaq, setShowFaq] = useState(true);
  const [faqInNavbar, setFaqInNavbar] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Style overrides per template — kept side-by-side so editing one template
  // never disturbs the other's saved values.
  const [classicStyle, setClassicStyle] = useState({});
  const [modernStyle, setModernStyle] = useState({});
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleStatus, setStyleStatus] = useState('');
  const hasLoadedStyleRef = useRef(false);
  const styleDirty = useDirtyTracker({ classicStyle, modernStyle });

  const activeStyle = isModern ? modernStyle : classicStyle;
  const setActiveStyle = isModern ? setModernStyle : setClassicStyle;
  const styleDefaults = isModern ? FAQ_MODERN_STYLE_DEFAULTS : FAQ_CLASSIC_STYLE_DEFAULTS;

  function updateStyleField(key, value) {
    setActiveStyle(prev => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function resetStyleGroup(keys) {
    setActiveStyle(prev => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  useEffect(() => {
    if (siteConfig) {
      let settings = siteConfig.settings || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      setFaqItems(settings.faq || []);
      setShowFaq(settings.showFaq !== false);
      setFaqInNavbar(settings.faqInNavbar === true);

      const faqPage = settings.faqPage || {};
      const csVal = (faqPage.classicStyle && typeof faqPage.classicStyle === 'object') ? faqPage.classicStyle : {};
      const msVal = (faqPage.modernStyle && typeof faqPage.modernStyle === 'object') ? faqPage.modernStyle : {};
      setClassicStyle(csVal);
      setModernStyle(msVal);
      requestAnimationFrame(() => {
        styleDirty.baseline({ classicStyle: csVal, modernStyle: msVal });
        hasLoadedStyleRef.current = true;
      });
    }
  }, [siteConfig]);

  function generateId() {
    return 'faq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  async function saveSettings(items, show, navbar) {
    setSaving(true);
    setMessage('');
    try {
      await apiRequest(`/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            faq: items,
            showFaq: show,
            faqInNavbar: navbar,
          },
        }),
      });
      await refetchSite();
      setMessage("FAQ saved successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Failed to save: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveStyle() {
    setStyleSaving(true);
    setStyleStatus('');
    try {
      await apiRequest(`/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            faqPage: {
              classicStyle,
              modernStyle,
            },
          },
        }),
      });
      await refetchSite();
      setStyleStatus('success');
      styleDirty.markSaved();
      setTimeout(() => setStyleStatus(''), 3000);
    } catch (err) {
      setStyleStatus('error:' + (err.message || "Unknown error"));
    } finally {
      setStyleSaving(false);
    }
  }

  function handleAddItem() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const updated = [...faqItems, { id: generateId(), question: newQuestion.trim(), answer: newAnswer.trim() }];
    setFaqItems(updated);
    setNewQuestion('');
    setNewAnswer('');
    setShowAddForm(false);
    saveSettings(updated, showFaq, faqInNavbar);
  }

  function handleDeleteItem(id) {
    const updated = faqItems.filter(item => item.id !== id);
    setFaqItems(updated);
    saveSettings(updated, showFaq, faqInNavbar);
  }

  function handleStartEdit(item) {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  }

  function handleSaveEdit() {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    const updated = faqItems.map(item =>
      item.id === editingId ? { ...item, question: editQuestion.trim(), answer: editAnswer.trim() } : item
    );
    setFaqItems(updated);
    setEditingId(null);
    saveSettings(updated, showFaq, faqInNavbar);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const updated = [...faqItems];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setFaqItems(updated);
    saveSettings(updated, showFaq, faqInNavbar);
  }

  function handleMoveDown(index) {
    if (index === faqItems.length - 1) return;
    const updated = [...faqItems];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setFaqItems(updated);
    saveSettings(updated, showFaq, faqInNavbar);
  }

  function handleToggleShowFaq(val) {
    setShowFaq(val);
    saveSettings(faqItems, val, faqInNavbar);
  }

  function handleToggleFaqInNavbar(val) {
    setFaqInNavbar(val);
    saveSettings(faqItems, showFaq, val);
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical' };
  const btnPrimary = {
    padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };
  const btnOutline = {
    padding: '8px 20px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  };
  const btnDanger = {
    padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none',
    borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  };
  const cardStyle = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '16px 20px', marginBottom: 12,
  };

  const failedKeyword = "Failed";

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>FAQ Management</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Add frequently asked questions for your customers.</p>
        </div>
        {message && (
          <span style={{ fontSize: 13, color: message.includes(failedKeyword) ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{message}</span>
        )}
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 15 }}>Show FAQ Page</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Enable the /faq page on your storefront</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input type="checkbox" checked={showFaq} onChange={e => handleToggleShowFaq(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: showFaq ? '#2563eb' : '#cbd5e1', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', left: showFaq ? 22 : 2, top: 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 15 }}>Show in Navbar</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Add an FAQ link in the storefront navigation bar</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
            <input type="checkbox" checked={faqInNavbar} onChange={e => handleToggleFaqInNavbar(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <span style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: faqInNavbar ? '#2563eb' : '#cbd5e1', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', left: faqInNavbar ? 22 : 2, top: 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </span>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
          {`Questions (${faqItems.length})`}
        </h3>
        {!showAddForm && (
          <button style={btnPrimary} onClick={() => setShowAddForm(true)}>
            <i className="fas fa-plus" style={{ marginInlineEnd: 6 }}></i> Add Question
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ ...cardStyle, borderColor: '#2563eb', borderWidth: 2, marginBottom: 20 }}>
          <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 12px', fontSize: 15 }}>New Question</p>
          <input
            type="text"
            placeholder="Enter the question..."
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
            autoFocus
          />
          <textarea
            placeholder="Enter the answer..."
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            style={textareaStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={btnPrimary} onClick={handleAddItem} disabled={saving || !newQuestion.trim() || !newAnswer.trim()}>
              {saving ? "Saving..." : "Add"}
            </button>
            <button style={btnOutline} onClick={() => { setShowAddForm(false); setNewQuestion(''); setNewAnswer(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {faqItems.length === 0 && !showAddForm && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <i className="fas fa-question-circle" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>No FAQ items yet. Click "Add Question" to get started.</p>
        </div>
      )}

      {faqItems.map((item, index) => (
        <div key={item.id} style={cardStyle}>
          {editingId === item.id ? (
            <>
              <input
                type="text"
                value={editQuestion}
                onChange={e => setEditQuestion(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
                autoFocus
              />
              <textarea
                value={editAnswer}
                onChange={e => setEditAnswer(e.target.value)}
                style={textareaStyle}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={btnPrimary} onClick={handleSaveEdit} disabled={saving || !editQuestion.trim() || !editAnswer.trim()}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button style={btnOutline} onClick={handleCancelEdit}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontSize: 15 }}>
                    <span style={{ color: '#94a3b8', marginInlineEnd: 8 }}>{`Q${index + 1}.`}</span>
                    {item.question}
                  </p>
                  <p style={{ color: '#475569', fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.answer}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{ ...btnOutline, padding: '4px 8px', fontSize: 12, opacity: index === 0 ? 0.4 : 1 }}
                    title="Move up"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === faqItems.length - 1}
                    style={{ ...btnOutline, padding: '4px 8px', fontSize: 12, opacity: index === faqItems.length - 1 ? 0.4 : 1 }}
                    title="Move down"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <button style={{ ...btnOutline, fontSize: 13, padding: '6px 14px' }} onClick={() => handleStartEdit(item)}>
                  <i className="fas fa-edit" style={{ marginInlineEnd: 4 }}></i> Edit
                </button>
                <button style={btnDanger} onClick={() => handleDeleteItem(item.id)}>
                  <i className="fas fa-trash" style={{ marginInlineEnd: 4 }}></i> Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <FaqAppearancePanel
        isModern={isModern}
        style={activeStyle}
        defaults={styleDefaults}
        updateField={updateStyleField}
        resetGroup={resetStyleGroup}
      />

      {styleStatus && (
        <div style={{
          background: styleStatus === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${styleStatus === 'success' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '12px 16px',
          color: styleStatus === 'success' ? '#166534' : '#dc2626',
          marginTop: 12, fontSize: 14,
        }}>
          {styleStatus === 'success' ? "FAQ appearance saved successfully!" : styleStatus.replace('error:', '')}
        </div>
      )}

      <SaveBar saving={styleSaving} hasChanges={styleDirty.hasChanges} onSave={saveStyle} />
    </div>
  );
}

// Color/font controls for the active template (Classic or Modern). Each
// group has a "Reset to default" link that clears only that group's keys
// — the inactive template's saved values stay untouched (they live in the
// other state object in the parent).
function FaqAppearancePanel({ isModern, style, defaults, updateField, resetGroup }) {
  const templateLabel = isModern ? 'Modern' : 'Classic';

  const groups = [
    {
      title: 'Page',
      keys: ['pageBg'],
      fields: [
        { kind: 'color', key: 'pageBg', label: 'Page Background' },
      ],
    },
    {
      title: 'Heading',
      keys: ['headingFont', 'headingSize', 'headingWeight', 'headingColor', 'subtitleColor'],
      fields: [
        { kind: 'font', key: 'headingFont', label: 'Heading Font' },
        { kind: 'text', key: 'headingSize', label: 'Heading Size' },
        { kind: 'select', key: 'headingWeight', label: 'Heading Weight', options: ['400', '500', '600', '700', '800'] },
        { kind: 'color', key: 'headingColor', label: 'Heading Color' },
        { kind: 'color', key: 'subtitleColor', label: 'Subtitle Color' },
      ],
    },
    {
      title: 'Question',
      keys: ['questionFont', 'questionSize', 'questionWeight', 'questionColor'],
      fields: [
        { kind: 'font', key: 'questionFont', label: 'Question Font' },
        { kind: 'text', key: 'questionSize', label: 'Question Size' },
        { kind: 'select', key: 'questionWeight', label: 'Question Weight', options: ['400', '500', '600', '700', '800'] },
        { kind: 'color', key: 'questionColor', label: 'Question Color' },
      ],
    },
    {
      title: 'Answer',
      keys: ['answerFont', 'answerSize', 'answerColor'],
      fields: [
        { kind: 'font', key: 'answerFont', label: 'Answer Font' },
        { kind: 'text', key: 'answerSize', label: 'Answer Size' },
        { kind: 'color', key: 'answerColor', label: 'Answer Color' },
      ],
    },
    isModern
      ? {
          title: 'Cards',
          keys: ['cardBg', 'cardBorderColor'],
          fields: [
            { kind: 'color', key: 'cardBg', label: 'Card Background' },
            { kind: 'color', key: 'cardBorderColor', label: 'Card Border Color' },
          ],
        }
      : {
          title: 'Divider',
          keys: ['dividerColor'],
          fields: [
            { kind: 'color', key: 'dividerColor', label: 'Accordion Divider Color' },
          ],
        },
    {
      title: 'Accent',
      keys: ['accentColor'],
      fields: [
        { kind: 'color', key: 'accentColor', label: isModern ? 'Hover / Active Accent' : 'Open Indicator Accent' },
      ],
    },
  ];

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '20px 24px', marginTop: 24, marginBottom: 12,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Appearance — {templateLabel} template
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          Customize colors and fonts for your FAQ page. These settings apply only to the{' '}
          <strong>{templateLabel}</strong> template — the other template's saved styling is preserved.
          Switch templates in your theme to edit the other set.
        </p>
      </div>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {group.title}
            </h4>
            {group.keys.some(k => style[k]) && (
              <button
                type="button"
                onClick={() => resetGroup(group.keys)}
                style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 12, color: '#475569', textDecoration: 'underline',
                }}
              >
                Reset to default
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.fields.map(f => {
              if (f.kind === 'color') {
                return (
                  <AdminColorField
                    key={f.key}
                    label={f.label}
                    value={style[f.key] || ''}
                    fallback={defaults[f.key]}
                    onChange={(v) => updateField(f.key, v)}
                  />
                );
              }
              if (f.kind === 'font') {
                return (
                  <AdminFontPicker
                    key={f.key}
                    label={f.label}
                    value={style[f.key] || ''}
                    onChange={(v) => updateField(f.key, v)}
                  />
                );
              }
              if (f.kind === 'select') {
                return (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{f.label}</label>
                    <select
                      value={style[f.key] || ''}
                      onChange={e => updateField(f.key, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff',
                      }}
                    >
                      <option value="">{`Default · ${defaults[f.key]}`}</option>
                      {f.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              // text
              return (
                <div key={f.key}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{f.label}</label>
                  <input
                    type="text"
                    value={style[f.key] || ''}
                    onChange={e => updateField(f.key, e.target.value)}
                    placeholder={`Default · ${defaults[f.key]}`}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
