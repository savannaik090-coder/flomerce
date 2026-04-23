import React, { useState, useEffect, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useConfirm } from '../../../../shared/ui/ConfirmDialog.jsx';

let ReactQuill = null;
let quillCssLoaded = false;

export default function BlogSection() {
  const { t } = useTranslation('admin');
  const { siteConfig, refetchSite } = useContext(SiteContext);
  const confirm = useConfirm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [showBlog, setShowBlog] = useState(true);
  const [blogInNavbar, setBlogInNavbar] = useState(false);
  const [quillLoaded, setQuillLoaded] = useState(false);

  useEffect(() => {
    if (siteConfig) {
      let settings = siteConfig.settings || {};
      if (typeof settings === 'string') {
        try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
      }
      setShowBlog(settings.showBlog !== false);
      setBlogInNavbar(settings.blogInNavbar === true);
    }
  }, [siteConfig]);

  useEffect(() => {
    if (siteConfig?.id) fetchPosts();
  }, [siteConfig?.id]);

  useEffect(() => {
    if ((creating || editing) && !quillLoaded) {
      Promise.all([
        import('react-quill-new'),
        quillCssLoaded ? Promise.resolve() : import('react-quill-new/dist/quill.snow.css').catch(() => {
          if (!document.querySelector('link[href*="quill.snow"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/react-quill-new@3/dist/quill.snow.css';
            document.head.appendChild(link);
          }
        }),
      ]).then(([mod]) => {
        ReactQuill = mod.default;
        quillCssLoaded = true;
        setQuillLoaded(true);
      });
    }
  }, [creating, editing]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/blog/admin?siteId=${siteConfig.id}`);
      setPosts(data.data || data || []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveToggle(field, value) {
    try {
      await apiRequest(`/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        body: JSON.stringify({ settings: { [field]: value } }),
      });
      await refetchSite();
    } catch (e) {
      console.error('Failed to save toggle:', e);
    }
  }

  function handleToggleShowBlog(val) {
    setShowBlog(val);
    saveToggle('showBlog', val);
  }

  function handleToggleBlogInNavbar(val) {
    setBlogInNavbar(val);
    saveToggle('blogInNavbar', val);
  }

  function showMsg(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }

  if (creating || editing) {
    return (
      <BlogPostEditor
        post={editing}
        siteConfig={siteConfig}
        quillLoaded={quillLoaded}
        onSave={() => { setCreating(false); setEditing(null); fetchPosts(); }}
        onCancel={() => { setCreating(false); setEditing(null); }}
        showMsg={showMsg}
        t={t}
      />
    );
  }

  const cardStyle = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '16px 20px', marginBottom: 12,
  };
  const btnPrimary = {
    padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };

  const failedKeyword = t('blogSection.failedKeyword');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('blogSection.title')}</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>{t('blogSection.intro')}</p>
        </div>
        {message && <span style={{ fontSize: 13, color: message.includes(failedKeyword) ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{message}</span>}
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <ToggleRow label={t('blogSection.showBlogLabel')} description={t('blogSection.showBlogDesc')} checked={showBlog} onChange={handleToggleShowBlog} />
        <ToggleRow label={t('blogSection.inNavbarLabel')} description={t('blogSection.inNavbarDesc')} checked={blogInNavbar} onChange={handleToggleBlogInNavbar} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>{t('blogSection.postsTitle', { count: posts.length })}</h3>
        <button style={btnPrimary} onClick={() => setCreating(true)}>
          <i className="fas fa-plus" style={{ marginInlineEnd: 6 }}></i> {t('blogSection.newPost')}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>{t('blogSection.loading')}</div>
      ) : posts.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <i className="fas fa-pen-fancy" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>{t('blogSection.empty')}</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            t={t}
            onEdit={async () => {
              try {
                const fullPost = await apiRequest(`/api/blog/admin/${post.id}?siteId=${siteConfig.id}`);
                setEditing(fullPost.data || fullPost);
              } catch (e) {
                showMsg(t('blogSection.loadFailed'));
              }
            }}
            onDelete={async () => {
              if (!(await confirm({ title: t('blogSection.deleteTitle'), message: t('blogSection.deleteMsg'), variant: 'danger', confirmText: t('blogSection.deleteConfirm') }))) return;
              try {
                await apiRequest(`/api/blog/admin/${post.id}?siteId=${siteConfig.id}`, { method: 'DELETE' });
                if (post.cover_image && siteConfig?.id) {
                  import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
                    deleteMediaFromR2(siteConfig.id, post.cover_image);
                  });
                }
                showMsg(t('blogSection.deleted'));
                fetchPosts();
              } catch (e) {
                showMsg(t('blogSection.deleteFailed'));
              }
            }}
          />
        ))
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 15 }}>{label}</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>{description}</p>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: checked ? '#2563eb' : '#cbd5e1', transition: 'background 0.2s',
        }}>
          <span style={{
            position: 'absolute', left: checked ? 22 : 2, top: 2, width: 20, height: 20,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </span>
      </label>
    </div>
  );
}

