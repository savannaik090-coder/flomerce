import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { useSEO } from '../hooks/useSEO.js';
import * as productService from '../services/productService.js';
import * as categoryService from '../services/categoryService.js';
import ProductGrid from '../components/product/ProductGrid.jsx';
import FilterSortBar from '../components/product/FilterSortBar.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { parseAsUTC } from '../utils/dateFormatter.js';
import '../styles/category.css';

function formatSlugToTitle(slug) {
  if (!slug) return '';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image" />
          <div className="skeleton-text">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams();
  const { siteConfig } = useContext(SiteContext);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [categoryData, setCategoryData] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [filters, setFilters] = useState({ sort: 'featured', priceRange: 'all', inStockOnly: false });

  useEffect(() => {
    if (!siteConfig?.id || !slug) return;

    async function loadCategory() {
      setLoading(true);
      try {
        const catResult = await categoryService.getCategoryBySlug(siteConfig.id, slug);
        const cat = catResult.data?.[0] || catResult.data || catResult;
        setCategoryData(cat);

        let prodResult;
        if (cat?.id) {
          prodResult = await productService.getProductsByCategory(siteConfig.id, cat.id);
        } else {
          prodResult = await productService.getProducts(siteConfig.id, { category: slug });
        }
        const prods = prodResult.data || prodResult.products || prodResult || [];
        setProducts(prods);
        setFilteredProducts(prods);
      } catch (err) {
        console.error('Failed to load category:', err);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
  }, [siteConfig?.id, slug]);

  const applyFiltersAndSort = useCallback((prods, sort, filterOpts) => {
    let result = [...prods];

    if (filterOpts.priceRange && filterOpts.priceRange !== 'all') {
      const range = filterOpts.priceRange;
      if (range === '0-5000') {
        result = result.filter(p => p.price < 5000);
      } else if (range === '5000-15000') {
        result = result.filter(p => p.price >= 5000 && p.price <= 15000);
      } else if (range === '15000+') {
        result = result.filter(p => p.price > 15000);
      }
    }

    if (filterOpts.inStockOnly) {
      result = result.filter(p => p.stock > 0 || p.in_stock !== false);
    }

    if (sort === 'price-low-high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-high-low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'newest') {
      result.sort((a, b) => (parseAsUTC(b.created_at) || new Date(0)) - (parseAsUTC(a.created_at) || new Date(0)));
    }

    return result;
  }, []);

  useEffect(() => {
    setFilteredProducts(applyFiltersAndSort(products, sortBy, filters));
  }, [products, sortBy, filters, applyFiltersAndSort]);

  function handleSort(value) {
    setSortBy(value);
  }

  function handleFilter(filterOpts) {
    setFilters(filterOpts);
  }

  function handleWishlistToggle(product) {
    if (isInWishlist(product.id)) {
      const wishItem = { product_id: product.id };
      removeFromWishlist(wishItem.id || product.id);
    } else {
      addToWishlist(product);
    }
  }

  const categoryName = categoryData?.name || formatSlugToTitle(slug);
  const categoryDescription = categoryData?.description || `Discover our exquisite ${categoryName} collection`;

  useSEO({
    title: categoryName,
    description: categoryDescription,
    ogImage: categoryData?.image_url,
    seoOverrides: categoryData ? {
      seo_title: categoryData.seo_title,
      seo_description: categoryData.seo_description,
      seo_og_image: categoryData.seo_og_image,
    } : null,
  });

  return (
    <div className="category-page">
      <section
        className="hero-section"
        style={categoryData?.image_url ? { backgroundImage: `url(${resolveImageUrl(categoryData.image_url)})` } : {}}
      >
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">{categoryName}</h1>
          <p className="hero-subtitle">{categoryDescription}</p>
        </div>
      </section>

      <section className="shop-products-section">
        <FilterSortBar
          onSort={handleSort}
          onFilter={handleFilter}
          currentSort={sortBy}
          currentFilters={filters}
        />
        <div className="shop-products">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <ProductGrid
              products={filteredProducts}
              onWishlistToggle={handleWishlistToggle}
              isInWishlist={isInWishlist}
            />
          )}
        </div>
      </section>
    </div>
  );
}
