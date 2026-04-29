import React, { useState } from "react";
import { Star, Heart, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

const product = {
  name: "Aanya Temple Necklace",
  short_description: "Hand-crafted 22kt gold-plated temple necklace with green meena work",
  description: `<p>An heirloom piece inspired by South Indian temple jewellery,
    the Aanya necklace features intricate goddess motifs framed by hand-set
    green meenakari enamel and uncut stone accents.</p>
    <p>Each piece is hand-finished by artisans in Jaipur over 4–5 days.
    Plated in 22kt gold over a sterling silver base for lasting shine.</p>
    <p>Perfect for weddings, festive occasions, and statement evening looks.</p>`,
  price: 4899,
  compare_at_price: 6200,
  sku: "AANYA-22KT-001",
  category: "Jewellery", subcategory: "Necklaces",
  tags: ["temple", "festive", "bridal"],
  weight_g: 28, dims_cm: {l: 22, b: 14, h: 2},
  hsn: "7113", gst: 3,
  stock: 7, low_stock_threshold: 10,
  featured: true,
  colors: [
    {name: "Antique Gold", hex: "#B08C4C"},
    {name: "Rose Gold",    hex: "#B76E79"},
    {name: "Silver Oxide", hex: "#9AA0A6"},
  ],
  size_option: { name: "Length", values: ["16 in", "18 in", "20 in"] },
  add_on: { name: "Gift Wrap", values: [{label: "None", delta: 0}, {label: "Premium box +₹149", delta: 149}] },
  reviews: {
    avg: 4.7, total: 142,
    breakdown: { 5: 102, 4: 28, 3: 8, 2: 3, 1: 1 },
    items: [
      { author: "Priya S.", rating: 5, verified: true, date: "Mar 2026",
        text: "Stunning piece! The meenakari detailing is even more beautiful in person. Wore it to my sister's wedding and got endless compliments." },
      { author: "Rhea M.",  rating: 5, verified: true, date: "Feb 2026",
        text: "Quality far exceeded the price. Packaging was lovely too." },
      { author: "Anita K.", rating: 4, verified: false, date: "Jan 2026",
        text: "Beautiful but slightly heavy for long wear. Worth it for special occasions." },
    ],
  },
  policies: {
    shipping: "Free shipping on orders above ₹999. Dispatched within 2 business days. Pan-India delivery in 3–7 days.",
    returns:  "Easy 10-day returns. Free reverse pickup. Refunded to original payment method within 5 working days.",
    care:     "Wipe with a soft, dry cloth. Avoid contact with water, perfume, and lotions. Store in the provided pouch."
  },
  related: [
    { name: "Meher Jhumka Earrings",   price: 2499, compare_at_price: 3100, image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600&q=80" },
    { name: "Gulnaz Choker",           price: 5899, compare_at_price: null,  image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80" },
    { name: "Riya Ring",               price: 1299, compare_at_price: 1599, image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&q=80" },
    { name: "Nayra Maang Tikka",       price: 1899, compare_at_price: null,  image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&q=80" },
  ],
};

const images = [
  "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1400&q=85",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1400&q=85",
  "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1400&q=85",
  "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=1400&q=85",
  "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1400&q=85",
];

const AccordionItem = ({ title, content }: { title: string; content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#d4af37]/30 py-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-[#2a2520] font-medium">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-[#B08C4C]" /> : <ChevronDown className="w-4 h-4 text-[#B08C4C]" />}
      </button>
      {isOpen && (
        <div className="mt-4 font-['Lora'] text-[#5a5550] text-sm leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
};

export function EditorialClassic() {
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0].name);
  const [selectedSize, setSelectedSize] = useState(product.size_option.values[0]);
  const [giftWrap, setGiftWrap] = useState(product.add_on.values[0]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discountPercent = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);

  return (
    <div className="min-h-screen bg-[#faf6ef] text-[#2a2520] selection:bg-[#B08C4C]/20 font-['Lora']">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        
        .prose-custom p {
          margin-bottom: 1.5em;
          line-height: 1.8;
          font-size: 1.125rem;
          color: #4a4540;
        }
        .prose-custom p:first-child::first-letter {
          font-family: 'Playfair Display', serif;
          font-size: 3.5rem;
          float: left;
          line-height: 0.8;
          padding-right: 0.15em;
          color: #B08C4C;
        }
      `}} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12 md:py-24">
        
        {/* Breadcrumb & Top Meta */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 text-xs tracking-widest uppercase text-[#888] space-y-4 md:space-y-0">
          <nav className="flex space-x-2">
            <a href="#" className="hover:text-[#B08C4C] transition-colors">Home</a>
            <span>›</span>
            <a href="#" className="hover:text-[#B08C4C] transition-colors">{product.category}</a>
            <span>›</span>
            <span className="text-[#2a2520]">{product.subcategory}</span>
          </nav>
          {product.featured && (
            <div className="flex items-center space-x-1 text-[#B08C4C]">
              <span>✨</span>
              <span>Featured Edition</span>
            </div>
          )}
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-32">
          
          {/* Gallery */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-6">
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-visible order-2 md:order-1 hide-scrollbar">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setMainImageIdx(idx)}
                  className={`flex-shrink-0 w-20 h-28 relative overflow-hidden transition-all duration-500 ${mainImageIdx === idx ? 'ring-1 ring-[#B08C4C] ring-offset-2 ring-offset-[#faf6ef] opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
            <div className="flex-1 order-1 md:order-2">
              <div className="aspect-[3/4] w-full overflow-hidden bg-[#f0ebe1]">
                <img 
                  src={images[mainImageIdx]} 
                  alt={product.name} 
                  className="w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out"
                />
              </div>
            </div>
          </div>

          {/* Buy Module */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            
            <div className="mb-10 text-center lg:text-left">
              <a href="#reviews" className="inline-flex items-center space-x-2 text-sm text-[#888] mb-6 hover:text-[#B08C4C] transition-colors group">
                <div className="flex text-[#d4af37]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.reviews.avg) ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="group-hover:underline underline-offset-4">{product.reviews.avg} ({product.reviews.total} Reviews)</span>
              </a>

              <h1 className="font-['Playfair_Display'] text-4xl lg:text-5xl leading-tight mb-4 text-[#2a2520]">{product.name}</h1>
              <p className="text-lg text-[#5a5550] italic font-light mb-8 max-w-md mx-auto lg:mx-0">{product.short_description}</p>
              
              <div className="flex items-end justify-center lg:justify-start space-x-4 mb-2">
                <span className="text-3xl font-light text-[#2a2520]">₹{product.price.toLocaleString('en-IN')}</span>
                {product.compare_at_price && (
                  <>
                    <span className="text-lg text-[#888] line-through mb-1">₹{product.compare_at_price.toLocaleString('en-IN')}</span>
                    <span className="text-sm font-medium text-[#B08C4C] mb-1.5">{discountPercent}% OFF</span>
                  </>
                )}
              </div>
              <div className="text-xs text-[#888] uppercase tracking-wider mb-10">Incl. of all taxes</div>
            </div>

            <div className="space-y-8">
              
              {/* Colors */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm tracking-widest uppercase text-[#5a5550]">Finish</span>
                  <span className="text-sm italic text-[#888]">{selectedColor}</span>
                </div>
                <div className="flex space-x-4">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedColor === color.name ? 'ring-1 ring-[#2a2520] ring-offset-4 ring-offset-[#faf6ef]' : 'ring-1 ring-transparent hover:ring-[#888] ring-offset-2'}`}
                    >
                      <span className="w-full h-full rounded-full shadow-inner" style={{ backgroundColor: color.hex }}></span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm tracking-widest uppercase text-[#5a5550]">{product.size_option.name}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.size_option.values.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-6 py-2 text-sm transition-colors border ${selectedSize === size ? 'border-[#2a2520] text-[#2a2520] bg-transparent' : 'border-transparent bg-[#f0ebe1] text-[#5a5550] hover:border-[#d4af37]'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gift Wrap */}
              <div className="pt-4 border-t border-[#d4af37]/20">
                <span className="block text-sm tracking-widest uppercase text-[#5a5550] mb-4">{product.add_on.name}</span>
                <div className="flex flex-col space-y-3">
                  {product.add_on.values.map((opt, i) => (
                    <label key={i} className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${giftWrap.label === opt.label ? 'border-[#B08C4C]' : 'border-[#888] group-hover:border-[#B08C4C]'}`}>
                        {giftWrap.label === opt.label && <div className="w-2 h-2 rounded-full bg-[#B08C4C]" />}
                      </div>
                      <span className="text-sm text-[#5a5550]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity & Stock */}
              <div className="flex items-center justify-between pt-4 border-t border-[#d4af37]/20">
                <div className="flex items-center border border-[#d4af37]/40">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 text-[#5a5550] hover:text-[#B08C4C] transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="w-12 text-center font-light">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-3 text-[#5a5550] hover:text-[#B08C4C] transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                {product.stock <= product.low_stock_threshold && (
                  <span className="text-sm italic text-[#888]">Only {product.stock} left</span>
                )}
              </div>

              {/* Actions */}
              <div className="pt-6 space-y-4">
                <div className="flex space-x-4">
                  <button className="flex-1 bg-[#c9949a] text-white py-4 px-8 text-sm tracking-widest uppercase hover:bg-[#b88389] transition-colors">
                    Add to Cart
                  </button>
                  <button 
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="w-14 flex items-center justify-center border border-[#c9949a] text-[#c9949a] hover:bg-[#c9949a] hover:text-white transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <button className="w-full bg-[#c8b99a] text-[#2a2520] py-4 px-8 text-sm tracking-widest uppercase hover:bg-[#b7a889] transition-colors">
                  Buy Now
                </button>
              </div>

              {/* Meta */}
              <div className="pt-8 text-xs text-[#888] flex justify-between uppercase tracking-widest">
                <span>SKU: {product.sku}</span>
                <span>{product.category}</span>
              </div>

              {/* Accordions */}
              <div className="pt-8 border-t border-[#d4af37]/40">
                <AccordionItem title="Shipping & Delivery" content={product.policies.shipping} />
                <AccordionItem title="Returns & Exchange" content={product.policies.returns} />
                <AccordionItem title="Care Guide" content={product.policies.care} />
              </div>

            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="py-24 border-y border-[#d4af37]/30 mb-24 max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-3xl italic text-[#B08C4C]">The Story</h2>
            <div className="w-px h-16 bg-[#B08C4C]/40 mx-auto mt-8"></div>
          </div>
          <div 
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: product.description }} 
          />
          <div className="flex flex-wrap gap-3 mt-12 justify-center">
            {product.tags.map(tag => (
              <span key={tag} className="text-xs uppercase tracking-widest text-[#888] border border-[#d4af37]/20 px-4 py-1.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" className="mb-32">
          <h2 className="font-['Playfair_Display'] text-3xl text-center mb-16">Press & Praise</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24">
            <div className="md:col-span-4 lg:col-span-3">
              <div className="sticky top-12">
                <div className="text-6xl font-['Playfair_Display'] mb-2">{product.reviews.avg}</div>
                <div className="flex text-[#d4af37] mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.reviews.avg) ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <div className="text-sm text-[#888] uppercase tracking-widest mb-8">{product.reviews.total} Reviews</div>
                
                <div className="space-y-3 mb-10">
                  {[5,4,3,2,1].map(star => {
                    const count = product.reviews.breakdown[star as keyof typeof product.reviews.breakdown];
                    const pct = (count / product.reviews.total) * 100;
                    return (
                      <div key={star} className="flex items-center text-xs text-[#888]">
                        <span className="w-4">{star}</span>
                        <Star className="w-3 h-3 ml-1 mr-3 text-[#d4af37] fill-current" />
                        <div className="flex-1 h-px bg-[#d4af37]/20 relative">
                          <div className="absolute left-0 top-0 h-full bg-[#B08C4C]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
                
                <button className="w-full border border-[#2a2520] text-[#2a2520] py-3 text-sm tracking-widest uppercase hover:bg-[#2a2520] hover:text-white transition-colors">
                  Write a Review
                </button>
              </div>
            </div>
            
            <div className="md:col-span-8 lg:col-span-9 space-y-12">
              {product.reviews.items.map((review, i) => (
                <div key={i} className="pb-12 border-b border-[#d4af37]/20 last:border-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-['Playfair_Display'] text-lg mb-1">{review.author}</div>
                      <div className="text-xs text-[#888] flex items-center space-x-2">
                        <span>{review.date}</span>
                        {review.verified && (
                          <>
                            <span>•</span>
                            <span className="uppercase tracking-widest text-[#B08C4C]">Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex text-[#d4af37]">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className={`w-4 h-4 ${idx < review.rating ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#5a5550] leading-relaxed italic">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h2 className="font-['Playfair_Display'] text-3xl text-center mb-16 italic text-[#5a5550]">From the same atelier</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
            {product.related.map((item, i) => {
              const relDiscount = item.compare_at_price 
                ? Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100) 
                : 0;
              return (
                <a href="#" key={i} className="group block">
                  <div className="aspect-[3/4] overflow-hidden bg-[#f0ebe1] mb-6">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-['Playfair_Display'] text-lg mb-2 text-[#2a2520]">{item.name}</h3>
                    <div className="flex items-center justify-center space-x-3">
                      <span className="text-[#2a2520]">₹{item.price.toLocaleString('en-IN')}</span>
                      {item.compare_at_price && (
                        <span className="text-sm text-[#888] line-through">₹{item.compare_at_price.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
