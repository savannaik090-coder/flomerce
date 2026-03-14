import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

export default function CategoryCircles() {
  const { siteConfig } = useSiteConfig();
  const categories = siteConfig?.categories || [];

  if (!categories.length) return null;

  return (
    <section className="category-circles-section">
      <div className="category-circles-container">
        <div className="category-circles-wrapper">
          {categories.map((cat) => {
            const name = typeof cat === 'string' ? cat : cat.name || '';
            const slug =
              typeof cat === 'string'
                ? cat.toLowerCase().replace(/\s+/g, '-')
                : cat.slug || name.toLowerCase().replace(/\s+/g, '-');
            const imageUrl =
              typeof cat === 'object' && cat.image_url
                ? cat.image_url
                : '';

            return (
              <Link
                key={slug}
                to={`/category/${slug}`}
                className="category-circle-item"
              >
                <div className="circle-image" style={{
                  width: '95px',
                  height: '95px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{
                      fontSize: '28px',
                      color: '#999',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="circle-name" style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#333',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  maxWidth: '90px',
                }}>
                  {name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
