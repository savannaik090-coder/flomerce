import React, { useState } from 'react';
import { 
  ChevronRight, 
  Heart, 
  Grid3X3, 
  Grid2X2, 
  ChevronDown, 
  SlidersHorizontal,
  Star
} from 'lucide-react';
import { PRODUCTS, SUBCATEGORIES, CATEGORY, formatINR } from './_data';

export function SidebarDense() {
  const [viewCols, setViewCols] = useState<3 | 4>(3);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white text-stone-800 font-['Lato'] selection:bg-[#c9949a] selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-xs text-stone-500 uppercase tracking-widest">
          {CATEGORY.breadcrumb.map((crumb, idx) => (
            <React.Fragment key={crumb}>
              <span className={idx === CATEGORY.breadcrumb.length - 1 ? 'text-stone-900 font-bold' : 'hover:text-[#c9949a] cursor-pointer transition-colors'}>
                {crumb}
              </span>
              {idx < CATEGORY.breadcrumb.length - 1 && <ChevronRight className="w-3 h-3" />}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Hero */}
      <div className="h-[220px] bg-gradient-to-b from-[#fdfbf9] to-[#faf8f5] border-b border-[#e8e1d6] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl text-stone-900 mb-3 tracking-wide">
          {CATEGORY.name}
        </h1>
        <p className="max-w-2xl text-stone-600 text-sm md:text-base leading-relaxed mb-4">
          {CATEGORY.description}
        </p>
        <span className="text-xs uppercase tracking-widest font-bold text-[#c9949a]">
          {CATEGORY.productCount} Pieces
        </span>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Sidebar */}
        <aside className="hidden md:block w-[260px] shrink-0 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar bg-[#faf8f5] border border-[#e8e1d6] rounded-sm p-6">
          <div className="flex items-center gap-2 mb-8 text-stone-800">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-bold uppercase tracking-widest text-sm">Filters</span>
          </div>

          {/* Subcategories */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">Category</h3>
            <div className="space-y-3">
              {SUBCATEGORIES.filter(s => s.id !== 'all').map((sub) => (
                <label key={sub.id} className="flex items-center group cursor-pointer">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-[#e8e1d6] bg-white rounded-sm mr-3 group-hover:border-[#c9949a] transition-colors">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="absolute inset-0 bg-[#c9949a] opacity-0 peer-checked:opacity-100 transition-opacity rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white">
                        <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors flex-1">{sub.name}</span>
                  <span className="text-xs text-stone-400">{sub.count}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-[#e8e1d6] mb-8" />

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">Price Range</h3>
            <div className="px-1 mb-2">
              {/* Fake Slider Track */}
              <div className="relative h-1 bg-[#e8e1d6] rounded-full mt-6 mb-4">
                <div className="absolute left-[20%] right-[30%] h-full bg-[#c9949a] rounded-full"></div>
                <div className="absolute left-[20%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[#c9949a] rounded-full border-2 border-white shadow-sm"></div>
                <div className="absolute right-[30%] top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-[#c9949a] rounded-full border-2 border-white shadow-sm"></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm text-stone-600">
              <span>₹0</span>
              <span>₹500,000+</span>
            </div>
          </div>

          <hr className="border-[#e8e1d6] mb-8" />

          {/* Availability */}
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900">In Stock Only</h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" />
              <div className="w-9 h-5 bg-[#e8e1d6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c9949a]"></div>
            </label>
          </div>

          <hr className="border-[#e8e1d6] mb-8" />

          {/* Material */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">Material</h3>
            <div className="space-y-3">
              {['22K Gold', 'Diamond', 'Polki', 'Kundan', 'Pearl'].map((mat) => (
                <label key={mat} className="flex items-center group cursor-pointer">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-[#e8e1d6] bg-white rounded-sm mr-3 group-hover:border-[#c9949a] transition-colors">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="absolute inset-0 bg-[#c9949a] opacity-0 peer-checked:opacity-100 transition-opacity rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white">
                        <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">{mat}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-[#e8e1d6] mb-8" />

          {/* Rating */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest font-bold text-stone-900 mb-4">Rating</h3>
            <div className="space-y-3">
              {[5, 4, 3].map((rating) => (
                <label key={rating} className="flex items-center group cursor-pointer">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-[#e8e1d6] bg-white rounded-sm mr-3 group-hover:border-[#c9949a] transition-colors">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="absolute inset-0 bg-[#c9949a] opacity-0 peer-checked:opacity-100 transition-opacity rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white">
                        <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={\`w-3.5 h-3.5 \${i < rating ? 'fill-[#d4af37] text-[#d4af37]' : 'fill-[#e8e1d6] text-[#e8e1d6]'}\`} />
                    ))}
                    {rating < 5 && <span className="text-xs text-stone-500 ml-1">& Up</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button className="w-full py-2 text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-[#c9949a] transition-colors underline decoration-transparent hover:decoration-[#c9949a] underline-offset-4">
            Clear All Filters
          </button>
        </aside>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          
          {/* Top Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e8e1d6]">
            <p className="text-sm text-stone-500">
              Showing <span className="font-bold text-stone-900">12</span> of 48 products
            </p>

            <div className="flex items-center gap-6">
              {/* View Toggles */}
              <div className="hidden sm:flex items-center gap-2 border-r border-[#e8e1d6] pr-6">
                <button 
                  onClick={() => setViewCols(3)}
                  className={\`p-1.5 transition-colors \${viewCols === 3 ? 'text-stone-900 bg-stone-100' : 'text-stone-400 hover:text-stone-600'}\`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewCols(4)}
                  className={\`p-1.5 transition-colors \${viewCols === 4 ? 'text-stone-900 bg-stone-100' : 'text-stone-400 hover:text-stone-600'}\`}
                >
                  <Grid2X2 className="w-5 h-5" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-sm group relative cursor-pointer">
                <span className="text-stone-500">Sort by:</span>
                <span className="font-bold text-stone-900">Featured</span>
                <ChevronDown className="w-4 h-4 text-stone-500" />
                
                {/* Fake Dropdown */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-[#e8e1d6] shadow-lg rounded-sm py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  {['Featured', 'Price: Low to High', 'Price: High to Low', 'Newest'].map(s => (
                    <div key={s} className="px-4 py-2 hover:bg-[#faf8f5] hover:text-[#c9949a] transition-colors">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className={\`grid gap-4 \${viewCols === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}\`}>
            {PRODUCTS.map(product => (
              <div 
                key={product.id} 
                className="group flex flex-col border-b border-transparent hover:border-[#e8e1d6] pb-3 transition-colors"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <div className="relative aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-3">
                  <img 
                    src={hoveredProduct === product.id && product.hoverImage ? product.hoverImage : product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-90"
                  />
                  
                  {/* Ribbon Badge */}
                  {product.badge && (
                    <div className="absolute top-3 left-0 bg-[#c9949a] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 z-10">
                      {product.badge}
                    </div>
                  )}

                  {/* Out of Stock Overlay */}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <span className="bg-white/90 text-stone-800 text-xs font-bold uppercase tracking-widest px-4 py-2 border border-stone-200">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* Wishlist Button */}
                  <button className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-stone-400 hover:text-[#c9949a] rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 shadow-sm">
                    <Heart className="w-4 h-4" />
                  </button>

                  {/* Quick View */}
                  {product.inStock && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10 px-4">
                      <button className="w-full bg-white/95 hover:bg-white text-stone-900 text-xs font-bold uppercase tracking-widest py-3 shadow-md transition-colors border border-stone-100">
                        Quick View
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 relative">
                  <h3 className="text-sm text-stone-700 leading-snug line-clamp-2 mb-1 pr-8">
                    {product.name}
                  </h3>
                  <div className="mt-auto pt-1">
                    <span className="font-medium text-[#d4af37] text-sm">
                      {formatINR(product.price)}
                    </span>
                  </div>

                  {/* Add to bag small button (revealed on hover) */}
                  {product.inStock && (
                    <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                      <button className="text-xs font-bold text-[#c9949a] hover:text-stone-900 uppercase tracking-widest border-b border-transparent hover:border-stone-900 transition-colors">
                        + Bag
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-16 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((page) => (
              <button 
                key={page}
                className={\`w-8 h-8 flex items-center justify-center text-sm font-medium transition-colors \${page === 1 ? 'bg-[#c9949a] text-white' : 'text-stone-500 hover:bg-[#faf8f5] hover:text-[#c9949a]'}\`}
              >
                {page}
              </button>
            ))}
            <span className="text-stone-300 mx-1">·</span>
            <button className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-[#faf8f5] hover:text-[#c9949a] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Footer Band */}
      <div className="bg-[#faf8f5] border-t border-[#e8e1d6] py-16 px-6 text-center mt-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-['Playfair_Display'] text-2xl text-stone-900 mb-4">
            The {CATEGORY.name} Experience
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed mb-8">
            {CATEGORY.description} Each piece is carefully curated and handcrafted to ensure the highest quality and timeless elegance for your special moments.
          </p>
          <button className="inline-flex items-center justify-center bg-stone-900 text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#c9949a] transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>

    </div>
  );
}
