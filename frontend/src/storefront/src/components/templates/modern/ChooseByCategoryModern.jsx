import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { API_BASE } from '../../../config.js';
import { getDemoCategoriesDefaults } from '../../../defaults/index.js';
import './modern.css';

function resolveImg(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  if (src.startsWith('/api/')) return `${API_BASE}${src}`;
  return src;
}

export default function ChooseByCategoryModern({ categories }) {
  const { siteConfig } = useSiteConfig();
  const settings = siteConfig?.settings || {};
  const chooseConfig = settings.chooseByCategory || {};

  if (!chooseConfig.enabled) return null;

  const catMap = chooseConfig.categories || {};
  const visibleCats = (categories || []).filter(cat => {
    const conf = catMap[cat.id];
    return conf && conf.visible && conf.browseImage;
  });

  const isDemo = visibleCats.length === 0;
  const renderCats = isDemo
    ? getDemoCategoriesDefaults(siteConfig?.category).map(c => ({ ...c, _conf: { browseImage: c.browseImage } }))
    : visibleCats.map(cat => ({ ...cat, _conf: catMap[cat.id] }));

  return (
    <section className="mn-choose-section">
      <div className="mn-choose-header">
        <span className="mn-choose-label">Collections</span>
        <h2 className="mn-section-title">Shop by Category</h2>
      </div>
      <div className="mn-choose-grid">
        {renderCats.map((cat, index) => {
          const conf = cat._conf;
          const isWide = index === 0 || (renderCats.length >= 4 && index === 3);
          const linkTo = (isDemo || cat._isDemo) ? '/' : `/category/${cat.slug}`;
          return (
            <Link
              key={cat.id}
              to={linkTo}
              className={`mn-choose-card ${isWide ? 'mn-choose-card--wide' : ''}`}
            >
              <div className="mn-choose-img-wrap">
                <img
                  src={resolveImg(conf.browseImage)}
                  alt={cat.name}
                  loading="lazy"
                  className="mn-choose-img"
                />
              </div>
              <div className="mn-choose-info">
                <h3 className="mn-choose-name">{cat.name}</h3>
                <span className="mn-choose-explore">
                  Explore
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
