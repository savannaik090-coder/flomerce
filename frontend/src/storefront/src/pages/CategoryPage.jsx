import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import { useSEO } from '../hooks/useSEO.js';
import { useTheme } from '../context/ThemeContext.jsx';
import * as productService from '../services/productService.js';
import * as categoryService from '../services/categoryService.js';
import TranslatedText from '../components/TranslatedText.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import FilterSortBar from '../components/product/FilterSortBar.jsx';
import SubcategoryChipRow from '../components/product/SubcategoryChipRow.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { parseAsUTC } from '../utils/dateFormatter.js';
import { getDemoProductsForCategory } from '../defaults/index.js';
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
  const [searchParams] = useSearchParams();
  const { siteConfig } = useContext(SiteContext);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isModern } = useTheme();

  const [categoryData, setCategoryData] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [filters, setFilters] = useState({ sort: 'featured', inStockOnly: false, subcategoryId: '' });

  useEffect(() => {
    if (!siteConfig?.id || !slug) return;

    const urlSubcategory = searchParams.get('subcategory') || '';

    async function loadCategory() {
      setLoading(true);
      try {
        const catResult = await categoryService.getCategoryBySlug(siteConfig.id, slug);
        const cat = catResult.data?.[0] || catResult.data || catResult;
        setCategoryData(cat);

        const children = cat?.children || [];
        setSubcategories(children);

        let prodResult;
        if (cat?.id) {
          prodResult = await productService.getProductsByCategory(siteConfig.id, cat.id);
        } else {
          prodResult = await productService.getProducts(siteConfig.id, { category: slug });
        }
        const prods = prodResult.data || prodResult.products || prodResult || [];
        const displayName = cat?.name || formatSlugToTitle(slug);
        const finalProds = prods.length === 0
          ? getDemoProductsForCategory(siteConfig?.category, displayName)
          : prods;
        setProducts(finalProds);
        setFilteredProducts(finalProds);
      } catch (err) {
        console.error('Failed to load category:', err);
        const displayName = formatSlugToTitle(slug);
        const demos = getDemoProductsForCategory(siteConfig?.category, displayName);
        setProducts(demos);
        setFilteredProducts(demos);
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
    setFilters({ sort: 'featured', inStockOnly: false, subcategoryId: urlSubcategory });
  }, [siteConfig?.id, slug, searchParams]);

  const applyFiltersAndSort = useCallback((prods, sort, filterOpts) => {
    let result = [...prods];

    if (filterOpts.subcategoryId) {
      result = result.filter(p => p.subcategory_id === filterOpts.subcategoryId);
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
    <div className={`category-page${isModern ? ' modern-theme' : ''}`}>
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

      <SubcategoryChipRow
        subcategories={subcategories}
        activeId={filters.subcategoryId}
        onSelect={(id) => setFilters({ ...filters, subcategoryId: id })}
      />

      <section className="shop-products-section">
        <div className="shop-filter-row">
          <div className="shop-filter-row-inner">
            <FilterSortBar
              onSort={handleSort}
              onFilter={handleFilter}
              currentSort={sortBy}
              currentFilters={filters}
              subcategories={subcategories}
            />
            {!loading && filteredProducts.length > 0 && (
              <div className="product-count-label">
                {filteredProducts.length} <TranslatedText text={filteredProducts.length === 1 ? 'piece' : 'pieces'} />
              </div>
            )}
          </div>
        </div>
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
