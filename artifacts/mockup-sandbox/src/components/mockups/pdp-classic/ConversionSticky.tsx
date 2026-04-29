import React, { useState, useRef, useEffect } from "react";
import { Star, Heart, Plus, Minus, ShieldCheck, Truck, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  category: "Jewellery",
  subcategory: "Necklaces",
  tags: ["temple", "festive", "bridal"],
  weight_g: 28,
  dims_cm: { l: 22, b: 14, h: 2 },
  hsn: "7113",
  gst: 3,
  stock: 7,
  low_stock_threshold: 10,
  featured: true,
  colors: [
    { name: "Antique Gold", hex: "#B08C4C" },
    { name: "Rose Gold", hex: "#B76E79" },
    { name: "Silver Oxide", hex: "#9AA0A6" },
  ],
  size_option: { name: "Length", values: ["16 in", "18 in", "20 in"] },
  add_on: {
    name: "Gift Wrap",
    values: [
      { label: "None", delta: 0 },
      { label: "Premium box +₹149", delta: 149 },
    ],
  },
  reviews: {
    avg: 4.7,
    total: 142,
    breakdown: { 5: 102, 4: 28, 3: 8, 2: 3, 1: 1 },
    items: [
      {
        author: "Priya S.",
        rating: 5,
        verified: true,
        date: "Mar 2026",
        text: "Stunning piece! The meenakari detailing is even more beautiful in person. Wore it to my sister's wedding and got endless compliments.",
      },
      {
        author: "Rhea M.",
        rating: 5,
        verified: true,
        date: "Feb 2026",
        text: "Quality far exceeded the price. Packaging was lovely too.",
      },
      {
        author: "Anita K.",
        rating: 4,
        verified: false,
        date: "Jan 2026",
        text: "Beautiful but slightly heavy for long wear. Worth it for special occasions.",
      },
    ],
  },
  policies: {
    shipping: "Free shipping on orders above ₹999. Dispatched within 2 business days. Pan-India delivery in 3–7 days.",
    returns: "Easy 10-day returns. Free reverse pickup. Refunded to original payment method within 5 working days.",
    care: "Wipe with a soft, dry cloth. Avoid contact with water, perfume, and lotions. Store in the provided pouch.",
  },
  related: [
    { name: "Meher Jhumka Earrings", price: 2499, compare_at_price: 3100, image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600&q=80" },
    { name: "Gulnaz Choker", price: 5899, compare_at_price: null, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80" },
    { name: "Riya Ring", price: 1299, compare_at_price: 1599, image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&q=80" },
    { name: "Nayra Maang Tikka", price: 1899, compare_at_price: null, image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&q=80" },
  ],
};

const images = [
  "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1400&q=85",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1400&q=85",
  "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1400&q=85",
  "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=1400&q=85",
  "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1400&q=85",
];

export function ConversionSticky() {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0].name);
  const [selectedSize, setSelectedSize] = useState(product.size_option.values[1]);
  const [quantity, setQuantity] = useState(1);
  const [giftWrap, setGiftWrap] = useState("None");
  const [wishlisted, setWishlisted] = useState(false);

  const discountPercent = Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);

  const additionalPrice = product.add_on.values.find((v) => v.label === giftWrap)?.delta || 0;
  const totalPrice = product.price + additionalPrice;

  return (
    <div className="min-h-[100dvh] bg-[#faf6ef] text-[#2a2520] font-['Lora'] pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-lora { font-family: 'Lora', serif; }
        
        /* Hide scrollbar for gallery thumbnails */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6">
        {/* Breadcrumb */}
        <nav className="flex items-center text-xs text-[#888] mb-6 tracking-wide">
          <span className="hover:text-[#603000] cursor-pointer transition-colors">Home</span>
          <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
          <span className="hover:text-[#603000] cursor-pointer transition-colors">{product.category}</span>
          <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
          <span className="hover:text-[#603000] cursor-pointer transition-colors">{product.subcategory}</span>
          <ChevronRight className="w-3 h-3 mx-2 opacity-50" />
          <span className="text-[#2a2520]">{product.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-start">
          
          {/* LEFT: Gallery (55%) */}
          <div className="w-full lg:w-[55%] flex gap-4 sticky top-6">
            {/* Thumbnails */}
            <div className="hidden md:flex flex-col gap-3 w-20 shrink-0 max-h-[80vh] overflow-y-auto hide-scrollbar">
              {images.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-[3/4] overflow-hidden rounded transition-all duration-200 ${activeImage === i ? 'ring-2 ring-[#603000] ring-offset-2 ring-offset-[#faf6ef]' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt={`Thumbnail ${i+1}`} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
            
            {/* Main Image */}
            <div className="flex-1 relative aspect-[3/4] rounded-lg overflow-hidden bg-white/50">
              {product.featured && (
                <Badge className="absolute top-4 left-4 z-10 bg-white/90 text-[#603000] hover:bg-white border border-[#603000]/20 font-medium tracking-wide shadow-sm rounded-sm">
                  ✨ Featured
                </Badge>
              )}
              <img 
                src={images[activeImage]} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setWishlisted(!wishlisted)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm text-[#2a2520] hover:text-[#c9949a] transition-colors"
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-[#c9949a] text-[#c9949a]' : ''}`} />
              </button>
            </div>
          </div>

          {/* RIGHT: Sticky Buy Panel (45%) */}
          <div className="w-full lg:w-[45%] flex flex-col pt-2 lg:sticky lg:top-6">
            
            <div className="flex flex-col mb-8">
              {/* Trust signals & rating */}
              <div className="flex items-center gap-3 mb-3">
                <a href="#reviews" className="flex items-center gap-1 group">
                  <div className="flex items-center text-[#d4af37]">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-sm font-medium ml-1 border-b border-transparent group-hover:border-[#2a2520] transition-colors">{product.reviews.avg}</span>
                  <span className="text-xs text-[#888]">({product.reviews.total} reviews)</span>
                </a>
                <span className="text-[#888] text-xs">•</span>
                <span className="text-xs text-[#888]">SKU: {product.sku}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-playfair font-semibold leading-tight mb-2 text-[#603000]">
                {product.name}
              </h1>
              
              <p className="text-sm text-[#603000]/80 leading-relaxed max-w-md">
                {product.short_description}
              </p>
            </div>

            {/* Price & Urgency */}
            <div className="bg-white/60 p-5 rounded-lg border border-[#603000]/10 mb-8 shadow-sm">
              <div className="flex items-end gap-3 mb-1">
                <span className="text-3xl font-semibold font-playfair tracking-tight">₹{totalPrice.toLocaleString('en-IN')}</span>
                <span className="text-[#888] line-through text-lg mb-1">₹{product.compare_at_price.toLocaleString('en-IN')}</span>
                <Badge className="bg-[#b08c4c]/10 text-[#b08c4c] border-none font-semibold mb-1 hover:bg-[#b08c4c]/20">
                  {discountPercent}% OFF
                </Badge>
              </div>
              <p className="text-xs text-[#888] mb-4">Inclusive of all taxes (GST {product.gst}%)</p>

              {product.stock <= product.low_stock_threshold && (
                <div className="flex items-center gap-2 text-sm text-[#b08c4c] bg-[#b08c4c]/5 py-2 px-3 rounded inline-flex font-medium border border-[#b08c4c]/20">
                  <div className="w-2 h-2 rounded-full bg-[#b08c4c] animate-pulse" />
                  ✓ In stock — Only {product.stock} left
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-6 mb-8">
              {/* Colors */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold tracking-wide uppercase">Color</span>
                  <span className="text-sm text-[#888]">{selectedColor}</span>
                </div>
                <div className="flex gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none transition-all ${selectedColor === color.name ? 'border-[#603000] scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Size / Length */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold tracking-wide uppercase">{product.size_option.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.size_option.values.map(val => (
                    <button
                      key={val}
                      onClick={() => setSelectedSize(val)}
                      className={`px-4 py-2 border text-sm font-medium transition-all ${
                        selectedSize === val 
                          ? 'border-[#603000] bg-[#603000] text-white' 
                          : 'border-[#603000]/20 bg-white/50 text-[#2a2520] hover:border-[#603000]/60'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gift Wrap */}
              <div>
                <span className="text-sm font-semibold tracking-wide uppercase block mb-3">Add-ons</span>
                <RadioGroup value={giftWrap} onValueChange={setGiftWrap} className="gap-2">
                  {product.add_on.values.map((option, idx) => (
                    <div key={idx} className={`flex items-center space-x-3 p-3 rounded border transition-colors ${giftWrap === option.label ? 'border-[#603000] bg-white/80' : 'border-[#603000]/10 bg-white/30 hover:border-[#603000]/30'}`}>
                      <RadioGroupItem value={option.label} id={`wrap-${idx}`} className="text-[#603000] border-[#603000]/40" />
                      <Label htmlFor={`wrap-${idx}`} className="flex-1 cursor-pointer text-sm font-medium">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Quantity */}
              <div>
                <span className="text-sm font-semibold tracking-wide uppercase block mb-3">Quantity</span>
                <div className="inline-flex items-center border border-[#603000]/20 bg-white/50 rounded h-11">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 h-full hover:bg-black/5 transition-colors text-[#888] hover:text-[#2a2520]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 h-full hover:bg-black/5 transition-colors text-[#888] hover:text-[#2a2520]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 mb-6">
              <Button className="w-full h-14 bg-[#c8b99a] hover:bg-[#b5a585] text-[#2a2520] font-semibold text-lg font-playfair tracking-wide rounded shadow-sm transition-all hover:shadow">
                Buy Now
              </Button>
              <Button variant="outline" className="w-full h-14 border-[#603000] text-[#603000] hover:bg-[#603000]/5 font-semibold tracking-wide rounded">
                Add to Cart
              </Button>
            </div>

            {/* Trust Mini-bar */}
            <div className="flex items-center justify-center gap-4 py-3 border-t border-b border-[#603000]/10 text-xs text-[#603000]/80">
              <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-[#c8b99a]" /> Free shipping above ₹999</div>
              <span>·</span>
              <div className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-[#c8b99a]" /> 10-day returns</div>
            </div>
            
            {/* Accordions */}
            <div className="mt-8">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shipping" className="border-[#603000]/10">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline hover:text-[#603000]">Shipping & Delivery</AccordionTrigger>
                  <AccordionContent className="text-[#888] leading-relaxed">
                    {product.policies.shipping}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns" className="border-[#603000]/10">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline hover:text-[#603000]">Returns & Exchange</AccordionTrigger>
                  <AccordionContent className="text-[#888] leading-relaxed">
                    {product.policies.returns}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="care" className="border-[#603000]/10">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline hover:text-[#603000]">Care Guide</AccordionTrigger>
                  <AccordionContent className="text-[#888] leading-relaxed">
                    {product.policies.care}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

          </div>
        </div>

        {/* Below the fold - Description & Reviews (Clean Single Column) */}
        <div className="mt-24 max-w-3xl border-t border-[#603000]/10 pt-16">
          <div className="mb-20">
            <h2 className="text-2xl font-playfair font-semibold text-[#603000] mb-6">Product Details</h2>
            <div 
              className="prose prose-stone prose-p:text-[#603000]/80 prose-p:leading-relaxed max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }} 
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 p-6 bg-white/50 rounded-lg border border-[#603000]/5">
              <div>
                <span className="text-xs text-[#888] uppercase tracking-wider block mb-1">Material</span>
                <span className="text-sm font-medium">22kt Gold Plated</span>
              </div>
              <div>
                <span className="text-xs text-[#888] uppercase tracking-wider block mb-1">Weight</span>
                <span className="text-sm font-medium">{product.weight_g}g</span>
              </div>
              <div>
                <span className="text-xs text-[#888] uppercase tracking-wider block mb-1">Dimensions</span>
                <span className="text-sm font-medium">{product.dims_cm.l}x{product.dims_cm.b} cm</span>
              </div>
              <div>
                <span className="text-xs text-[#888] uppercase tracking-wider block mb-1">Tags</span>
                <span className="text-sm font-medium capitalize">{product.tags.join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div id="reviews" className="mb-24 scroll-mt-24">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12 border-b border-[#603000]/10 pb-12">
              <div className="flex-shrink-0 w-full md:w-64">
                <h2 className="text-2xl font-playfair font-semibold text-[#603000] mb-2">Customer Reviews</h2>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl font-playfair font-medium text-[#2a2520]">{product.reviews.avg}</span>
                  <div className="pb-1 text-[#888] text-sm">out of 5</div>
                </div>
                <div className="flex text-[#d4af37] mb-2">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-sm text-[#888] mb-6">Based on {product.reviews.total} reviews</p>
                <Button variant="outline" className="w-full border-[#603000] text-[#603000] hover:bg-[#603000]/5">
                  Write a review
                </Button>
              </div>
              
              <div className="flex-1 w-full flex flex-col gap-2 pt-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = product.reviews.breakdown[rating as keyof typeof product.reviews.breakdown];
                  const percent = (count / product.reviews.total) * 100;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12 text-sm text-[#888]">
                        {rating} <Star className="w-3 h-3 fill-current" />
                      </div>
                      <Progress value={percent} className="h-2 bg-[#603000]/10 [&>div]:bg-[#b08c4c]" />
                      <span className="text-xs text-[#888] w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {product.reviews.items.map((review, i) => (
                <div key={i} className="bg-white/60 p-6 rounded-lg border border-[#603000]/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <Avatar className="h-10 w-10 border border-[#603000]/10 bg-[#faf6ef]">
                        <AvatarFallback className="bg-transparent text-[#603000] font-playfair">{review.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{review.author}</span>
                          {review.verified && (
                            <span className="flex items-center text-[10px] uppercase tracking-wider text-[#b08c4c] font-medium bg-[#b08c4c]/10 px-1.5 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="flex text-[#d4af37] mr-2">
                            {Array.from({length: 5}).map((_, idx) => (
                              <Star key={idx} className={`w-3 h-3 ${idx < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-[#888]">{review.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[#603000]/80 text-sm leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <Button variant="link" className="text-[#603000] border-none shadow-none hover:bg-transparent hover:underline">
                View all {product.reviews.total} reviews
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-20 pt-16 border-t border-[#603000]/10 pb-20">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-playfair font-semibold text-[#603000]">You May Also Like</h2>
            <a href="#" className="text-sm font-medium text-[#603000] hover:underline underline-offset-4 pb-1">Shop All</a>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {product.related.map((item, i) => (
              <a key={i} href="#" className="group flex flex-col gap-3">
                <div className="relative aspect-[3/4] overflow-hidden rounded bg-white/50">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {item.compare_at_price && (
                    <Badge className="absolute top-2 left-2 bg-[#b08c4c] text-white border-none font-medium shadow-none rounded-sm px-1.5 py-0 text-[10px]">
                      Sale
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-playfair font-medium text-[#2a2520] group-hover:text-[#b08c4c] transition-colors line-clamp-1">{item.name}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="font-semibold text-sm">₹{item.price.toLocaleString('en-IN')}</span>
                    {item.compare_at_price && (
                      <span className="text-[#888] line-through text-xs">₹{item.compare_at_price.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
