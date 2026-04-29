import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { PanelContext } from '../context/PanelContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { useSEO } from '../hooks/useSEO.js';
import { useCurrency } from '../hooks/useCurrency.js';
import { useTheme } from '../context/ThemeContext.jsx';
import * as productService from '../services/productService.js';
import ProductGallery from '../components/product/ProductGallery.jsx';
import RelatedProducts from '../components/product/RelatedProducts.jsx';
import ProductReviews from '../components/product/ProductReviews.jsx';
import ProductReviewsModern from '../components/templates/modern/ProductReviewsModern.jsx';
import TranslatedText from '../components/TranslatedText.jsx';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';
import '../styles/product-detail.css';

import { getPolicies } from '../defaults/index.js';

function PolicyAccordion({ title, icon, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`policy-accordion${open ? ' open' : ''}`}>
      <button
        type="button"
        className="policy-accordion-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="policy-accordion-title">
          <i className={`fas ${icon}`} />
          {title}
        </span>
        <i className={`fas fa-chevron-down policy-accordion-arrow${open ? ' rotated' : ''}`} />
      </button>
      <div className={`policy-accordion-body${open ? ' expanded' : ''}`}>
        <div className="policy-accordion-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function PolicyItem({ label, value }) {
  if (!value) return null;
  return (
    <div className="policy-item">
      <span className="policy-item-label">{label}</span>
      <span className="policy-item-value"><TranslatedText text={value} /></span>
    </div>
  );
}

