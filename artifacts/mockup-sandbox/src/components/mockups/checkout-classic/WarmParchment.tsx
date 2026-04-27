import React, { useState } from 'react';
import { Check, ChevronRight, Lock, ShoppingBag } from 'lucide-react';

export function WarmParchment() {
  const [activeStep, setActiveStep] = useState(2); // 1 = Cart, 2 = Details, 3 = Payment

  return (
    <div className="min-h-screen font-['Lora'] text-[#5C3D1E] bg-[#FAF3E8]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:wght@400;500;600;700&display=swap');
      `}} />

      {/* Header */}
      <header className="pt-8 pb-6 text-center border-b border-[#D9C5A0]/50">
        <h1 className="font-['Playfair_Display'] text3xl md:text-4xl text-[#2E1A0E] tracking-wide">Harini Collective</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Step Wizard */}
        <div className="flex items-center justify-center mb-16 max-w-2xl mx-auto relative">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#D9C5A0] -z-10 -translate-y-1/2"></div>
          
          <div className="flex justify-between w-full">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-3 bg-[#FAF3E8] px-4">
              <div className="w-8 h-8 rounded-full border-2 border-[#C8960C] bg-[#FAF3E8] text-[#C8960C] flex items-center justify-center">
                <Check className="w-4 h-4" strokeWidth={3} />
              </div>
              <span className="font-['Lora'] text-xs uppercase tracking-widest text-[#3E2200]">1 · Cart</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-3 bg-[#FAF3E8] px-4">
              <div className="w-8 h-8 rounded-full bg-[#8B5E3C] text-[#FAF3E8] flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <span className="font-['Lora'] text-xs uppercase tracking-widest text-[#8B5E3C] font-semibold">2 · Details</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-3 bg-[#FAF3E8] px-4">
              <div className="w-8 h-8 rounded-full border border-[#D9C5A0] bg-[#FAF3E8] text-[#D9C5A0] flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <span className="font-['Lora'] text-xs uppercase tracking-widest text-[#D9C5A0]">3 · Payment</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          
          {/* Left Column - Form */}
          <div className="w-full lg:w-3/5 space-y-10">
            {/* Contact Section */}
            <section className="bg-[#FEFCF7] p-8 border border-[#D9C5A0]">
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#2E1A0E] mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">First Name</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="Jane" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">Last Name</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="Doe" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm text-[#5C3D1E]">Email Address</label>
                  <input type="email" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="jane@example.com" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm text-[#5C3D1E]">Phone Number</label>
                  <input type="tel" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="+91 98765 43210" />
                </div>
              </div>
            </section>

            {/* Address Section */}
            <section className="bg-[#FEFCF7] p-8 border border-[#D9C5A0]">
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#2E1A0E] mb-6">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm text-[#5C3D1E]">House/Flat No.</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="Apt 4B" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm text-[#5C3D1E]">Street</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="MG Road" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">City</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="Bangalore" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">State</label>
                  <select className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors appearance-none">
                    <option>Karnataka</option>
                    <option>Maharashtra</option>
                    <option>Delhi</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">Pincode</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors" placeholder="560001" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm text-[#5C3D1E]">Country</label>
                  <input type="text" className="w-full bg-[#FEFCF7] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] bg-opacity-50 cursor-not-allowed" value="India" readOnly />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-full lg:w-2/5">
            <div className="sticky top-8 bg-[#FEFCF7] border border-[#D9C5A0] p-8">
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#2E1A0E] mb-6">Your Order</h2>
              
              <div className="space-y-5 mb-8">
                {/* Items */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-[#FAF3E8] border border-[#D9C5A0] flex items-center justify-center text-[#8B5E3C]">
                      <ShoppingBag className="w-6 h-6 opacity-50" />
                    </div>
                    <div>
                      <h4 className="text-[#2E1A0E] font-medium leading-snug">Handwoven Silk Saree</h4>
                      <p className="text-sm text-[#8B5E3C] mt-1">Qty: 1</p>
                    </div>
                  </div>
                  <span className="text-[#2E1A0E]">₹3,499</span>
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-[#FAF3E8] border border-[#D9C5A0] flex items-center justify-center text-[#8B5E3C]">
                      <ShoppingBag className="w-6 h-6 opacity-50" />
                    </div>
                    <div>
                      <h4 className="text-[#2E1A0E] font-medium leading-snug">Silver Anklet</h4>
                      <p className="text-sm text-[#8B5E3C] mt-1">Qty: 2</p>
                    </div>
                  </div>
                  <span className="text-[#2E1A0E]">₹1,200</span>
                </div>
              </div>

              <hr className="border-[#D9C5A0] mb-6" />

              {/* Coupon */}
              <div className="flex gap-3 mb-6">
                <input type="text" placeholder="Coupon code" className="flex-1 bg-[#FAF3E8] border border-[#C5A87E] px-4 py-2.5 text-[#2E1A0E] focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors uppercase" />
                <button className="px-6 py-2.5 border border-[#8B5E3C] text-[#8B5E3C] font-medium hover:bg-[#8B5E3C] hover:text-[#FAF3E8] transition-colors">
                  Apply
                </button>
              </div>

              <hr className="border-[#D9C5A0] mb-6" />

              {/* Totals */}
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-[#5C3D1E]">
                  <span>Subtotal</span>
                  <span>₹4,699</span>
                </div>
                <div className="flex justify-between text-[#5C3D1E]">
                  <span>Shipping</span>
                  <span>Calculated at next step</span>
                </div>
                <div className="flex justify-between text-[#2E1A0E] font-semibold text-lg pt-3 border-t border-[#D9C5A0]/50 mt-3">
                  <span>Total</span>
                  <span>₹4,699</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="w-full bg-[#4A2E17] text-[#FAF3E8] py-4 px-6 flex items-center justify-center gap-2 hover:bg-[#3E2200] transition-colors font-medium text-lg">
                Continue to Payment
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#8B5E3C]">
                <Lock className="w-3.5 h-3.5" />
                <span>Secure SSL Checkout</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
