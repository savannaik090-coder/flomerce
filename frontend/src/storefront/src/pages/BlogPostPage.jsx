import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { SiteContext } from '../context/SiteContext.jsx';
import { useSEO } from '../hooks/useSEO.js';
import { apiRequest } from '../services/api.js';
import '../styles/blog.css';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { siteConfig } = useContext(SiteContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSEO({
    title: post?.meta_title || post?.title || 'Blog Post',
    description: post?.meta_description || post?.excerpt || '',
    pageType: 'article',
  });

  useEffect(() => {
    if (siteConfig?.id && slug) fetchPost();
  }, [siteConfig?.id, slug]);

  async function fetchPost() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/blog/post/${slug}?siteId=${siteConfig.id}`);
      setPost(data);
    } catch (e) {
      setError('Blog post not found');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="blog-post-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ color: '#64748b' }}>Loading...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-post-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>Post Not Found</h2>
        <p style={{ color: '#64748b', marginTop: 12 }}>The blog post you're looking for doesn't exist.</p>
        <Link to="/blog" style={{ display: 'inline-block', marginTop: 20, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: post.author ? { '@type': 'Person', name: post.author } : undefined,
    image: post.cover_image || undefined,
  };

  return (
    <div className="blog-post-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />

      <Link to="/blog" className="blog-post-back">
        <i className="fas fa-arrow-left"></i> Back to Blog
      </Link>

      {post.cover_image && (
        <img src={post.cover_image} alt={post.title} className="blog-post-cover" />
      )}

      <p className="blog-post-meta">
        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
        {post.author ? ` · ${post.author}` : ''}
      </p>

      <h1 className="blog-post-title">{post.title}</h1>

      <div
        className="blog-post-content"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ADD_TAGS: ['iframe'], ADD_ATTR: ['target', 'allowfullscreen', 'frameborder'] }) }}
      />
    </div>
  );
}