function PostCard({ post, onEdit, onDelete, t }) {
  const statusColor = post.status === 'published' ? '#16a34a' : '#f59e0b';
  const statusBg = post.status === 'published' ? '#f0fdf4' : '#fffbeb';
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 12, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {post.cover_image && (
        <img src={post.cover_image} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</h4>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: statusBg, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
            {post.status === 'published' ? t('blogSection.statusPublished') : t('blogSection.statusDraft')}
          </span>
        </div>
        {post.excerpt && <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.excerpt}</p>}
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {post.published_at ? new Date(post.published_at).toLocaleDateString() : t('blogSection.notPublished')}
          {post.author ? ` · ${post.author}` : ''}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <i className="fas fa-edit"></i>
        </button>
        <button onClick={onDelete} style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );
}

function BlogPostEditor({ post, siteConfig, quillLoaded, onSave, onCancel, showMsg, t }) {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [coverImage, setCoverImage] = useState(post?.cover_image || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [author, setAuthor] = useState(post?.author || '');
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const fileInputRef = useRef(null);
  const { markUploaded, markForDeletion, commit } = usePendingMedia(siteConfig?.id);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'link', 'image'],
      ['clean'],
    ],
  };

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const oldImage = coverImage;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const adminToken = sessionStorage.getItem('site_admin_token');
      const res = await fetch(`${API_BASE}/api/upload/image?siteId=${siteConfig.id}`, {
        method: 'POST',
        headers: { 'Authorization': `SiteAdmin ${adminToken}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const url = data.data?.urls?.[0] || data.data?.images?.[0]?.url || data.url;
        if (url) {
          setCoverImage(url);
          markUploaded(url);
          if (oldImage) markForDeletion(oldImage);
        } else {
          showMsg(t('blogSection.imageUploadFailed'));
        }
      } else {
        showMsg(data.message || t('blogSection.imageUploadFailed'));
      }
    } catch (err) {
      showMsg(t('blogSection.imageUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(saveStatus) {
    if (!title.trim()) { showMsg(t('blogSection.titleRequired')); return; }
    setSaving(true);
    try {
      const payload = {
        siteId: siteConfig.id,
        title: title.trim(),
        content,
        excerpt: excerpt.trim(),
        coverImage,
        status: saveStatus || status,
        author: author.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      };
      if (post?.id) {
        await apiRequest(`/api/blog/admin/${post.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showMsg(t('blogSection.updated'));
      } else {
        await apiRequest('/api/blog/admin', { method: 'POST', body: JSON.stringify(payload) });
        showMsg(t('blogSection.created'));
      }
      commit(coverImage ? [coverImage] : []);
      onSave();
    } catch (err) {
      showMsg(t('blogSection.saveFailed', { error: err.message || t('blogSection.unknownError') }));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {post ? t('blogSection.editorEdit') : t('blogSection.editorNew')}
        </h2>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          <i className="fas fa-arrow-left" style={{ marginInlineEnd: 6 }}></i> {t('blogSection.back')}
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.titleLabel')}</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('blogSection.titlePh')} style={{ ...inputStyle, marginBottom: 16 }} autoFocus />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.excerptLabel')}</label>
        <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder={t('blogSection.excerptPh')} rows={2} style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.authorLabel')}</label>
        <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder={t('blogSection.authorPh')} style={{ ...inputStyle, marginBottom: 16 }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.coverLabel')}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          {coverImage && (
            <div style={{ position: 'relative' }}>
              <img src={coverImage} alt={t('blogSection.coverLabel')} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => { if (coverImage) markForDeletion(coverImage); setCoverImage(''); }} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          <div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {uploading ? t('blogSection.uploading') : (coverImage ? t('blogSection.changeImage') : t('blogSection.uploadImage'))}
            </button>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.contentLabel')}</label>
        {quillLoaded && ReactQuill ? (
          <div style={{ marginBottom: 16 }}>
            <ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} style={{ background: '#fff', borderRadius: 8 }} />
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>{t('blogSection.loadingEditor')}</div>
        )}
      </div>

      <button onClick={() => setShowSeo(!showSeo)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 16, width: '100%', fontFamily: 'inherit', color: '#334155' }}>
        <i className="fas fa-search"></i> {t('blogSection.seoTitle')}
        <i className={`fas fa-chevron-${showSeo ? 'up' : 'down'}`} style={{ marginInlineStart: 'auto' }}></i>
      </button>
      {showSeo && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.metaTitleLabel')}</label>
          <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={t('blogSection.metaTitlePh')} style={{ ...inputStyle, marginBottom: 16 }} />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{t('blogSection.metaDescLabel')}</label>
          <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder={t('blogSection.metaDescPh')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 0' }}>
        <button onClick={() => handleSave('draft')} disabled={saving} style={{ padding: '10px 24px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? t('blogSection.saving') : t('blogSection.saveDraft')}
        </button>
        <button onClick={() => handleSave('published')} disabled={saving} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? t('blogSection.publishing') : t('blogSection.publish')}
        </button>
      </div>
    </div>
  );
}
