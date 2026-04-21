import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { apiRequest } from '../../services/api.js';
import { API_BASE } from '../../config.js';
import { usePendingMedia } from '../../hooks/usePendingMedia.js';
import { useConfirm } from '../../../../shared/ui/ConfirmDialog.jsx';

let ReactQuill = null;
let quillCssLoaded = false;

export default function BlogSection() {
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Blog Management</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Create and manage blog posts for your store.</p>
        </div>
        {message && <span style={{ fontSize: 13, color: message.includes('Failed') ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{message}</span>}
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <ToggleRow label="Show Blog" description="Enable the blog on your storefront" checked={showBlog} onChange={handleToggleShowBlog} />
        <ToggleRow label="Show in Navbar" description="Add a Blog link in the storefront navigation bar" checked={blogInNavbar} onChange={handleToggleBlogInNavbar} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>Posts ({posts.length})</h3>
        <button style={btnPrimary} onClick={() => setCreating(true)}>
          <i className="fas fa-plus" style={{ marginRight: 6 }}></i> New Post
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading posts...</div>
      ) : posts.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <i className="fas fa-pen-fancy" style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>No blog posts yet. Click "New Post" to get started.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={async () => {
              try {
                const fullPost = await apiRequest(`/api/blog/admin/${post.id}?siteId=${siteConfig.id}`);
                setEditing(fullPost.data || fullPost);
              } catch (e) {
                showMsg('Failed to load post. Please try again.');
              }
            }}
            onDelete={async () => {
              if (!(await confirm({ title: 'Delete blog post?', message: 'This cannot be undone.', variant: 'danger', confirmText: 'Delete' }))) return;
              try {
                await apiRequest(`/api/blog/admin/${post.id}?siteId=${siteConfig.id}`, { method: 'DELETE' });
                if (post.cover_image && siteConfig?.id) {
                  import('../../services/api.js').then(({ deleteMediaFromR2 }) => {
                    deleteMediaFromR2(siteConfig.id, post.cover_image);
                  });
                }
                showMsg('Post deleted');
                fetchPosts();
              } catch (e) {
                showMsg('Failed to delete post');
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

function PostCard({ post, onEdit, onDelete }) {
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
            {post.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
        {post.excerpt && <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.excerpt}</p>}
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Not published'}
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

function BlogPostEditor({ post, siteConfig, quillLoaded, onSave, onCancel, showMsg }) {
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
          showMsg('Failed to upload image');
        }
      } else {
        showMsg(data.message || 'Failed to upload image');
      }
    } catch (err) {
      showMsg('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(saveStatus) {
    if (!title.trim()) { showMsg('Title is required'); return; }
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
        showMsg('Post updated');
      } else {
        await apiRequest('/api/blog/admin', { method: 'POST', body: JSON.stringify(payload) });
        showMsg('Post created');
      }
      // Only after the post PUT/POST succeeds do we clean up any replaced or
      // removed cover image from R2. The final coverImage is the kept URL.
      commit(coverImage ? [coverImage] : []);
      onSave();
    } catch (err) {
      showMsg('Failed to save: ' + (err.message || 'Unknown error'));
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
          {post ? 'Edit Post' : 'New Post'}
        </h2>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i> Back
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Blog post title..." style={{ ...inputStyle, marginBottom: 16 }} autoFocus />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Excerpt</label>
        <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief summary for the blog listing..." rows={2} style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Author</label>
        <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" style={{ ...inputStyle, marginBottom: 16 }} />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Cover Image</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          {coverImage && (
            <div style={{ position: 'relative' }}>
              <img src={coverImage} alt="Cover" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
              <button onClick={() => { if (coverImage) markForDeletion(coverImage); setCoverImage(''); }} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          <div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {uploading ? 'Uploading...' : (coverImage ? 'Change Image' : 'Upload Image')}
            </button>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Content</label>
        {quillLoaded && ReactQuill ? (
          <div style={{ marginBottom: 16 }}>
            <ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} style={{ background: '#fff', borderRadius: 8 }} />
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>Loading editor...</div>
        )}
      </div>

      <button onClick={() => setShowSeo(!showSeo)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 16, width: '100%', fontFamily: 'inherit', color: '#334155' }}>
        <i className="fas fa-search"></i> SEO Settings
        <i className={`fas fa-chevron-${showSeo ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }}></i>
      </button>
      {showSeo && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Meta Title</label>
          <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="SEO title (defaults to post title)" style={{ ...inputStyle, marginBottom: 16 }} />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Meta Description</label>
          <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="SEO description (defaults to excerpt)" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 0' }}>
        <button onClick={() => handleSave('draft')} disabled={saving} style={{ padding: '10px 24px', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button onClick={() => handleSave('published')} disabled={saving} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
