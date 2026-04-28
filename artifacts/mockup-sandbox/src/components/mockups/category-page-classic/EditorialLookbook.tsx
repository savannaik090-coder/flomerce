import React, { useState } from 'react';
import { Heart, ChevronDown, ArrowRight } from 'lucide-react';
import { CATEGORY, SUBCATEGORIES, PRODUCTS, formatINR } from './_data';

export function EditorialLookbook() {
  const [activeSubcategory, setActiveSubcategory] = useState('all');

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#3a2818] font-['Lato',sans-serif]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
      `}} />

      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-6 py-4">
        <nav className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-medium">
          {CATEGORY.breadcrumb.map((item, i) => (
            <span key={i}>
              {item}
              {i < CATEGORY.breadcrumb.length - 1 && <span className="mx-2 text-stone-300">/</span>}
            </span>
          ))}
        </nav>
      </div>

      {/* Hero */}
      <div className="max-w-[1280px] mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row h-[520px] bg-[#fdfaf5] border border-[#e8e1d6] overflow-hidden shadow-sm">
          <div className="w-full md:w-[60%] h-[300px] md:h-full relative">
            <img 
              src={CATEGORY.heroImage} 
              alt={CATEGORY.name} 
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="w-full md:w-[40%] flex flex-col justify-center p-12 lg:p-16 relative">
            <span className="text-xs tracking-[0.25em] uppercase text-[#c9949a] mb-4 font-semibold">
              The Collection
            </span>
            <h1 className="font-['Playfair_Display'] text-5xl lg:text-[72px] leading-[1.05] font-normal text-[#3a2818] mb-6">
              {CATEGORY.name.split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
            </h1>
            <p className="text-[#5a4838] leading-relaxed mb-10 max-w-sm text-sm lg:text-base">
              {CATEGORY.description}
            </p>
            <div className="absolute top-8 right-8">
              <div className="w-16 h-16 rounded-full border border-[#d4af37] flex flex-col items-center justify-center text-center p-2">
                <span className="font-['Playfair_Display'] text-lg leading-none text-[#d4af37]">{CATEGORY.productCount}</span>
                <span className="text-[8px] tracking-widest uppercase text-[#d4af37] mt-1">Pieces</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory Chips */}
      <div className="max-w-[1280px] mx-auto px-6 mb-10">
        <div className="flex flex-wrap items-center gap-3">
          {SUBCATEGORIES.map(sub => {
            const isActive = activeSubcategory === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubcategory(sub.id)}
                className={`
                  px-6 py-2.5 rounded-full text-xs tracking-wider uppercase transition-all duration-300
                  ${isActive 
                    ? 'bg-[#c9949a] text-white border-[#c9949a]' 
                    : 'bg-transparent text-[#3a2818] border-[#e8e1d6] hover:border-[#d4af37] hover:text-[#d4af37]'
                  }
                  border
                `}
              >
                {sub.name} <span className={`ml-1 ${isActive ? 'text-white/80' : 'text-stone-400'}`}>({sub.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort Bar */}
      <div className="max-w-[1280px] mx-auto px-6 mb-12">
        <div className="border-y border-[#e8e1d6] py-4 flex justify-between items-center bg-[#fdfaf5]/50 px-4">
          <div className="text-xs text-[#5a4838] tracking-widest uppercase">
            Showing 1–12 of {CATEGORY.productCount}
          </div>
          <button className="flex items-center gap-2 text-xs tracking-widest uppercase text-[#3a2818] hover:text-[#c9949a] transition-colors group">
            Sort by: Featured
            <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-[#c9949a] transition-colors" />
          </button>
        </div>
      </div>

      {/* Editorial Grid */}
      <div className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
          {PRODUCTS.map((product, idx) => {
            // Determine card type based on pattern:
            // 0,1,2: normal
            // 3: large (col-span-2), 4: normal
            // 5: normal, 6: large (col-span-2)
            // 7,8,9: normal
            // 10: large (col-span-2), 11: normal
            
            let isLarge = false;
            let layout = 'normal';
            if (idx === 3 || idx === 10) { isLarge = true; layout = 'large-left'; }
            if (idx === 6) { isLarge = true; layout = 'large-right'; }

            if (isLarge) {
              return (
                <div key={product.id} className="col-span-1 md:col-span-2 group cursor-pointer relative flex flex-col sm:flex-row bg-white border border-[#e8e1d6] overflow-hidden hover:shadow-md transition-shadow duration-500">
                  <div className={`w-full sm:w-[60%] relative overflow-hidden bg-stone-100 ${layout === 'large-right' ? 'order-2' : 'order-1'}`}>
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover aspect-[4/3] sm:aspect-auto sm:absolute sm:inset-0 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white/90 px-4 py-2 text-xs tracking-widest uppercase text-[#3a2818]">Out of Stock</span>
                      </div>
                    )}
                    {product.badge && (
                      <div className="absolute top-4 left-4 bg-[#faf6ee] px-3 py-1 text-[10px] tracking-widest uppercase text-[#3a2818] shadow-sm z-10">
                        {product.badge}
                      </div>
                    )}
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/70 backdrop-blur flex items-center justify-center text-[#3a2818] hover:bg-[#c9949a] hover:text-white transition-colors z-10">
                      <Heart className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className={`w-full sm:w-[40%] p-8 md:p-12 flex flex-col justify-center bg-[#fdfaf5] ${layout === 'large-right' ? 'order-1' : 'order-2'}`}>
                    <div className="text-[10px] tracking-widest uppercase text-stone-400 mb-3">{product.subcategory}</div>
                    <h3 className="font-['Playfair_Display'] text-2xl lg:text-3xl text-[#3a2818] mb-4 leading-snug">
                      {product.name}
                    </h3>
                    <div className="font-['Playfair_Display'] italic text-[#d4af37] text-xl mb-8">
                      {formatINR(product.price)}
                    </div>
                    <div className="mt-auto flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-[#3a2818] group-hover:text-[#c9949a] transition-colors font-semibold">
                      Discover
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={product.id} className="col-span-1 group cursor-pointer flex flex-col">
                <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-stone-100 border border-transparent group-hover:border-[#e8e1d6] transition-colors duration-500">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {product.hoverImage && (
                    <img 
                      src={product.hoverImage} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
                    />
                  )}
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <span className="bg-white/90 px-4 py-2 text-[10px] tracking-widest uppercase text-[#3a2818]">Out of Stock</span>
                    </div>
                  )}
                  {product.badge && (
                    <div className="absolute top-4 left-4 bg-[#faf6ee] px-3 py-1 text-[9px] tracking-[0.15em] uppercase text-[#3a2818] shadow-sm z-10">
                      {product.badge}
                    </div>
                  )}
                  <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/70 backdrop-blur flex items-center justify-center text-[#3a2818] hover:bg-[#c9949a] hover:text-white transition-colors z-10">
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="text-center px-4 flex flex-col items-center">
                  <h3 className="text-xs tracking-[0.15em] uppercase text-[#3a2818] mb-2 leading-relaxed">
                    {product.name}
                  </h3>
                  <div className="font-['Playfair_Display'] italic text-[#d4af37] text-lg">
                    {formatINR(product.price)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e8e1d6] bg-[#fdfaf5] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-['Playfair_Display'] italic text-2xl md:text-4xl text-[#3a2818] leading-snug mb-8">
            "We believe that true luxury lies in the patience of the craft and the quiet elegance of the wearer."
          </p>
          <div className="text-xs tracking-widest uppercase text-stone-400 mb-12">
            — The House of Bridal Collection
          </div>
          <button className="bg-[#3a2818] text-white px-10 py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#c9949a] transition-colors duration-300">
            Continue Shopping
          </button>
        </div>
      </footer>
    </div>
  );
}
