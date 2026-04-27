import React, { useState } from 'react';
import { CreditCard, Wallet, ShieldCheck, Lock, ChevronRight, Check, Tag } from 'lucide-react';

export function HeritageDark() {
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  return (
    <div className="min-h-screen bg-[#1C0F07] font-['Merriweather'] text-[#1C0F07] selection:bg-[#C8960C] selection:text-white flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
      `}} />

      {/* Header */}
      <header className="bg-[#2D1B0E] pt-8 pb-6 px-4 md:px-8 border-b border-[#C5A87E]/20 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[#D4A853] tracking-wider uppercase mb-8">
            Harini Collective
          </h1>

          {/* Wizard Steps */}
          <div className="flex items-center justify-center w-full max-w-2xl relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-[#C5A87E]/30 -z-10" />
            
            <div className="flex justify-between w-full z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-2 bg-[#2D1B0E] px-2 md:px-4">
                <div className="w-8 h-8 rounded-full bg-[#C8960C] flex items-center justify-center text-[#1C0F07]">
                  <Check size={16} strokeWidth={3} />
                </div>
                <span className="font-['Playfair_Display'] text-[#D4A853] text-sm tracking-widest uppercase">1 &middot; Cart</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-2 bg-[#2D1B0E] px-2 md:px-4">
                <div className="w-8 h-8 rounded-full bg-[#C8960C] flex items-center justify-center text-[#1C0F07]">
                  <Check size={16} strokeWidth={3} />
                </div>
                <span className="font-['Playfair_Display'] text-[#D4A853] text-sm tracking-widest uppercase">2 &middot; Details</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-2 bg-[#2D1B0E] px-2 md:px-4">
                <div className="w-8 h-8 rounded-full bg-[#C8960C] flex items-center justify-center text-[#1C0F07] font-bold">
                  3
                </div>
                <span className="font-['Playfair_Display'] text-[#D4A853] text-sm tracking-widest uppercase font-semibold">3 &middot; Payment</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Left Column - Form */}
          <div className="lg:w-[60%] flex flex-col gap-8">
            <div className="bg-[#FAF0E6] border border-[#C5A87E] p-6 md:p-8 shadow-2xl">
              <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl text-[#1C0F07] mb-8">
                Choose Payment Method
              </h2>

              <div className="flex flex-col gap-4">
                {/* Razorpay Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`w-full text-left flex items-center gap-4 p-5 md:p-6 transition-all relative overflow-hidden ${
                    paymentMethod === 'razorpay' 
                      ? 'bg-white border border-[#C8960C] ring-1 ring-[#C8960C]/50 shadow-[0_0_15px_rgba(200,150,12,0.15)]' 
                      : 'bg-white border border-[#1C0F07]/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  {paymentMethod === 'razorpay' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8960C]" />
                  )}
                  <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full ${
                    paymentMethod === 'razorpay' ? 'bg-[#C8960C]/10 text-[#C8960C]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#1C0F07] mb-1">
                      Pay Online with Razorpay
                    </h3>
                    <p className="text-sm text-[#1C0F07]/60">
                      Credit/Debit Card, UPI, NetBanking
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'razorpay' ? 'border-[#C8960C]' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 rounded-full bg-[#C8960C]" />}
                  </div>
                </button>

                {/* COD Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left flex items-center gap-4 p-5 md:p-6 transition-all relative overflow-hidden ${
                    paymentMethod === 'cod' 
                      ? 'bg-white border border-[#C8960C] ring-1 ring-[#C8960C]/50 shadow-[0_0_15px_rgba(200,150,12,0.15)]' 
                      : 'bg-white border border-[#1C0F07]/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  {paymentMethod === 'cod' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C8960C]" />
                  )}
                  <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full ${
                    paymentMethod === 'cod' ? 'bg-[#C8960C]/10 text-[#C8960C]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Wallet size={20} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-['Playfair_Display'] text-lg font-semibold text-[#1C0F07] mb-1">
                      Cash on Delivery
                    </h3>
                    <p className="text-sm text-[#1C0F07]/60">
                      Pay at your doorstep
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cod' ? 'border-[#C8960C]' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#C8960C]" />}
                  </div>
                </button>
              </div>

              <div className="mt-10 pt-8 border-t border-[#C5A87E]/30">
                <button className="w-full bg-gradient-to-r from-[#6B3A2A] to-[#3D1F10] text-[#FAF0E6] py-5 px-6 font-['Playfair_Display'] text-xl tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg">
                  Place Order
                  <ChevronRight size={20} className="mt-0.5" />
                </button>

                <div className="flex items-center justify-center gap-6 mt-6 text-[#1C0F07]/60 text-sm">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-[#C8960C]" />
                    <span>Secured by Razorpay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#C8960C]" />
                    <span>Safe Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:w-[40%]">
            <div className="sticky top-8 bg-[#FAF0E6] border border-[#C5A87E] p-6 md:p-8 shadow-2xl">
              <h2 className="font-['Playfair_Display'] text-2xl text-[#1C0F07] mb-6 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-[#C8960C] text-lg">2 Items</span>
              </h2>

              <div className="flex flex-col gap-6 mb-8">
                {/* Item 1 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-[#1C0F07]/5 flex items-center justify-center border border-[#C5A87E]/30 shrink-0">
                      <div className="w-10 h-10 border border-[#C5A87E]/50 rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-['Playfair_Display'] text-base text-[#1C0F07] leading-tight">Antique Gold Necklace</h4>
                      <p className="text-sm text-[#1C0F07]/60 mt-1">Qty: 1</p>
                    </div>
                  </div>
                  <span className="text-[#1C0F07] font-semibold whitespace-nowrap">₹8,999</span>
                </div>

                {/* Item 2 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-[#1C0F07]/5 flex items-center justify-center border border-[#C5A87E]/30 shrink-0">
                      <div className="w-8 h-8 border border-[#C5A87E]/50 rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-['Playfair_Display'] text-base text-[#1C0F07] leading-tight">Pearl Drop Earrings</h4>
                      <p className="text-sm text-[#1C0F07]/60 mt-1">Qty: 1</p>
                    </div>
                  </div>
                  <span className="text-[#1C0F07] font-semibold whitespace-nowrap">₹2,499</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="mb-8 pt-6 border-t border-[#C5A87E]/30">
                <div className="flex items-center gap-3">
                  <div className="relative flex-grow">
                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1C0F07]/40" />
                    <input 
                      type="text" 
                      placeholder="Gift card or discount code" 
                      className="w-full bg-white border border-[#C5A87E]/50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#C8960C] placeholder:text-[#1C0F07]/40"
                    />
                  </div>
                  <button className="border border-[#C8960C] text-[#1C0F07] px-6 py-3 text-sm font-semibold tracking-wide hover:bg-[#C8960C]/5 transition-colors shrink-0">
                    Apply
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between text-[#1C0F07]/80">
                  <span>Subtotal</span>
                  <span>₹11,498</span>
                </div>
                <div className="flex justify-between text-[#1C0F07]/80">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-[#1C0F07]/80">
                  <span>Taxes</span>
                  <span>₹345</span>
                </div>
                
                <div className="mt-4 pt-4 border-t-2 border-[#C5A87E] flex justify-between items-end">
                  <span className="font-['Playfair_Display'] text-lg">Total</span>
                  <span className="font-['Playfair_Display'] text-3xl font-semibold text-[#1C0F07]">₹11,843</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2D1B0E] py-8 text-center text-[#D4A853]/60 text-xs tracking-wider shrink-0">
        <p>&copy; {new Date().getFullYear()} Harini Collective. All rights reserved.</p>
      </footer>
    </div>
  );
}
