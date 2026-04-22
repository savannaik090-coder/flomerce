import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import * as productService from '../../services/productService.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveSearchHistory(query) {
  const history = getSearchHistory().filter((q) => q !== query);
  history.unshift(query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(query, text) {
  if (!query || !text) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 100;
  if (t.startsWith(q)) return 90;
  const dist = levenshtein(q, t.substring(0, q.length + 2));
  const maxLen = Math.max(q.length, t.length);
  const similarity = ((maxLen - dist) / maxLen) * 100;
  return similarity > 50 ? similarity : 0;
}

export default function SearchOverlay({ isOpen, onClose }) {
  const { t } = useTranslation('storefront');
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount } = useCurrency();
  const { isModern } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(getSearchHistory());
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!siteConfig?.id) return;
    productService.getProducts(siteConfig.id, { limit: 500 })
      .then((res) => setAllProducts(res.data || res.products || []))
      .catch(console.error);
  }, [siteConfig?.id]);

  const searchProducts = useCallback((searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const scored = allProducts.map((p) => {
      let score = 0;
      score += fuzzyMatch(searchQuery, p.name) * 3;
      score += fuzzyMatch(searchQuery, p.description) * 1;
      score += fuzzyMatch(searchQuery, p.category_name || '') * 2;
      if (p.price && searchQuery.match(/^\d+$/)) {
        const priceDiff = Math.abs(p.price - parseInt(searchQuery));
        if (priceDiff < 1000) score += 50;
      }
      return { ...p, score };
    }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score);

    setResults(scored.slice(0, 20));
  }, [allProducts]);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchProducts]);

  function handleProductClick(product) {
    if (query) saveSearchHistory(query);
    setHistory(getSearchHistory());
    onClose();
    navigate(`/product/${product.id}`);
  }

  function handleHistoryClick(q) {
    setQuery(q);
  }

  if (!isOpen) return null;

  return (
    <div className={`search-overlay active${isModern ? ' modern-theme' : ''}`}>
      <div className="search-container">
        <div className="search-header">
          <div className="search-input-container">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={t('search.placeholder', 'Search products...')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            />
            <i className="fas fa-search search-input-icon"></i>
          </div>
          <button className="search-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="search-content">
          {query.length >= 2 && (
            <div className="search-results-header">
              <span className="search-results-count">{t('search.resultsCount', { count: results.length, defaultValue: '{{count}} results found' })}</span>
              {query && (
                <button className="search-clear-btn" onClick={() => setQuery('')}>{t('search.clear', 'Clear')}</button>
              )}
            </div>
          )}

          {results.length > 0 ? (
            <div className="search-results-grid">
              {results.map((product) => (
                <div key={product.id} className="search-product-item" onClick={() => handleProductClick(product)}>
                  <div className="search-product-image">
                    <img
                      src={resolveImageUrl(product.images?.[0] || product.image_url || '')}
                      alt={product.name}
                      onError={(e) => { e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23f0f0f0" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14">${encodeURIComponent(t('search.noImage', 'No Image'))}</text></svg>`; }}
                    />
                  </div>
                  <div className="search-product-details">
                    <div className="search-product-name">{product.name}</div>
                    <div className="search-product-price">{formatAmount(product.price)}</div>
                    {product.category_name && (
                      <div className="search-product-category">{product.category_name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="search-no-results">
              <h3>{t('search.noResultsTitle', 'No products found')}</h3>
              <p>{t('search.noResultsHint', 'Try a different search term')}</p>
            </div>
          ) : null}

          {!query && history.length > 0 && (
            <div className="search-recent-section">
              <div className="search-recent-title">{t('search.recentSearches', 'Recent Searches')}</div>
              <div className="search-recent-items">
                {history.map((item, idx) => (
                  <div key={idx} className="search-recent-item" onClick={() => handleHistoryClick(item)}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
