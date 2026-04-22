import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getProducts } from '../../services/productService.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';
import { API_BASE } from '../../config.js';

export default function TrendingNowEditor({ onSaved, onPreviewUpdate, sectionVisible = true, onToggleVisibility }) {
  const { siteConfig } = useContext(SiteContext);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);
  const serverValuesRef = useRef(null);

  useEffect(() => {
    if (siteConfig?.id) {
      // Use allSettled so a failure in one fetch doesn't swallow the other.
      // Each loader handles its own success/failure (loadSettings only sets
      // the baseline on success — see below — preventing accidental overwrite
      // of real saved IDs with an empty array if the fetch fails).
      Promise.allSettled([loadSettings(), loadProducts()]);
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const current = JSON.stringify({ selectedProductIds });
    setHasChanges(current !== serverValuesRef.current);
    if (onPreviewUpdate) onPreviewUpdate({ trendingProductIds: selectedProductIds });
  }, [selectedProductIds]);

  async function loadProducts() {
    try {
      const res = await getProducts(siteConfig.id, { limit: 500 });
      setAllProducts(res.data || res.products || []);
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        const idsVal = settings.trendingProductIds || [];
        setSelectedProductIds(idsVal);
        serverValuesRef.current = JSON.stringify({ selectedProductIds: idsVal });
        // Only flip the change-detection gate after a successful baseline.
        // If load fails, hasChanges stays false → save button stays disabled,
        // so a flaky request can't cause us to overwrite real data with [].
        setTimeout(() => { hasLoadedRef.current = true; }, 0);
      } else {
        setStatus('error:Failed to load trending products. Please refresh the page.');
      }
    } catch (e) {
      console.error('Failed to load trending now settings:', e);
      setStatus('error:Failed to load trending products. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(productId) {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 12) return prev;
      return [...prev, productId];
    });
  }

  function removeProduct(productId) {
    setSelectedProductIds(prev => prev.filter(id => id !== productId));
  }

  function moveProduct(index, direction) {
    setSelectedProductIds(prev => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({
          settings: { trendingProductIds: selectedProductIds }
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        serverValuesRef.current = JSON.stringify({ selectedProductIds });
        setHasChanges(false);
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const selectedProducts = selectedProductIds
    .map(id => allProducts.find(p => p.id === id))
    .filter(Boolean);

  const filteredProducts = allProducts.filter(p => {
    if (selectedProductIds.includes(p.id)) return false;
    if (!searchQuery.trim()) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={sectionVisible}
          onChange={() => onToggleVisibility?.()}
          label="Show Trending Now"
          description="Display a horizontal scrollable row of selected products"
        />

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Selected Products ({selectedProducts.length}/12)</h3>
          </div>
          <div className="card-content">
            {selectedProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8' }}>
                <i className="fas fa-hand-pointer" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                <p style={{ fontSize: 13, margin: 0 }}>No products selected yet. Add products from below.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', background: '#f8fafc',
                      border: '1px solid #e2e8f0', borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, width: 20, textAlign: 'center' }}>
                      {index + 1}
                    </span>
                    <img
                      src={resolveImageUrl(product.images?.[0] || product.image_url || '')}
                      alt={product.name}
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, background: '#eee' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => moveProduct(index, -1)}
                        disabled={index === 0}
                        style={{
                          background: 'none', border: '1px solid #e2e8f0', borderRadius: 4,
                          padding: '4px 6px', cursor: index === 0 ? 'default' : 'pointer',
                          opacity: index === 0 ? 0.3 : 1, fontSize: 11, color: '#64748b',
                        }}
                      >
                        <i className="fas fa-chevron-up" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(index, 1)}
                        disabled={index === selectedProducts.length - 1}
                        style={{
                          background: 'none', border: '1px solid #e2e8f0', borderRadius: 4,
                          padding: '4px 6px', cursor: index === selectedProducts.length - 1 ? 'default' : 'pointer',
                          opacity: index === selectedProducts.length - 1 ? 0.3 : 1, fontSize: 11, color: '#64748b',
                        }}
                      >
                        <i className="fas fa-chevron-down" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        style={{
                          background: 'none', border: '1px solid #fecaca', borderRadius: 4,
                          padding: '4px 6px', cursor: 'pointer', fontSize: 11, color: '#dc2626',
                        }}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Add Products</h3>
          </div>
          <div className="card-content">
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  border: '1px solid #e2e8f0', borderRadius: 6,
                  fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 16px', color: '#94a3b8', fontSize: 13 }}>
                  {allProducts.length === 0 ? 'No products in your store yet' : 'No matching products found'}
                </div>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    disabled={selectedProductIds.length >= 12}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 12px',
                      border: 'none', borderBottom: '1px solid #f1f5f9',
                      background: '#fff', cursor: selectedProductIds.length >= 12 ? 'default' : 'pointer',
                      textAlign: 'start', fontFamily: 'inherit',
                      opacity: selectedProductIds.length >= 12 ? 0.5 : 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (selectedProductIds.length < 12) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <img
                      src={resolveImageUrl(product.images?.[0] || product.image_url || '')}
                      alt={product.name}
                      style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, background: '#eee' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.name}
                      </div>
                    </div>
                    <i className="fas fa-plus" style={{ fontSize: 12, color: '#2563eb' }} />
                  </button>
                ))
              )}
            </div>
            {selectedProductIds.length >= 12 && (
              <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>Maximum 12 products reached</p>
            )}
          </div>
        </div>

        {status && (
          <div style={{
            background: status === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 8, padding: '12px 16px',
            color: status === 'success' ? '#166534' : '#dc2626',
            marginBottom: 16, fontSize: 14,
          }}>
            {status === 'success' ? 'Trending Now section saved successfully!' : status.replace('error:', '')}
          </div>
        )}

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
