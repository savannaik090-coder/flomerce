import React, { useState } from 'react';
import { ChevronRight, Package, Truck, Shield, RotateCcw, Heart, ChevronDown, Plus } from 'lucide-react';
import { CATEGORY, SUBCATEGORIES, PRODUCTS, formatINR } from './_data';

export function BoutiqueMasonry() {
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState('All');

  const aspectRatios = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[2/3]'];

  return (
    <div className="min-h-screen bg-[#fbf8f3] text-[#333] font-['Lato'] pb-20">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
      `}} />

      {/* Top Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-[#888] flex items-center gap-2">
        {CATEGORY.breadcrumb.map((item, i) => (
          <React.Fragment key={i}>
            <span className={i === CATEGORY.breadcrumb.length - 1 ? 'text-[#333] font-medium' : 'hover:text-[#c9949a] cursor-pointer transition-colors'}>
              {item}
            </span>
            {i < CATEGORY.breadcrumb.length - 1 && <ChevronRight className="w-3 h-3" />}
          </React.Fragment>
        ))}
      </div>

      {/* Contained Banner Hero */}
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="relative w-full h-[340px] rounded-3xl overflow-hidden shadow-sm">
          <img 
            src={CATEGORY.heroImage} 
            alt={CATEGORY.name} 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#4a3b32]/60 via-[#4a3b32]/20 to-transparent"></div>
          
          <div className="absolute bottom-6 left-6 max-w-sm bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50">
            <h1 className="font-['Playfair_Display'] text-4xl font-semibold text-[#333] mb-3 leading-tight">
              {CATEGORY.name}
            </h1>
            <p className="text-sm text-[#555] mb-5 line-clamp-2 leading-relaxed">
              {CATEGORY.description}
            </p>
            <button className="bg-[#c9949a] hover:bg-[#b5727a] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-colors shadow-sm">
              Explore the Story &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Subcategory Pills */}
      <div className="max-w-6xl mx-auto px-6 mb-8 flex justify-center">
        <div className="flex flex-wrap justify-center gap-3">
          {SUBCATEGORIES.map(sub => (
            <button
              key={sub.id}
              onClick={() => setActiveSubcategory(sub.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm border border-transparent ${
                activeSubcategory === sub.id 
                  ? 'bg-[#c9949a] text-white shadow-md' 
                  : 'bg-white text-[#555] hover:border-[#c9949a]/30 hover:text-[#c9949a]'
              }`}
            >
              {sub.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubcategory === sub.id ? 'bg-white/20' : 'bg-[#f0ece8] text-[#888]'}`}>
                {sub.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ambient Stat Strip */}
      <div className="border-y border-[#e8e1d6] bg-white/50 py-3 mb-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-6 text-[10px] md:text-xs uppercase tracking-widest text-[#666] font-semibold">
          <div className="flex items-center gap-2"><Package className="w-4 h-4 text-[#c9949a]" /> 48 Pieces</div>
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#c9949a]" /> Ships in 24 hrs</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#c9949a]" /> Lifetime Warranty</div>
          <div className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-[#c9949a]" /> Easy Returns</div>
        </div>
      </div>

      {/* Sort + Count Bar */}
      <div className="max-w-6xl mx-auto px-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {['All', 'Newest', 'Bestseller', 'Under ₹100K', 'Featured'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-[#ffe4e8] text-[#b5727a] border border-[#c9949a]/20'
                  : 'bg-white text-[#666] border border-[#e8e1d6] hover:border-[#c9949a]/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#555] font-medium bg-white px-4 py-2 rounded-full border border-[#e8e1d6] shadow-sm cursor-pointer hover:border-[#c9949a]/50 transition-colors">
          Sort: Curated <ChevronDown className="w-4 h-4 text-[#888]" />
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {PRODUCTS.map((product, i) => {
            const aspectClass = aspectRatios[i % aspectRatios.length];
            
            return (
              <div 
                key={product.id} 
                className="break-inside-avoid bg-white p-3 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group -translate-y-0 hover:-translate-y-1 border border-[#e8e1d6]/50"
              >
                <div className={`relative w-full ${aspectClass} rounded-xl overflow-hidden mb-4 bg-[#f8f5f0]`}>
                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm text-[#333] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm shadow-sm">
                      {product.badge}
                    </div>
                  )}
                  
                  {/* Wishlist Heart */}
                  <button className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#555] hover:text-[#c9949a] hover:bg-white transition-colors shadow-sm">
                    <Heart className="w-4 h-4" />
                  </button>

                  {/* Main Image */}
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out z-10"
                  />
                  
                  {/* Hover Image */}
                  {product.hoverImage && (
                    <img 
                      src={product.hoverImage} 
                      alt={`${product.name} alternate view`}
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100 z-[15]"
                    />
                  )}

                  {/* Out of stock overlay */}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                      <span className="bg-white/90 text-[#333] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-sm shadow-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-1 flex justify-between items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-800 text-sm truncate mb-1">
                      {product.name}
                    </h3>
                    <p className="font-['Playfair_Display'] text-[#d4af37] text-base font-semibold tracking-wide">
                      {formatINR(product.price)}
                    </p>
                  </div>
                  <button 
                    disabled={!product.inStock}
                    className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm transition-colors ${
                      product.inStock 
                        ? 'bg-[#fbf8f3] text-[#c9949a] hover:bg-[#c9949a] hover:text-white border border-[#e8e1d6]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center mb-24">
        <button className="px-8 py-3 rounded-full border-2 border-stone-300 text-stone-600 font-bold text-xs uppercase tracking-widest hover:bg-[#c9949a] hover:border-[#c9949a] hover:text-white transition-all">
          Load More Pieces
        </button>
      </div>

      {/* Footer Styling Tips */}
      <div className="max-w-5xl mx-auto px-6 border-t border-[#e8e1d6] pt-16">
        <div className="text-center mb-10">
          <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#333] italic mb-2">Curated by our atelier</h2>
          <p className="text-sm text-[#666]">Styling tips and editorial inspiration for your special day.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group cursor-pointer">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
              <img src="https://images.unsplash.com/photo-1599643477877-530e5d3e2d7e?auto=format&fit=crop&w=600&q=80" alt="Styling Tip 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <h4 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-[#c9949a] transition-colors">The Perfect Stack</h4>
            <p className="text-xs text-[#666]">How to layer your heirloom bangles.</p>
          </div>
          <div className="group cursor-pointer mt-0 md:mt-8">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
              <img src="https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=600&q=80" alt="Styling Tip 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <h4 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-[#c9949a] transition-colors">Choosing Polki</h4>
            <p className="text-xs text-[#666]">Understanding uncut diamonds.</p>
          </div>
          <div className="group cursor-pointer">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
              <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80" alt="Styling Tip 3" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <h4 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-[#c9949a] transition-colors">Minimalist Bridal</h4>
            <p className="text-xs text-[#666]">For the modern, understated bride.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
