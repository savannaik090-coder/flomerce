import React, { useState } from 'react';
import { ShoppingBag, Minus, Plus, Tag, ChevronRight } from 'lucide-react';

export function LinenGold() {
  const [quantities, setQuantities] = useState<Record<number, number>>({ 1: 1, 2: 2 });
  const [couponCode, setCouponCode] = useState('');

  const updateQuantity = (id: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const cartItems = [
    {
      id: 1,
      name: "Silk Blend Camisole",
      variant: "Ivory • Size M",
      price: 125.00
    },
    {
      id: 2,
      name: "Cashmere Lounge Set",
      variant: "Oatmeal • Size S",
      price: 295.00
    }
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * (quantities[item.id] || 1)), 0);

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#5C4032] font-['Lora'] selection:bg-[#C8960C] selection:text-white">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#C8960C]">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <h1 className="font-['Playfair_Display'] text-2xl tracking-wide text-[#1A0F0A]">Harini Collective</h1>
        </div>
      </header>

      {/* Step Wizard */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-[#E8DDD0] z-0"></div>
          
          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-3 bg-[#FAFAF7] px-4">
            <div className="w-8 h-8 rounded-full bg-[#C8960C] text-white flex items-center justify-center font-semibold text-sm">1</div>
            <span className="font-['Lora'] uppercase tracking-widest text-xs text-[#1A0F0A] font-medium">1 · Cart</span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-3 bg-[#FAFAF7] px-4">
            <div className="w-8 h-8 rounded-full bg-white border border-[#E8DDD0] text-[#5C4032] flex items-center justify-center font-semibold text-sm">2</div>
            <span className="font-['Lora'] uppercase tracking-widest text-xs text-[#5C4032]">2 · Details</span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-3 bg-[#FAFAF7] px-4">
            <div className="w-8 h-8 rounded-full bg-white border border-[#E8DDD0] text-[#5C4032] flex items-center justify-center font-semibold text-sm">3</div>
            <span className="font-['Lora'] uppercase tracking-widest text-xs text-[#5C4032]">3 · Payment</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 lg:flex lg:gap-12 lg:items-start">
        
        {/* Left Column - Cart Review */}
        <div className="lg:w-[60%] space-y-8">
          <div className="border-l-[3px] border-[#C8960C] pl-4 py-1">
            <h2 className="font-['Playfair_Display'] text-3xl text-[#1A0F0A]">Your Cart</h2>
          </div>

          <div className="bg-white rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8DDD0] p-6 space-y-6">
            
            <div className="space-y-6">
              {cartItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <div className="flex gap-6 items-start">
                    {/* Thumbnail Placeholder */}
                    <div className="w-24 h-24 shrink-0 bg-[#F0E6D8] rounded-sm flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-[#C8960C]" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-h-[6rem]">
                      <div className="flex justify-between gap-4">
                        <div>
                          <h3 className="font-['Playfair_Display'] text-lg text-[#1A0F0A]">{item.name}</h3>
                          <p className="text-sm text-[#5C4032] mt-1">{item.variant}</p>
                        </div>
                        <p className="text-right font-medium text-[#1A0F0A]">${(item.price * (quantities[item.id] || 1)).toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-4 mt-auto">
                        <div className="flex items-center border border-[#E8DDD0] rounded-full p-0.5 w-24">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F0E6D8] text-[#5C4032] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center text-sm font-medium">{quantities[item.id] || 1}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F0E6D8] text-[#5C4032] transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button className="text-xs underline text-[#5C4032] hover:text-[#C8960C] transition-colors">Remove</button>
                      </div>
                    </div>
                  </div>
                  
                  {index < cartItems.length - 1 && (
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#C8960C]/20 to-transparent"></div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-6 border-t border-[#E8DDD0]">
              <div className="flex justify-between items-center mb-8">
                <span className="text-[#1A0F0A] font-medium text-lg">Subtotal</span>
                <span className="font-['Playfair_Display'] text-xl text-[#1A0F0A]">${subtotal.toFixed(2)}</span>
              </div>

              <div className="text-center">
                <button className="bg-[#4A2E17] hover:bg-[#3A2411] text-[#FEFCF7] font-['Playfair_Display'] text-lg px-10 py-4 rounded-sm transition-all duration-300 w-full md:w-auto inline-flex items-center justify-center gap-2 group shadow-md hover:shadow-lg">
                  Continue to Details
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Sticky Order Summary */}
        <div className="lg:w-[40%] mt-12 lg:mt-0 lg:sticky lg:top-8">
          <div className="bg-white rounded-sm shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-[#E8DDD0] border-t-[1px] border-t-[#C8960C] p-6 space-y-6">
            <h2 className="font-['Playfair_Display'] text-2xl text-[#1A0F0A] pb-4 border-b border-[#E8DDD0]">Order Summary</h2>
            
            <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex gap-2">
                    <span className="text-[#5C4032]">{quantities[item.id] || 1} ×</span>
                    <span className="text-[#1A0F0A] truncate max-w-[180px]" title={item.name}>{item.name}</span>
                  </div>
                  <span className="text-[#1A0F0A]">${(item.price * (quantities[item.id] || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 pb-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A87E]" />
                  <input 
                    type="text" 
                    placeholder="Gift card or discount code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#C5A87E] rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#C8960C] focus:border-[#C8960C] text-[#1A0F0A] placeholder-[#C5A87E]/70"
                  />
                </div>
                <button 
                  className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                    couponCode.trim() 
                    ? 'bg-[#F0E6D8] text-[#C8960C] hover:bg-[#E8DDD0]' 
                    : 'bg-[#FAFAF7] text-[#C5A87E] border border-[#E8DDD0]'
                  }`}
                  disabled={!couponCode.trim()}
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E8DDD0] text-sm">
              <div className="flex justify-between text-[#5C4032]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5C4032]">
                <span>Shipping</span>
                <span className="italic">Calculated at next step</span>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t-[1px] border-[#C8960C]">
              <div className="flex justify-between items-center">
                <span className="font-['Playfair_Display'] text-xl text-[#1A0F0A]">Total</span>
                <span className="font-['Playfair_Display'] text-2xl text-[#1A0F0A]">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-6 pb-2 text-center">
              <p className="text-[#5C4032]/80 italic font-['Lora'] text-xs">Free returns within 15 days</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
