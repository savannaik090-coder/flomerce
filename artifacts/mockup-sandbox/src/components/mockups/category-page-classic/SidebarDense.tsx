import React, { useState, useMemo } from 'react';
import { Heart, ChevronDown, X } from 'lucide-react';
import { CATEGORY, SUBCATEGORIES, PRODUCTS, formatINR, type Product } from './_data';

type SortValue = 'price-low-high' | 'price-high-low' | 'newest';
const SORT_LABELS: Record<SortValue, string> = {
  'price-low-high': 'Price: Low to High',
  'price-high-low': 'Price: High to Low',
  'newest': 'Newest',
};

function ProductTile({ p }: { p: Product }) {
  const [wished, setWished] = useState(false);
  const out = p.stock <= 0;
  return (
    <div className="group">
      <div className="relative overflow-hidden bg-[#f4efe7]">
        <img
          src={p.images[0]}
          alt={p.name}
          className="w-full h-[340px] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {out && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-semibold tracking-[0.2em] uppercase">Out of Stock</span>
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); setWished(!wished); }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition"
          aria-label="Add to wishlist"
        >
          <Heart size={14} className={wished ? 'fill-[#e53e3e] text-[#e53e3e]' : 'text-[#333]'} />
        </button>
      </div>
      <div className="text-center pt-3 pb-1">
        <h3 className="text-[13px] font-medium text-[#333] truncate" style={{ fontFamily: "'Futura PT', 'Century Gothic', sans-serif" }}>
          {p.name}
        </h3>
        <p className="text-[14px] font-semibold text-[#333] mt-1" style={{ fontFamily: "'Lato', sans-serif" }}>
          {formatINR(p.price)}
        </p>
      </div>
    </div>
  );
}

export function SidebarDense() {
  const [sort, setSort] = useState<SortValue>('price-low-high');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempSort, setTempSort] = useState<'featured' | 'newest'>('featured');
  const [tempInStock, setTempInStock] = useState(false);
  const [tempSub, setTempSub] = useState('');
  const [filters, setFilters] = useState({ inStockOnly: false, subcategoryId: '' });

  const products = useMemo(() => {
    let r = [...PRODUCTS];
    if (filters.subcategoryId) r = r.filter(p => p.subcategory_id === filters.subcategoryId);
    if (filters.inStockOnly) r = r.filter(p => p.stock > 0);
    if (sort === 'price-low-high') r.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high-low') r.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') r.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
    return r;
  }, [sort, filters]);

  const activeFilters = (filters.inStockOnly ? 1 : 0) + (filters.subcategoryId ? 1 : 0);

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Lato', sans-serif" }}>
      {/* HERO — short banner with side-by-side text + image */}
      <section className="relative bg-[#f8f8f5]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="px-8 md:px-12 py-12 md:py-16 flex flex-col justify-center">
            <div className="text-[11px] tracking-[0.3em] uppercase text-[#d4af37] mb-3">Collection</div>
            <h1 className="text-4xl md:text-5xl text-[#1a1a1a] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {CATEGORY.name}
            </h1>
            <div className="mt-4 mb-5 h-px w-12 bg-[#603000]" />
            <p className="text-[#555] text-base leading-relaxed max-w-md" style={{ fontFamily: "'Lora', serif" }}>
              {CATEGORY.description}
            </p>
          </div>
          <div
            className="h-[280px] md:h-auto bg-cover bg-center"
            style={{ backgroundImage: `url(${CATEGORY.image_url})` }}
          />
        </div>
      </section>

      {/* FILTER + SORT BAR (sticky) with product count */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#e8e1d6]">
        <div className="max-w-[1280px] mx-auto px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setFilterOpen(true)}
            className="text-[12px] tracking-[0.25em] uppercase text-[#603000] hover:text-[#d4af37] transition"
          >
            Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
          <div className="text-[11px] tracking-[0.3em] uppercase text-[#888]">
            Showing {products.length} of {PRODUCTS.length}
          </div>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 text-[12px] tracking-[0.25em] uppercase text-[#603000] hover:text-[#d4af37] transition"
            >
              Sort By <ChevronDown size={12} className={`transition ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-[#e8e1d6] shadow-lg min-w-[200px] z-40">
                {(['price-low-high', 'price-high-low', 'newest'] as SortValue[]).map(v => (
                  <button
                    key={v}
                    onClick={() => { setSort(v); setSortOpen(false); }}
                    className={`block w-full text-left px-4 py-3 text-sm hover:bg-[#f8f8f5] transition ${sort === v ? 'text-[#603000] font-semibold' : 'text-[#666]'}`}
                  >
                    {SORT_LABELS[v]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCT GRID — dense 4-col (matches current Classic theme default) */}
      <section className="max-w-[1280px] mx-auto px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {products.map(p => <ProductTile key={p.id} p={p} />)}
        </div>
      </section>

      {/* FILTER MODAL */}
      {filterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFilterOpen(false)}>
          <div className="bg-white max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
              <h2 className="text-xl text-[#333]" style={{ fontFamily: "'Playfair Display', serif" }}>Filter Products</h2>
              <button onClick={() => setFilterOpen(false)} className="text-[#888] hover:text-[#333]"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <h3 className="text-xs tracking-[0.2em] uppercase text-[#888] mb-3">Sort By</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                    <input type="radio" name="srt" checked={tempSort === 'featured'} onChange={() => setTempSort('featured')} /> Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                    <input type="radio" name="srt" checked={tempSort === 'newest'} onChange={() => setTempSort('newest')} /> Newest
                  </label>
                </div>
              </div>
              <div>
                <h3 className="text-xs tracking-[0.2em] uppercase text-[#888] mb-3">Subcategory</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                    <input type="radio" name="sub" checked={tempSub === ''} onChange={() => setTempSub('')} /> All
                  </label>
                  {SUBCATEGORIES.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                      <input type="radio" name="sub" checked={tempSub === s.id} onChange={() => setTempSub(s.id)} /> {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs tracking-[0.2em] uppercase text-[#888] mb-3">Availability</h3>
                <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                  <input type="checkbox" checked={tempInStock} onChange={e => setTempInStock(e.target.checked)} /> In Stock
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#eee] flex gap-3">
              <button
                onClick={() => { setFilters({ inStockOnly: tempInStock, subcategoryId: tempSub }); setFilterOpen(false); }}
                className="flex-1 bg-[#603000] text-white py-3 text-sm tracking-[0.15em] uppercase hover:bg-[#7B410A] transition"
              >
                Apply Filters
              </button>
              <button
                onClick={() => { setTempSort('featured'); setTempInStock(false); setTempSub(''); setFilters({ inStockOnly: false, subcategoryId: '' }); setFilterOpen(false); }}
                className="px-5 border border-[#ddd] text-[#666] text-sm tracking-[0.15em] uppercase hover:bg-[#f8f8f5] transition"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
