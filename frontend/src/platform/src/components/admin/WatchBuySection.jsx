import { useState, useEffect } from 'react';

export default function WatchBuySection({ site }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', productSku: '', videoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(false);
    setVideos([]);
  }, [site?.id]);

  function openAdd() {
    setEditingVideo(null);
    setForm({ title: '', description: '', productSku: '', videoUrl: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(video) {
    setEditingVideo(video);
    setForm({ title: video.title, description: video.description || '', productSku: video.productSku || '', videoUrl: video.videoUrl || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 600));
      if (editingVideo) {
        setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, ...form } : v));
      } else {
        setVideos(prev => [...prev, { id: Date.now().toString(), ...form, createdAt: new Date().toISOString() }]);
      }
      setShowModal(false);
    } catch (err) {
      setError('Failed to save video: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(videoId) {
    if (!window.confirm('Delete this video?')) return;
    setVideos(prev => prev.filter(v => v.id !== videoId));
  }

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Watch & Buy Videos</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="sa-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <h3>No Videos Yet</h3>
          <p>Upload shoppable videos that link to your products.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add First Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {videos.map(video => (
            <div key={video.id} className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {video.videoUrl ? (
                  <video src={video.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{video.title}</h4>
                {video.description && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{video.description}</p>}
                {video.productSku && <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 12 }}>SKU: {video.productSku}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(video)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => handleDelete(video.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>{editingVideo ? 'Edit Video' : 'Upload Video'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title *</label>
                <input type="text" placeholder="Video title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Description</label>
                <textarea placeholder="Short description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Video URL</label>
                <input type="url" placeholder="https://... (MP4 or video URL)" value={form.videoUrl} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Linked Product SKU</label>
                <input type="text" placeholder="e.g., NKL-001" value={form.productSku} onChange={e => setForm(p => ({ ...p, productSku: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving...' : editingVideo ? 'Save Changes' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
