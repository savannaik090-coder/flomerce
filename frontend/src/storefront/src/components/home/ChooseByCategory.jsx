import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import '../../styles/choose-by-category.css';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

export default function ChooseByCategory({ categories }) {
  const { siteConfig } = useSiteConfig();

  const settings = siteConfig?.settings || {};
  const chooseConfig = settings.chooseByCategory || {};

  if (!chooseConfig.enabled) return null;

  const catMap = chooseConfig.categories || {};
  const visibleCats = (categories || []).filter(cat => {
    const conf = catMap[cat.id];
    return conf && conf.visible && conf.browseImage;
  });

  if (visibleCats.length === 0) return null;

  return (
    <section className="choose-by-category">
      <div className="choose-by-category-container">
        <div className="choose-by-category-header">
          <h2 className="choose-by-category-title">Choose by Category</h2>
        </div>
        <div className="choose-by-category-grid">
          {visibleCats.map((cat) => {
            const conf = catMap[cat.id];
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="choose-by-category-card"
              >
                <div className="choose-by-category-img-wrapper">
                  <img
                    src={resolveImg(conf.browseImage)}
                    alt={cat.name}
                    loading="lazy"
                  />
                  <div className="choose-by-category-overlay" />
                </div>
                <div className="choose-by-category-label">
                  <span className="choose-by-category-label-text">{cat.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
