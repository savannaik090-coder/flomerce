import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../context/SiteContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import { apiRequest } from '../services/api.js';
import '../styles/blog.css';

export default function BlogListPage() {
  const { t } = useTranslation('storefront');
  const { siteConfig } = useContext(SiteContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useSEO({ title: t('blog.seoTitle', 'Blog'), pageType: 'blog' });

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const showBlog = settings.showBlog !== false;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || t('blog.defaultBrand', 'Our Store');

  useEffect(() => {
    if (siteConfig?.id && showBlog) fetchPosts();
  }, [siteConfig?.id, page, showBlog]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/blog/posts?siteId=${siteConfig.id}&page=${page}&limit=12`);
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  if (!showBlog) {
    return (
      <div className="blog-list-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>{t('blog.unavailableTitle', 'This page is currently unavailable')}</h2>
        <p style={{ color: '#64748b', marginTop: 12 }}>{t('blog.unavailableMessage', 'Please check back later.')}</p>
      </div>
    );
  }

  return (
    <div className="blog-list-page">
      <div className="blog-header">
        <h1>{t('blog.title', 'Blog')}</h1>
        <p>{t('blog.subtitle', 'Latest stories and updates from {{brandName}}', { brandName })}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>{t('blog.loading', 'Loading...')}</div>
      ) : posts.length === 0 ? (
        <div className="blog-empty">
          <i className="fas fa-pen-fancy"></i>
          <p>{t('blog.empty', 'No blog posts yet. Check back soon!')}</p>
        </div>
      ) : (
        <>
          <div className="blog-grid">
            {posts.map(post => (
              <Link to={`/blog/${post.slug}`} className="blog-card" key={post.id}>
                {post.cover_image ? (
                  <img src={post.cover_image} alt={post.title} className="blog-card-image" />
                ) : (
                  <div className="blog-card-placeholder">
                    <i className="fas fa-pen-fancy"></i>
                  </div>
                )}
                <div className="blog-card-body">
                  <p className="blog-card-meta">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                    {post.author ? ` · ${post.author}` : ''}
                  </p>
                  <h3 className="blog-card-title">{post.title}</h3>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <span className="blog-card-read-more">{t('blog.readMore', 'Read more →')}</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="blog-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left"></i> {t('blog.previous', 'Previous')}
              </button>
              <span>{t('blog.pageOf', 'Page {{page}} of {{totalPages}}', { page, totalPages })}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                {t('blog.next', 'Next')} <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