export default function ProductDetailPage() {
  const { translate: tx } = useShopperTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { siteConfig } = useContext(SiteContext);
  const { openCart, openWishlist } = useContext(PanelContext);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatAmount } = useCurrency();
  const { isModern } = useTheme();
  const ActiveProductReviews = isModern ? ProductReviewsModern : ProductReviews;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedCustomOptions, setSelectedCustomOptions] = useState({});
  const [selectedPricedOptions, setSelectedPricedOptions] = useState({});
  const [lastSelectedPricedOption, setLastSelectedPricedOption] = useState(null);
  const [optionError, setOptionError] = useState(null);

  useEffect(() => {
    if (!id || !siteConfig?.id) return;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const result = await productService.getProductById(id, siteConfig?.id);
        const prod = result.data || result.product || result;
        if (!prod || !prod.id) {
          setError(tx("Product not found"));
          return;
        }

        if (prod.images && typeof prod.images === 'string') {
          try {
            prod.images = JSON.parse(prod.images);
          } catch {
            prod.images = prod.images ? [prod.images] : [];
          }
        }

        if (!prod.images || !Array.isArray(prod.images)) {
          prod.images = [];
        }

        if (prod.image_url && prod.images.length === 0) {
          prod.images = [prod.image_url];
        }
        if (prod.thumbnail_url && !prod.images.includes(prod.thumbnail_url)) {
          prod.images.unshift(prod.thumbnail_url);
        }

        setProduct(prod);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError(tx("Failed to load product"));
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, siteConfig?.id]);

  useSEO({
    title: product?.name,
    description: product?.short_description || product?.description,
    ogImage: product?.thumbnail_url,
    ogType: 'product',
    seoOverrides: product ? {
      seo_title: product.seo_title,
      seo_description: product.seo_description,
      seo_og_image: product.seo_og_image,
    } : null,
  });

  const productOptions = product?.options || null;
  const hasColors = productOptions?.colors?.length > 0;
  const hasCustomOptions = productOptions?.customOptions?.length > 0;
  const hasPricedOptions = productOptions?.pricedOptions?.length > 0;
  const hasAnyOptions = hasColors || hasCustomOptions || hasPricedOptions;

  const effectivePrice = React.useMemo(() => {
    if (!product) return 0;
    if (lastSelectedPricedOption && Number(lastSelectedPricedOption.price) > 0) {
      return Number(lastSelectedPricedOption.price);
    }
    return product.price;
  }, [product?.price, lastSelectedPricedOption]);

  const filteredImageIndices = React.useMemo(() => {
    if (!selectedColor || !productOptions?.imageColorMap) return null;
    const indices = [];
    for (const [idx, colors] of Object.entries(productOptions.imageColorMap)) {
      if (colors.includes(selectedColor)) indices.push(parseInt(idx));
    }
    return indices.length > 0 ? indices : null;
  }, [selectedColor, productOptions?.imageColorMap]);

  function buildSelectedOptions() {
    const opts = {};
    if (selectedColor) opts.color = selectedColor;
    if (Object.keys(selectedCustomOptions).length > 0) opts.customOptions = { ...selectedCustomOptions };
    if (Object.keys(selectedPricedOptions).length > 0) opts.pricedOptions = { ...selectedPricedOptions };
    return Object.keys(opts).length > 0 ? opts : null;
  }

  function validateOptions() {
    if (!hasAnyOptions) return true;
    const missing = [];
    if (hasColors && !selectedColor) missing.push("Color");
    if (hasCustomOptions) {
      for (const opt of productOptions.customOptions) {
        if (!selectedCustomOptions[opt.label]) missing.push(opt.label);
      }
    }
    if (hasPricedOptions) {
      for (const opt of productOptions.pricedOptions) {
        if (!selectedPricedOptions[opt.label]) missing.push(opt.label);
      }
    }
    if (missing.length > 0) {
      setOptionError(`Please select: ${missing.join(', ')}`);
      return false;
    }
    setOptionError(null);
    return true;
  }

  function handleAddToCart() {
    if (!product) return;
    if (!validateOptions()) return;
    addToCart(product, 1, buildSelectedOptions());
    openCart();
  }

  async function handleBuyNow() {
    if (!product) return;
    if (!validateOptions()) return;
    await addToCart(product, 1, buildSelectedOptions());
    navigate('/checkout');
  }

  function handleWishlistToggle() {
    if (!product) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
      openWishlist();
    }
  }

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: 15, color: '#666' }}><TranslatedText text="Loading product details..." /></p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-not-found">
        <h2><TranslatedText text="Product Not Found" /></h2>
        <p><TranslatedText text="Sorry, we couldn't find the product you're looking for." /></p>
        <a href="/" className="back-btn"><TranslatedText text="Return to Homepage" /></a>
      </div>
    );
  }

  const isOutOfStock = product.stock !== undefined && product.stock !== null && product.stock <= 0;
  const productInWishlist = isInWishlist(product.id);

  const categoryName = product.category_name || product.category
    ? (product.category_name || product.category).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : null;

  const settings = siteConfig?.settings || {};
  const categoryDefaults = getPolicies(siteConfig?.category);
  const pol = (key) => settings[key] || categoryDefaults[key] || '';

  // ===== PDP display toggles (managed in admin → Visual Customizer → Settings → Product Page) =====
  // Phase 4: layout variant picker (admin-managed). Whitelist guard so a typo
  // in the stored settings can never produce an unstyled page — unknown values
  // fall back to the original "classic" layout.
  const pdpLayoutVariant = (() => {
    const v = settings.pdpLayoutVariant;
    return v === 'sticky' ? 'sticky' : 'classic';
  })();
  const pdpShowMrp = settings.pdpShowMrp !== false;
  const pdpShowFeaturedBadge = settings.pdpShowFeaturedBadge !== false;
  const pdpShowLowStockCue = settings.pdpShowLowStockCue !== false;
  const pdpShowTrustBadges = settings.pdpShowTrustBadges !== false;
  const pdpShowSpecsPanel = settings.pdpShowSpecsPanel !== false;
  const pdpShowTags = settings.pdpShowTags === true;
  const pdpShowRelatedProducts = settings.pdpShowRelatedProducts !== false;
  const pdpRelatedProductsHeading = settings.pdpRelatedProductsHeading || 'You may also like';
  const pdpDefaultLowStockThreshold = (() => {
    const n = Number(settings.pdpDefaultLowStockThreshold);
    return Number.isFinite(n) && n >= 0 ? n : 3;
  })();

  // MRP / discount — only when admin has set a compare price > selling price.
  const comparePrice = Number(product.compare_price);
  const hasComparePrice = pdpShowMrp && Number.isFinite(comparePrice) && comparePrice > Number(effectivePrice);
  const discountPct = hasComparePrice
    ? Math.round(((comparePrice - Number(effectivePrice)) / comparePrice) * 100)
    : 0;

  // Low-stock urgency — uses per-product threshold first, then site default.
  const productLowStock = (() => {
    const n = Number(product.low_stock_threshold);
    return Number.isFinite(n) && n >= 0 ? n : pdpDefaultLowStockThreshold;
  })();
  const showLowStockCue =
    pdpShowLowStockCue &&
    !isOutOfStock &&
    Number.isFinite(Number(product.stock)) &&
    Number(product.stock) > 0 &&
    Number(product.stock) <= productLowStock;

  // Tags — accept either an array or a JSON string.
  const productTags = (() => {
    let t = product.tags;
    if (!t) return [];
    if (typeof t === 'string') {
      try { t = JSON.parse(t); } catch { t = t.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return Array.isArray(t) ? t.filter(Boolean) : [];
  })();

  // Specs — only show when at least one value exists.
  // `dimensions` is JSON-encoded TEXT in the DB (length/breadth/height live
  // inside that blob, not as top-level columns). Parse defensively so the
  // panel never blows up on a malformed string.
  const specWeight = Number(product.weight);
  const specDims = (() => {
    let d = product.dimensions;
    if (typeof d === 'string') {
      try { d = JSON.parse(d); } catch { d = null; }
    }
    if (!d || typeof d !== 'object') return null;
    const l = Number(d.length);
    const b = Number(d.breadth);
    const h = Number(d.height);
    if (![l, b, h].every(v => Number.isFinite(v) && v > 0)) return null;
    return { length: l, breadth: b, height: h };
  })();
  // Phase 3: flexible category-agnostic spec rows the merchant added on the
  // product form. Trust the worker's `safeParseSpecs` to hand us a clean
  // array, but be tolerant of legacy strings.
  const customSpecs = (() => {
    let s = product.specifications;
    if (typeof s === 'string') {
      try { s = JSON.parse(s); } catch { s = null; }
    }
    if (!Array.isArray(s)) return [];
    return s
      .filter(r => r && typeof r === 'object' && typeof r.label === 'string' && typeof r.value === 'string')
      .map(r => ({ label: r.label.trim(), value: r.value.trim() }))
      .filter(r => r.label && r.value);
  })();
  const hasSpecWeight = Number.isFinite(specWeight) && specWeight > 0;
  const hasSpecDims = !!specDims;
  const hasAnySpec = hasSpecWeight || hasSpecDims || customSpecs.length > 0;

  return (
    <div className={`${isModern ? 'modern-theme ' : ''}pdp-layout-${pdpLayoutVariant}`}>
      <div className="product-detail-container">
        <ProductGallery
          images={product.images}
          productName={product.name}
          filteredImageIndices={filteredImageIndices}
        />

        <div className="product-detail-right">
          <div className="product-detail-info">
            {pdpShowFeaturedBadge && product.is_featured ? (
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  color: '#92400e', padding: '4px 10px', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}>
                  <i className="fas fa-star" style={{ fontSize: 10 }} />
                  <TranslatedText text="Featured" />
                </span>
              </div>
            ) : null}

            <h1 className="product-title"><TranslatedText text={product.name} /></h1>

            {product.short_description ? (
              <p style={{
                margin: '4px 0 12px', fontSize: 15, color: '#475569',
                lineHeight: 1.5,
              }}>
                <TranslatedText text={product.short_description} />
              </p>
            ) : null}

            <div className="price" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
              <span className="product-price">{formatAmount(effectivePrice)}</span>
              {hasComparePrice && (
                <>
                  <span style={{
                    fontSize: 16, color: '#94a3b8', textDecoration: 'line-through',
                  }}>
                    {formatAmount(comparePrice)}
                  </span>
                  <span style={{
                    background: '#dcfce7', color: '#166534',
                    padding: '3px 8px', borderRadius: 6,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {discountPct}% <TranslatedText text="OFF" />
                  </span>
                </>
              )}
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label"><TranslatedText text="Availability:" /></span>
                <span className={`meta-value ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
                  {isOutOfStock ? <><TranslatedText text="Out of Stock" /> ✗</> : <><TranslatedText text="In Stock" /> ✓</>}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label"><TranslatedText text="SKU:" /></span>
                <span className="meta-value">{product.sku || product.id}</span>
              </div>
              {categoryName && (
                <div className="meta-item">
                  <span className="meta-label"><TranslatedText text="Category:" /></span>
                  <span className="meta-value">{categoryName}</span>
                </div>
              )}
            </div>

            {showLowStockCue && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff7ed', color: '#9a3412',
                border: '1px solid #fed7aa', borderRadius: 8,
                padding: '8px 12px', fontSize: 13, fontWeight: 600,
                margin: '8px 0 0',
              }}>
                <i className="fas fa-fire" style={{ color: '#ea580c' }} />
                <TranslatedText text={`Only ${product.stock} left in stock`} />
              </div>
            )}

            {hasColors && (
              <div className="product-option-section">
                <label className="product-option-label"><TranslatedText text="Color" /></label>
                <div className="product-color-swatches">
                  {productOptions.colors.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      className={`product-color-swatch${selectedColor === c.name ? ' selected' : ''}`}
                      style={{ background: c.hex || '#ccc' }}
                      onClick={() => { setSelectedColor(c.name); setOptionError(null); }}
                      title={c.name}
                    >
                      {selectedColor === c.name && <i className="fas fa-check" style={{ color: 'white', fontSize: 10, textShadow: '0 0 2px rgba(0,0,0,0.5)' }} />}
                    </button>
                  ))}
                </div>
                {selectedColor && <span className="product-option-selected">{selectedColor}</span>}
              </div>
            )}

            {hasCustomOptions && productOptions.customOptions.map(opt => (
              <div key={opt.label} className="product-option-section">
                <label className="product-option-label">{opt.label}</label>
                <div className="product-option-chips">
                  {opt.values.filter(v => v).map(val => (
                    <button
                      key={val}
                      type="button"
                      className={`product-option-chip${selectedCustomOptions[opt.label] === val ? ' selected' : ''}`}
                      onClick={() => { setSelectedCustomOptions(prev => ({ ...prev, [opt.label]: val })); setOptionError(null); }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {hasPricedOptions && productOptions.pricedOptions.map(opt => (
              <div key={opt.label} className="product-option-section">
                <label className="product-option-label">{opt.label}</label>
                <div className="product-option-chips">
                  {opt.values.filter(v => v.name).map(val => (
                    <button
                      key={val.name}
                      type="button"
                      className={`product-option-chip${selectedPricedOptions[opt.label]?.name === val.name ? ' selected' : ''}`}
                      onClick={() => { setSelectedPricedOptions(prev => ({ ...prev, [opt.label]: { name: val.name, price: val.price } })); setLastSelectedPricedOption({ name: val.name, price: val.price }); setOptionError(null); }}
                    >
                      {val.name}
                      {Number(val.price) > 0 && <span className="product-option-price-badge">{formatAmount(val.price)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {optionError && (
              <div className="product-option-error">
                <i className="fas fa-exclamation-circle" style={{ marginInlineEnd: 6 }} />
                {optionError}
              </div>
            )}

            {product.description && (
              <div className="product-description-section product-description-inline">
                <h3><TranslatedText text="Product Description" /></h3>
                <p><TranslatedText text={product.description} /></p>
              </div>
            )}

            {/* CTA stack. The Conversion-Sticky variant promotes Buy Now to
                the primary action — we reorder the actual DOM nodes (not just
                visual `order`) so keyboard tab-flow and screen-reader order
                match what the shopper sees. */}
            <div className="product-actions">
              {(() => {
                const addToCartBtn = (
                  <button
                    key="atc"
                    className="add-to-cart-btn"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                  >
                    {isOutOfStock ? <TranslatedText text="OUT OF STOCK" /> : <TranslatedText text="ADD TO CART" />}
                  </button>
                );
                const buyNowBtn = (
                  <button
                    key="buy"
                    className="buy-now-btn"
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                  >
                    <TranslatedText text="BUY NOW" />
                  </button>
                );
                const wishlistBtn = (
                  <button
                    key="wish"
                    className={`add-to-wishlist-btn${productInWishlist ? ' active' : ''}`}
                    onClick={handleWishlistToggle}
                  >
                    <i className="fas fa-heart" />
                    {productInWishlist ? <TranslatedText text="REMOVE FROM WISHLIST" /> : <TranslatedText text="ADD TO WISHLIST" />}
                  </button>
                );
                return pdpLayoutVariant === 'sticky'
                  ? [buyNowBtn, addToCartBtn, wishlistBtn]
                  : [addToCartBtn, buyNowBtn, wishlistBtn];
              })()}
            </div>

            {pdpShowTrustBadges && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                marginTop: 16, padding: '14px 12px',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              }}>
                {[
                  { icon: 'fa-truck-fast', label: settings.pdpTrustBadge1Label || 'Free shipping over ₹999' },
                  { icon: 'fa-rotate-left', label: settings.pdpTrustBadge2Label || 'Easy 10-day returns' },
                  { icon: 'fa-lock', label: settings.pdpTrustBadge3Label || 'Secure checkout' },
                ].map((b, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', gap: 6, padding: '4px 2px',
                  }}>
                    <i className={`fas ${b.icon}`} style={{ fontSize: 18, color: '#0f172a' }} />
                    <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.3, fontWeight: 500 }}>
                      <TranslatedText text={b.label} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {pdpShowSpecsPanel && hasAnySpec && (
              <div style={{
                marginTop: 16, padding: '12px 14px',
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
              }}>
                <h4 style={{
                  margin: '0 0 8px', fontSize: 13, color: '#0f172a',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  <i className="fas fa-clipboard-list" style={{ marginInlineEnd: 8, color: '#64748b' }} />
                  <TranslatedText text="Specifications" />
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 13, color: '#334155' }}>
                  {hasSpecWeight && (
                    <div>
                      <span style={{ color: '#64748b' }}><TranslatedText text="Weight" />: </span>
                      <strong>{specWeight} g</strong>
                    </div>
                  )}
                  {hasSpecDims && (
                    <div>
                      <span style={{ color: '#64748b' }}><TranslatedText text="Dimensions" />: </span>
                      <strong>{specDims.length} × {specDims.breadth} × {specDims.height} cm</strong>
                    </div>
                  )}
                  {customSpecs.map((row, i) => (
                    <div key={`spec-${i}`}>
                      <span style={{ color: '#64748b' }}><TranslatedText text={row.label} />: </span>
                      <strong><TranslatedText text={row.value} /></strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pdpShowTags && productTags.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {productTags.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: '4px 10px',
                    background: '#f1f5f9', color: '#475569',
                    borderRadius: 999, fontWeight: 500,
                  }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {siteConfig?.settings?.showProductPolicies !== false && (
            <div className="product-policies-accordions">
              <PolicyAccordion title={<TranslatedText text="Shipping & Delivery Details" />} icon="fa-truck">
                <PolicyItem label={<TranslatedText text="Regions" />} value={pol('shippingRegions')} />
                <PolicyItem label={<TranslatedText text="Shipping Charges" />} value={pol('shippingCharges')} />
                <PolicyItem label={<TranslatedText text="Delivery Time" />} value={pol('shippingDeliveryTime')} />
                <PolicyItem label={<TranslatedText text="Tracking" />} value={pol('shippingTracking')} />
              </PolicyAccordion>

              <PolicyAccordion title={<TranslatedText text="Return & Exchange" />} icon="fa-exchange-alt">
                <PolicyItem label={<TranslatedText text="Policy" />} value={pol('returnPolicy')} />
                <PolicyItem label={<TranslatedText text="Replacements" />} value={pol('returnReplacements')} />
                <PolicyItem label={<TranslatedText text="Mandatory Requirement" />} value={pol('returnMandatory')} />
              </PolicyAccordion>

              <PolicyAccordion title={<TranslatedText text="Care Guide" />} icon="fa-hand-holding-heart">
                <PolicyItem label={<TranslatedText text="Cleaning" />} value={pol('careGuideCleaning')} />
                <PolicyItem label={<TranslatedText text="Washing" />} value={pol('careGuideWashing')} />
                <PolicyItem label={<TranslatedText text="Maintenance" />} value={pol('careGuideMaintenance')} />
              </PolicyAccordion>
            </div>
            )}
          </div>
        </div>
      </div>

      <ActiveProductReviews productId={product.id} />

      {pdpShowRelatedProducts && (
      <RelatedProducts
        currentProductId={product.id}
        categoryId={product.category_id}
        heading={pdpRelatedProductsHeading}
        onWishlistToggle={(p) => {
          if (isInWishlist(p.id)) {
            removeFromWishlist(p.id);
          } else {
            addToWishlist(p);
            openWishlist();
          }
        }}
        isInWishlist={isInWishlist}
      />
      )}
    </div>
  );
}
