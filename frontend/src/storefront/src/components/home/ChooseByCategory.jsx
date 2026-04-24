import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import '../../styles/choose-by-category.css';
import { API_BASE } from '../../config.js';
import { getDemoCategoriesDefaults } from '../../defaults/index.js';
import TranslatedText from '../TranslatedText.jsx';

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

  const isDemo = visibleCats.length === 0;
  const renderCats = isDemo
    ? getDemoCategoriesDefaults(siteConfig?.category).map(c => ({ ...c, _conf: { browseImage: c.browseImage } }))
    : visibleCats.map(cat => ({ ...cat, _conf: catMap[cat.id] }));

  return (
    <section className="choose-by-category">
      <div className="choose-by-category-container">
        <div className="choose-by-category-header">
          <h2 className="choose-by-category-title"><TranslatedText text="Choose by Category" /></h2>
          <hr className="choose-by-category-divider" />
        </div>
        <div className="choose-by-category-grid">
          {renderCats.map((cat) => {
            const conf = cat._conf;
            const linkTo = (isDemo || cat._isDemo) ? '/' : `/category/${cat.slug}`;
            return (
              <Link
                key={cat.id}
                to={linkTo}
                className="choose-by-category-card"
              >
                <div className="choose-by-category-img-wrapper">
                  {conf.browseImage ? (
                    <img
                      src={resolveImg(conf.browseImage)}
                      alt={cat.name}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  )}
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
