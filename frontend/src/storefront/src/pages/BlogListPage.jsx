import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import { apiRequest } from '../services/api.js';
import { resolveBlogStyle, buildBlogStyleVars } from '../utils/blogStyle.js';
import '../styles/blog.css';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

export default function BlogListPage() {
  const { translate: tx, target, contentLanguage } = useShopperTranslation();
  const dateLocale = target || contentLanguage || 'en-US';
  const { siteConfig } = useContext(SiteContext);
  const { isModern } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useSEO({ title: tx("Blog"), pageType: 'blog' });

  let settings = siteConfig?.settings || {};
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  const showBlog = settings.showBlog !== false;
  const brandName = siteConfig?.brandName || siteConfig?.brand_name || "Our Store";
  const styleVars = buildBlogStyleVars(resolveBlogStyle(settings.blogPage, isModern), isModern);

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
        <h2><TranslatedText text="This page is currently unavailable" /></h2>
        <p style={{ color: '#64748b', marginTop: 12 }}><TranslatedText text="Please check back later." /></p>
      </div>
    );
  }

  return (
    <div className="blog-list-page" style={styleVars}>
      <div className="blog-header">
        <h1><TranslatedText text="Blog" /></h1>
        <p><TranslatedText text="Latest stories and updates from" /> {brandName}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}><TranslatedText text="Loading..." /></div>
      ) : posts.length === 0 ? (
        <div className="blog-empty">
          <i className="fas fa-pen-fancy"></i>
          <p><TranslatedText text="No blog posts yet. Check back soon!" /></p>
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
                    {post.published_at ? new Date(post.published_at).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                    {post.author ? ` · ${post.author}` : ''}
                  </p>
                  <h3 className="blog-card-title">{post.title}</h3>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <span className="blog-card-read-more"><TranslatedText text="Read more →" /></span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="blog-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left"></i> <TranslatedText text="Previous" />
              </button>
              <span><TranslatedText text="Page" /> {page} <TranslatedText text="of" /> {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <TranslatedText text="Next" /> <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
