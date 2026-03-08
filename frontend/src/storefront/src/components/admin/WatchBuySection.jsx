import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function WatchBuySection() {
  const { siteConfig } = useContext(SiteContext);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', productSku: '', videoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVideos();
  }, [siteConfig?.id]);

  async function loadVideos() {
    setLoading(false);
    setVideos([]);
  }

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

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Watch & Buy Videos</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="fas fa-plus" style={{ marginRight: 8 }} />Upload Video
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-video" />
          <h3>No Videos Yet</h3>
          <p>Upload shoppable videos that link to your products. These appear in the Watch & Buy section on your homepage.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 16 }}>
            <i className="fas fa-plus" style={{ marginRight: 8 }} />Add First Video
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {videos.map(video => (
            <div key={video.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {video.videoUrl ? (
                  <video src={video.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                ) : (
                  <i className="fas fa-video" style={{ color: '#64748b', fontSize: 36 }} />
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{video.title}</h4>
                {video.description && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{video.description}</p>}
                {video.productSku && (
                  <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 12 }}>
                    <i className="fas fa-link" style={{ marginRight: 4 }} />SKU: {video.productSku}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(video)}>
                    <i className="fas fa-edit" style={{ marginRight: 4 }} />Edit
                  </button>
                  <button
                    style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => handleDelete(video.id)}
                  >
                    <i className="fas fa-trash" />
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
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times" />
              </button>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Title *</label>
                <input
                  type="text"
                  placeholder="Video title"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Description</label>
                <textarea
                  placeholder="Short description..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Video URL</label>
                <input
                  type="url"
                  placeholder="https://... (MP4 or video URL)"
                  value={form.videoUrl}
                  onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Link a video from your R2 storage or any public video URL (max 100MB recommended).</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Linked Product SKU</label>
                <input
                  type="text"
                  placeholder="e.g., NKL-001"
                  value={form.productSku}
                  onChange={e => setForm(p => ({ ...p, productSku: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Saving...</> : editingVideo ? 'Save Changes' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
