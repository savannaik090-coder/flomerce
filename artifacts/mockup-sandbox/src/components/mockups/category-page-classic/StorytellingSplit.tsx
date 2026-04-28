import React, { useState } from 'react';
import { Heart, ChevronDown } from 'lucide-react';
import { CATEGORY, SUBCATEGORIES, PRODUCTS, formatINR, type Product } from './_data';

export function StorytellingSplit() {
  const [activeTab, setActiveTab] = useState('all');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const toggleWishlist = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Re-map products to match the brief's layout
  // 1-4: index 0,1,2,3
  // 5: Editorial Spread (index 5)
  // 6-9: index 4, 6, 7, 8
  // 10: Editorial Spread (index 9)
  // 11-12: index 10, 11
  
  const row1 = PRODUCTS.slice(0, 4);
  const row2 = [PRODUCTS[4], PRODUCTS[6], PRODUCTS[7], PRODUCTS[8]];
  const row3 = PRODUCTS.slice(10, 12);
  
  const vrindaSet = PRODUCTS[5];
  const emeraldBracelet = PRODUCTS[9];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#333] font-['Lato',sans-serif] selection:bg-[#c9949a] selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        .story-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2rem;
        }
        
        @media (max-width: 1024px) {
          .story-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .col-span-4 {
            grid-column: span 2 / span 2;
          }
        }
        
        @media (max-width: 640px) {
          .story-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
          .col-span-4 {
            grid-column: span 1 / span 1;
          }
        }
      `}} />

      {/* Slim Breadcrumb */}
      <div className="w-full bg-white border-b border-[#e8e1d6] px-8 py-3">
        <div className="text-[11px] uppercase tracking-widest text-[#888] flex items-center gap-2">
          {CATEGORY.breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb}>
              <span className={i === CATEGORY.breadcrumb.length - 1 ? "text-[#333]" : "hover:text-[#c9949a] cursor-pointer transition-colors"}>
                {crumb}
              </span>
              {i < CATEGORY.breadcrumb.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Split Hero */}
      <div className="flex flex-col lg:flex-row h-auto lg:h-[560px]">
        <div className="w-full lg:w-1/2 h-[300px] lg:h-full relative overflow-hidden">
          <img 
            src={CATEGORY.heroImage} 
            alt={CATEGORY.name}
            className="absolute inset-0 w-full h-full object-cover object-center scale-105"
          />
        </div>
        <div className="w-full lg:w-1/2 bg-[#f4ede0] p-10 lg:p-16 flex flex-col justify-center relative">
          <h1 className="font-['Playfair_Display'] text-5xl lg:text-[64px] leading-none mb-8 text-[#1f2a3a]">
            {CATEGORY.name}
          </h1>
          <div className="w-[60px] h-[1px] bg-[#d4af37] mb-8"></div>
          <p className="text-[#555] text-lg leading-relaxed max-w-md mb-12 lg:mb-auto font-light">
            {CATEGORY.description}
          </p>
          
          {/* Mini Featured Card */}
          <div className="bg-white/60 p-4 border border-[#e8e1d6] flex items-center gap-4 max-w-sm mt-auto hover:bg-white transition-colors cursor-pointer group">
            <div className="w-20 h-20 shrink-0 overflow-hidden">
              <img src={vrindaSet.image} alt={vrindaSet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] tracking-widest text-[#d4af37] mb-1 font-semibold">FEATURED THIS WEEK</div>
              <h4 className="font-['Playfair_Display'] text-sm mb-1">{vrindaSet.name}</h4>
              <div className="flex items-center justify-between">
                <span className="font-serif text-[#1f2a3a] text-sm">{formatINR(vrindaSet.price)}</span>
                <span className="text-[10px] tracking-widest uppercase border-b border-transparent group-hover:border-[#333] transition-colors">View Piece &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory Tabs */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 mt-12">
        <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 pb-4">
          {SUBCATEGORIES.map((sub, i) => (
            <React.Fragment key={sub.id}>
              <button 
                onClick={() => setActiveTab(sub.id)}
                className="group relative px-2 py-1"
              >
                <span className={`font-['Playfair_Display'] italic lowercase text-lg lg:text-xl transition-colors duration-300 ${activeTab === sub.id ? 'text-[#1f2a3a]' : 'text-[#888] group-hover:text-[#1f2a3a]'}`}>
                  {sub.name}
                </span>
                <span className={`absolute bottom-0 left-0 h-[1px] bg-[#d4af37] transition-all duration-300 ${activeTab === sub.id ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              {i < SUBCATEGORIES.length - 1 && (
                <span className="text-[#d4af37] text-xl leading-none">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Sub-toolbar */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 mt-8 mb-12">
        <div className="flex justify-between items-center pb-4 border-b border-[#e8e1d6] text-sm text-[#666]">
          <div className="font-light">
            Showing 12 of {CATEGORY.productCount} pieces
          </div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-1 hover:text-[#1f2a3a] transition-colors">
              Refine <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 hover:text-[#1f2a3a] transition-colors">
              Sort: By Story <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="story-grid">
          
          {/* Row 1 (1-4) */}
          {row1.map(product => (
            <ProductCard key={product.id} product={product} isWishlisted={!!wishlist[product.id]} onWishlist={toggleWishlist} />
          ))}

          {/* Editorial Spread 1 */}
          <div className="col-span-4 flex flex-col md:flex-row bg-white border border-[#e8e1d6] my-8 group cursor-pointer">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-[16/10] md:aspect-auto">
              <img src={vrindaSet.image} alt={vrindaSet.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
            </div>
            <div className="w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-center relative">
              <div className="absolute left-0 top-16 bottom-16 w-[1px] bg-[#d4af37]/30 hidden md:block"></div>
              <h3 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-[#1f2a3a] mb-6">The Vrinda Story</h3>
              <p className="text-[#555] font-light leading-relaxed mb-4">
                Handcrafted over 120 hours by our master artisans, the Vrinda Temple Set is a testament to the enduring legacy of South Indian heritage jewellery. Each motif is meticulously carved to depict ancient mythological narratives.
              </p>
              <p className="text-[#555] font-light leading-relaxed mb-8">
                Forged in 22 karat yellow gold and set with unblemished rubies and emeralds, it represents the pinnacle of bridal opulence—a true heirloom intended to be passed down through generations.
              </p>
              <div className="mt-auto">
                <span className="text-xs tracking-[0.2em] uppercase font-semibold text-[#1f2a3a] border-b border-[#1f2a3a] pb-1">Discover the Piece &rarr;</span>
              </div>
            </div>
          </div>

          {/* Row 2 (6-9) */}
          {row2.map(product => (
            <ProductCard key={product.id} product={product} isWishlisted={!!wishlist[product.id]} onWishlist={toggleWishlist} />
          ))}

          {/* Editorial Spread 2 (Reversed) */}
          <div className="col-span-4 flex flex-col md:flex-row-reverse bg-[#fcfbfa] border border-[#e8e1d6] my-8 group cursor-pointer">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-[16/10] md:aspect-auto">
              <img src={emeraldBracelet.image} alt={emeraldBracelet.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
            </div>
            <div className="w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-center relative text-right">
              <div className="absolute right-0 top-16 bottom-16 w-[1px] bg-[#d4af37]/30 hidden md:block"></div>
              <h3 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-[#1f2a3a] mb-6">Emerald Lore</h3>
              <p className="text-[#555] font-light leading-relaxed mb-4 ml-auto max-w-md">
                Sourced from the finest mines, the Devika bracelet features a continuous stream of matched emeralds, selected for their deep, verdant hue and flawless clarity.
              </p>
              <p className="text-[#555] font-light leading-relaxed mb-8 ml-auto max-w-md">
                In ancient traditions, the emerald is the gemstone of the goddess Venus, symbolizing enduring love and hope. Set in 18 karat gold, this contemporary classic brings ancient lore to the modern bride.
              </p>
              <div className="mt-auto">
                <span className="text-xs tracking-[0.2em] uppercase font-semibold text-[#1f2a3a] border-b border-[#1f2a3a] pb-1">Discover the Piece &rarr;</span>
              </div>
            </div>
          </div>

          {/* Row 3 (11-12) + Promo Cards */}
          {row3.map(product => (
            <ProductCard key={product.id} product={product} isWishlisted={!!wishlist[product.id]} onWishlist={toggleWishlist} />
          ))}
          
          {/* Promo Card 1 */}
          <div className="group cursor-pointer relative overflow-hidden aspect-[3/4] flex items-end p-6">
            <img src="https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&w=800&q=80" alt="Styled by our Atelier" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="relative z-10 w-full text-center">
              <h4 className="font-['Playfair_Display'] text-white text-xl mb-2">Styled by our Atelier</h4>
              <p className="text-white/80 text-xs tracking-widest uppercase border-b border-white/50 inline-block pb-1">View Lookbook</p>
            </div>
          </div>

          {/* Promo Card 2 */}
          <div className="bg-[#f4ede0] border border-[#e8e1d6] aspect-[3/4] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#efe5d2] transition-colors">
            <div className="w-12 h-[1px] bg-[#d4af37] mb-6"></div>
            <h4 className="font-['Playfair_Display'] text-[#1f2a3a] text-2xl mb-4">Bespoke Bridal Consultations</h4>
            <p className="text-[#555] text-sm mb-8 font-light">Book a private viewing with our senior bridal consultants.</p>
            <span className="text-xs tracking-[0.2em] uppercase font-semibold text-[#1f2a3a] border border-[#1f2a3a] px-6 py-3 hover:bg-[#1f2a3a] hover:text-white transition-colors">Book Now</span>
          </div>

        </div>
      </div>

      {/* Footer Band */}
      <footer className="bg-[#1f2a3a] text-white py-16 px-6 mt-20 border-t-4 border-[#d4af37]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-['Playfair_Display'] text-2xl lg:text-3xl font-light mb-6">Bridal Collection — A House Tradition Since 1962</h2>
          
          <div className="flex justify-center mb-10">
            <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0L23.5 6.5L30 3L26.5 9.5L40 7.5L28 12.5L32 15L20 12L8 15L12 12.5L0 7.5L13.5 9.5L10 3L16.5 6.5L20 0Z" fill="#d4af37"/>
            </svg>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[#a9b3c4] text-sm tracking-widest uppercase">
            <div>20+ Master Artisans</div>
            <div>60 Years of Heritage</div>
            <div>100% Hallmarked Gold</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ product, isWishlisted, onWishlist }: { product: Product, isWishlisted: boolean, onWishlist: (e: React.MouseEvent, id: string) => void }) {
  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[3/4] overflow-hidden bg-white mb-4 border border-[#e8e1d6]">
        {product.badge && (
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 text-[9px] uppercase tracking-widest text-[#1f2a3a] font-semibold">
            {product.badge}
          </div>
        )}
        
        <button 
          onClick={(e) => onWishlist(e, product.id)}
          className="absolute top-3 right-3 z-10 text-[#888] hover:text-[#c9949a] transition-colors p-2"
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#c9949a] text-[#c9949a]' : ''}`} strokeWidth={1.5} />
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <span className="bg-white px-4 py-2 text-[10px] tracking-[0.2em] text-[#333] uppercase shadow-sm">Out of Stock</span>
          </div>
        )}

        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.hoverImage && (
          <img 
            src={product.hoverImage} 
            alt={product.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-hover:scale-105"
          />
        )}
      </div>
      
      <div className="text-center px-2">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#333] mb-2">{product.name}</h3>
        <p className="font-['Playfair_Display'] text-[#d4af37] text-[15px]">{formatINR(product.price)}</p>
      </div>
    </div>
  );
}
