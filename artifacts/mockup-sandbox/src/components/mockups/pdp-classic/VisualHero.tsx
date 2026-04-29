import React, { useState } from 'react';
import { Star, Heart, Share2, Plus, Minus, ChevronDown, ChevronRight, Truck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

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

export function VisualHero() {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0].name);
  const [selectedLength, setSelectedLength] = useState(product.size_option.values[0]);
  const [selectedGiftWrap, setSelectedGiftWrap] = useState(product.add_on.values[0].label);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  const discountPercent = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);

  return (
    <div className="min-h-screen bg-[#faf6ef] text-[#2a2520] font-['Lora']">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-lora { font-family: 'Lora', serif; }
        
        /* Hide scrollbar for clean horizontal scroll */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Breadcrumb - Absolute positioned over hero or just above */}
      <div className="absolute top-0 left-0 w-full z-10 p-6 flex items-center text-sm text-[#2a2520]/70 font-lora">
        <span>Home</span>
        <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
        <span>{product.category}</span>
        <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
        <span>{product.subcategory}</span>
        <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
        <span className="text-[#2a2520]">{product.name}</span>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row min-h-[90vh]">
        {/* Left: Gallery (70%) */}
        <div className="w-full lg:w-[70%] relative flex flex-col h-[60vh] lg:h-auto lg:min-h-screen bg-[#f8f8f5]">
          {/* Main Image */}
          <div className="flex-1 relative overflow-hidden">
            <img 
              src={images[activeImage]} 
              alt={product.name}
              className="w-full h-full object-cover object-center absolute inset-0 transition-opacity duration-500"
            />
            {product.featured && (
              <div className="absolute top-20 left-6 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs tracking-widest uppercase font-lora text-[#603000] border border-[#B08C4C]/30 shadow-sm flex items-center gap-1.5 rounded-sm">
                <span className="text-[#d4af37]">✨</span> Featured
              </div>
            )}
          </div>
          
          {/* Thumbnails - overlayed at bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-white/50 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
            {images.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImage(i)}
                className={`w-16 h-20 rounded-md overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#B08C4C] shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info Panel (30%) */}
        <div className="w-full lg:w-[30%] lg:h-screen lg:sticky lg:top-0 flex flex-col bg-[#faf6ef] border-l border-[#B08C4C]/20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
          <div className="flex-1 overflow-y-auto px-8 py-20 hide-scrollbar flex flex-col">
            
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-playfair text-4xl lg:text-5xl text-[#2a2520] leading-tight mb-3">
                {product.name}
              </h1>
              <p className="text-[#888] font-lora text-sm italic mb-4 leading-relaxed">
                {product.short_description}
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-playfair text-3xl text-[#603000]">₹{product.price.toLocaleString('en-IN')}</span>
                  <span className="text-[#888] line-through text-lg">₹{product.compare_at_price.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-xs font-semibold bg-[#B08C4C]/10 text-[#B08C4C] px-2 py-1 rounded-sm uppercase tracking-wider">
                  {discountPercent}% OFF
                </span>
              </div>
            </div>

            {/* Reviews aggregate */}
            <a href="#reviews" className="flex items-center gap-2 mb-8 group cursor-pointer w-max">
              <div className="flex text-[#d4af37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.reviews.avg) ? 'fill-current' : 'fill-transparent'}`} />
                ))}
              </div>
              <span className="text-sm text-[#888] font-lora border-b border-transparent group-hover:border-[#888] transition-colors">
                {product.reviews.avg} ({product.reviews.total} reviews)
              </span>
            </a>

            <Separator className="bg-[#B08C4C]/20 mb-8" />

            {/* Options */}
            <div className="space-y-6 mb-8 flex-1">
              
              {/* Colors */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm uppercase tracking-widest text-[#2a2520] font-semibold">Color</span>
                  <span className="text-sm text-[#888] italic">{selectedColor}</span>
                </div>
                <div className="flex gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === color.name ? 'border-[#B08C4C] scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {selectedColor === color.name && <div className="w-1.5 h-1.5 bg-white rounded-full mix-blend-difference" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm uppercase tracking-widest text-[#2a2520] font-semibold">{product.size_option.name}</span>
                </div>
                <div className="flex gap-2">
                  {product.size_option.values.map(val => (
                    <button
                      key={val}
                      onClick={() => setSelectedLength(val)}
                      className={`px-4 py-2 text-sm border transition-all ${selectedLength === val ? 'border-[#603000] bg-[#603000] text-white' : 'border-[#B08C4C]/40 text-[#2a2520] hover:border-[#603000]'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gift Wrap */}
              <div>
                <span className="text-sm uppercase tracking-widest text-[#2a2520] font-semibold block mb-3">{product.add_on.name}</span>
                <div className="flex flex-col gap-2">
                  {product.add_on.values.map(val => (
                    <label key={val.label} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedGiftWrap === val.label ? 'border-[#603000]' : 'border-[#B08C4C]/50'}`}>
                        {selectedGiftWrap === val.label && <div className="w-2 h-2 rounded-full bg-[#603000]" />}
                      </div>
                      <input 
                        type="radio" 
                        name="giftwrap" 
                        value={val.label}
                        checked={selectedGiftWrap === val.label}
                        onChange={() => setSelectedGiftWrap(val.label)}
                        className="hidden"
                      />
                      <span className="text-sm text-[#2a2520] group-hover:text-[#603000] transition-colors">{val.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Actions (Sticky at bottom of panel) */}
            <div className="mt-auto pt-6 bg-gradient-to-t from-[#faf6ef] via-[#faf6ef] to-transparent">
              
              {/* Stock Urgency */}
              {product.stock <= product.low_stock_threshold && (
                <div className="flex items-center gap-2 mb-4 text-[#c9949a] text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-[#c9949a] animate-pulse" />
                  Only {product.stock} left in stock
                </div>
              )}

              <div className="flex gap-4 mb-4">
                {/* Qty */}
                <div className="flex items-center border border-[#B08C4C]/40">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-3 hover:bg-[#B08C4C]/10 text-[#603000]"><Minus className="w-4 h-4" /></button>
                  <span className="w-8 text-center text-sm font-medium">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-3 hover:bg-[#B08C4C]/10 text-[#603000]"><Plus className="w-4 h-4" /></button>
                </div>
                
                {/* Add to Cart */}
                <Button className="flex-1 bg-[#c9949a] hover:bg-[#b88389] text-white rounded-none h-auto py-3 text-sm tracking-widest uppercase font-semibold transition-colors">
                  Add to Cart
                </Button>
                
                {/* Wishlist */}
                <Button 
                  variant="outline" 
                  onClick={() => setWishlisted(!wishlisted)}
                  className={`rounded-none h-auto px-4 border-[#B08C4C]/40 hover:bg-[#B08C4C]/10 ${wishlisted ? 'text-[#c9949a] border-[#c9949a]' : 'text-[#603000]'}`}
                >
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Buy Now */}
              <Button className="w-full bg-[#c8b99a] hover:bg-[#b7a889] text-[#2a2520] rounded-none py-4 text-sm tracking-widest uppercase font-semibold transition-colors mb-6">
                Buy It Now
              </Button>

              {/* Quick Info Chips */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-[#888] font-lora border-t border-[#B08C4C]/20 pt-6">
                <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#B08C4C]" /> Free shipping &gt; ₹999</div>
                <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-[#B08C4C]" /> 10-day easy returns</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#B08C4C]" /> GST inclusive ({product.gst}%)</div>
                <div className="flex items-center gap-2 text-[#2a2520]/60 uppercase tracking-wider text-[10px]">
                  SKU: {product.sku}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Below the Fold Content */}
      <div className="max-w-5xl mx-auto px-6 py-24 space-y-32">
        
        {/* Description & Policies */}
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="font-playfair text-3xl text-[#2a2520] mb-8">The Details</h2>
            <div 
              className="prose prose-stone prose-p:text-[#666] prose-p:font-lora prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.description }} 
            />
            
            <div className="mt-8 flex gap-6 text-sm text-[#888] font-lora">
              <div><span className="text-[#2a2520] uppercase text-xs tracking-wider font-semibold block mb-1">Weight</span> {product.weight_g}g</div>
              <div><span className="text-[#2a2520] uppercase text-xs tracking-wider font-semibold block mb-1">Dimensions</span> {product.dims_cm.l} × {product.dims_cm.b} × {product.dims_cm.h} cm</div>
              <div><span className="text-[#2a2520] uppercase text-xs tracking-wider font-semibold block mb-1">HSN</span> {product.hsn}</div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#B08C4C]/20 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="shipping" className="border-[#B08C4C]/20">
                <AccordionTrigger className="hover:no-underline text-[#2a2520] font-playfair text-lg">Shipping & Delivery</AccordionTrigger>
                <AccordionContent className="text-[#666] font-lora leading-relaxed">
                  {product.policies.shipping}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="returns" className="border-[#B08C4C]/20">
                <AccordionTrigger className="hover:no-underline text-[#2a2520] font-playfair text-lg">Returns & Exchange</AccordionTrigger>
                <AccordionContent className="text-[#666] font-lora leading-relaxed">
                  {product.policies.returns}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="care" className="border-b-0">
                <AccordionTrigger className="hover:no-underline text-[#2a2520] font-playfair text-lg">Care Guide</AccordionTrigger>
                <AccordionContent className="text-[#666] font-lora leading-relaxed">
                  {product.policies.care}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" className="scroll-mt-32">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-6 border-b border-[#B08C4C]/20">
            <div>
              <h2 className="font-playfair text-3xl text-[#2a2520] mb-4">Customer Reviews</h2>
              <div className="flex items-center gap-4">
                <div className="flex text-[#d4af37]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-6 h-6 ${i < Math.floor(product.reviews.avg) ? 'fill-current' : 'fill-transparent'}`} />
                  ))}
                </div>
                <span className="font-playfair text-2xl">{product.reviews.avg}</span>
                <span className="text-[#888] font-lora">Based on {product.reviews.total} reviews</span>
              </div>
            </div>
            <Button variant="outline" className="rounded-none border-[#B08C4C] text-[#603000] hover:bg-[#B08C4C]/10 uppercase tracking-widest text-xs mt-6 md:mt-0">
              Write a Review
            </Button>
          </div>

          <div className="grid md:grid-cols-[1fr_2fr] gap-16">
            {/* Rating Breakdown */}
            <div>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = product.reviews.breakdown[star as keyof typeof product.reviews.breakdown];
                  const percent = (count / product.reviews.total) * 100;
                  return (
                    <div key={star} className="flex items-center gap-3 text-sm font-lora">
                      <span className="w-12 text-[#888]">{star} stars</span>
                      <div className="flex-1 h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4af37]" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-8 text-right text-[#888]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review Cards */}
            <div className="space-y-8">
              {product.reviews.items.map((review, i) => (
                <div key={i} className="pb-8 border-b border-[#e5e5e5] last:border-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#2a2520]">{review.author}</span>
                        {review.verified && (
                          <span className="text-[10px] uppercase tracking-wider text-[#603000] bg-[#603000]/10 px-1.5 py-0.5 rounded-sm">Verified</span>
                        )}
                      </div>
                      <div className="flex text-[#d4af37] mb-1">
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} className={`w-3 h-3 ${idx < review.rating ? 'fill-current' : 'fill-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-[#888] font-lora">{review.date}</span>
                  </div>
                  <p className="text-[#666] font-lora italic leading-relaxed text-sm">"{review.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h2 className="font-playfair text-3xl text-[#2a2520] mb-10 text-center">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {product.related.map((item, i) => (
              <a href={`#${item.name}`} key={i} className="group block">
                <div className="relative aspect-[4/5] mb-4 overflow-hidden bg-stone-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs uppercase tracking-widest font-semibold border-b border-white pb-0.5">Quick View</span>
                  </div>
                </div>
                <h3 className="font-playfair text-lg text-[#2a2520] mb-1 truncate">{item.name}</h3>
                <div className="flex items-baseline gap-2 font-lora text-sm">
                  <span className="text-[#603000]">₹{item.price.toLocaleString('en-IN')}</span>
                  {item.compare_at_price && (
                    <span className="text-[#888] line-through text-xs">₹{item.compare_at_price.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
