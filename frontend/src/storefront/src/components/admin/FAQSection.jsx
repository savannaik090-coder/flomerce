import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';

export default function FAQSection() {
  const { siteConfig, refetchSite } = useContext(SiteContext);
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

  useEffect(() => {
    if (siteConfig) {
      let settings = siteConfig.settings || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      setFaqItems(settings.faq || []);
      setShowFaq(settings.showFaq !== false);
      setFaqInNavbar(settings.faqInNavbar === true);
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
      setMessage('FAQ saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>FAQ Management</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Add frequently asked questions for your customers.</p>
        </div>
        {message && (
          <span style={{ fontSize: 13, color: message.includes('Failed') ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{message}</span>
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
          Questions ({faqItems.length})
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
              {saving ? 'Saving...' : 'Add'}
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
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button style={btnOutline} onClick={handleCancelEdit}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontSize: 15 }}>
                    <span style={{ color: '#94a3b8', marginInlineEnd: 8 }}>Q{index + 1}.</span>
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
    </div>
  );
}
