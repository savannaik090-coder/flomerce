import React from "react";
import { 
  Store, 
  CreditCard, 
  Package, 
  MessageCircle, 
  LineChart,
  CheckCircle2,
  TrendingUp,
  Smartphone,
  Globe,
  Zap
} from "lucide-react";

export default function ShowcaseUITiles() {
  return (
    <section className="relative w-full bg-slate-50 py-24 sm:py-32 overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-100/40 blur-[120px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 mb-16 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-sm font-medium text-slate-600 mb-6">
          <Zap className="w-4 h-4 fill-amber-400 text-amber-500" />
          The complete commerce operating system
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-3xl">
          Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">run your empire</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl">
          Flomerce gives you the tools of a billion-dollar brand, for less than ₹9/day. From your first sale to your hundredth store.
        </p>
      </div>

      {/* Cards Scroll Container */}
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 pt-4 -mx-6 px-6 lg:mx-0 lg:px-0 hide-scrollbar scroll-smooth">
          
          {/* Card 1: Storefront */}
          <div className="relative shrink-0 snap-center w-[300px] md:w-[340px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            {/* Visual Top Area */}
            <div className="h-[280px] w-full bg-gradient-to-br from-pink-50 to-rose-100/50 p-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
              
              {/* Mini UI: Storefront mock */}
              <div className="w-[220px] h-[240px] bg-white rounded-t-xl shadow-lg border border-slate-100 translate-y-6 flex flex-col overflow-hidden group-hover:translate-y-4 transition-transform duration-500">
                <div className="h-10 border-b border-slate-100 flex items-center justify-between px-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center">
                      <Store className="w-3 h-3 text-rose-500" />
                    </div>
                    <div className="h-2 w-12 bg-slate-200 rounded-full" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 w-4 bg-slate-100 rounded-full" />
                    <div className="h-2 w-4 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="h-24 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-rose-400/10 to-pink-400/10" />
                   <div className="h-4 w-24 bg-white/80 rounded backdrop-blur-sm shadow-sm" />
                </div>
                <div className="p-3 flex gap-2">
                  <div className="w-1/2 aspect-square bg-slate-100 rounded-md" />
                  <div className="w-1/2 aspect-square bg-slate-100 rounded-md" />
                </div>
              </div>
            </div>

            {/* Content Bottom Area */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-white">
              <div className="text-xs font-bold tracking-wider text-rose-500 uppercase mb-3 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Storefront
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">
                Launch a polished storefront customers love to browse.
              </h3>
              
              <ul className="mt-auto space-y-3 pt-6">
                {['Modern responsive themes', 'Multi-currency switching', 'Customer accounts & wishlists'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 2: Selling */}
          <div className="relative shrink-0 snap-center w-[300px] md:w-[340px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="h-[280px] w-full bg-gradient-to-br from-emerald-50 to-teal-100/40 p-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
              
              {/* Mini UI: Order Receipt */}
              <div className="w-[180px] bg-white rounded-xl shadow-lg border border-slate-100 p-4 rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-medium">Order #4092</div>
                    <div className="text-xs font-bold text-slate-900">Paid</div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="h-2 w-16 bg-slate-100 rounded-full" />
                    <div className="text-xs font-semibold text-slate-700">₹1,499</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-2 w-12 bg-slate-100 rounded-full" />
                    <div className="text-xs font-semibold text-slate-700">₹299</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center">
                  <div className="text-xs font-medium text-slate-500">Total</div>
                  <div className="text-sm font-bold text-emerald-600">₹1,798</div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-white">
              <div className="text-xs font-bold tracking-wider text-emerald-600 uppercase mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Selling
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">
                Take orders, accept payments, and stay compliant.
              </h3>
              
              <ul className="mt-auto space-y-3 pt-6">
                {['Razorpay, Stripe & COD', 'Automated GST invoicing', 'Variants & bulk pricing'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 3: Operations */}
          <div className="relative shrink-0 snap-center w-[300px] md:w-[340px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="h-[280px] w-full bg-gradient-to-br from-blue-50 to-indigo-100/40 p-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
              
              {/* Mini UI: Inventory Board */}
              <div className="w-[240px] bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-100 p-3 group-hover:scale-105 transition-transform duration-500">
                <div className="flex justify-between items-center mb-3 px-1">
                  <div className="h-3 w-20 bg-slate-200 rounded-full" />
                  <div className="h-5 w-12 bg-blue-100 rounded-md" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent">
                      <div className="w-8 h-8 rounded bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-full bg-slate-200 rounded-full" />
                        <div className="h-1.5 w-1/2 bg-slate-100 rounded-full" />
                      </div>
                      <div className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {row * 12} IN
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-white">
              <div className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Operations
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">
                Run the back office without juggling spreadsheets.
              </h3>
              
              <ul className="mt-auto space-y-3 pt-6">
                {['Multi-location inventory', 'Shiprocket integration', 'Role-based staff access'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 4: Marketing */}
          <div className="relative shrink-0 snap-center w-[300px] md:w-[340px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="h-[280px] w-full bg-gradient-to-br from-amber-50 to-orange-100/40 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
              
              {/* Mini UI: Chat & Notification */}
              <div className="relative w-full max-w-[200px]">
                {/* Notification */}
                <div className="absolute -top-6 -right-4 w-[160px] bg-white rounded-lg shadow-lg border border-slate-100 p-2.5 z-10 translate-y-2 group-hover:-translate-y-1 transition-transform duration-500 delay-100">
                  <div className="flex gap-2 items-start">
                    <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-800">Flash Sale Active</div>
                      <div className="text-[9px] text-slate-500 leading-tight mt-0.5">Use code DIWALI20 for 20% off all jewelry.</div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Mock */}
                <div className="w-full bg-[#E5DDD5] rounded-xl shadow-md border border-slate-200 p-3 pt-8 overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded-lg rounded-tl-sm w-[85%] shadow-sm">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1" />
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded-full" />
                    </div>
                    <div className="bg-[#DCF8C6] p-2 rounded-lg rounded-tr-sm w-[75%] shadow-sm ml-auto">
                      <div className="h-1.5 w-full bg-emerald-200/60 rounded-full mb-1" />
                      <div className="h-1.5 w-1/2 bg-emerald-200/60 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-white">
              <div className="text-xs font-bold tracking-wider text-orange-600 uppercase mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Marketing
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">
                Bring shoppers back and turn them into regulars.
              </h3>
              
              <ul className="mt-auto space-y-3 pt-6">
                {['WhatsApp marketing & chat', 'Web push notifications', 'Verified reviews with photos'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 5: Insights */}
          <div className="relative shrink-0 snap-center w-[300px] md:w-[340px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/50 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="h-[280px] w-full bg-gradient-to-br from-violet-50 to-purple-100/40 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
              
              {/* Mini UI: Dashboard Charts */}
              <div className="w-[220px] space-y-3 group-hover:scale-105 transition-transform duration-500">
                <div className="flex gap-3">
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">Revenue</div>
                    <div className="text-sm font-bold text-slate-800 mb-2">₹42.5k</div>
                    <div className="flex items-end gap-1 h-8">
                      {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 bg-violet-100 rounded-t-sm relative group-hover:bg-violet-200 transition-colors" style={{ height: `${h}%` }}>
                          {i === 5 && <div className="absolute bottom-0 inset-x-0 h-full bg-violet-500 rounded-t-sm" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-[80px] bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col justify-between">
                    <div className="text-[10px] text-slate-500">Visitors</div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">1.2k</div>
                      <div className="text-[10px] font-medium text-emerald-500 flex items-center mt-0.5">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> +14%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                       <Smartphone className="w-3 h-3 text-slate-500" />
                     </div>
                     <div>
                       <div className="text-[10px] font-bold text-slate-700">Mobile Traffic</div>
                       <div className="h-1 w-16 bg-slate-100 rounded-full mt-1 overflow-hidden">
                         <div className="h-full w-[85%] bg-violet-400" />
                       </div>
                     </div>
                   </div>
                   <div className="text-xs font-bold text-slate-800">85%</div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 lg:p-8 flex flex-col bg-white">
              <div className="text-xs font-bold tracking-wider text-violet-600 uppercase mb-3 flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                Insights
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight">
                See exactly what's working — and what's next.
              </h3>
              
              <ul className="mt-auto space-y-3 pt-6">
                {['Real-time visitor analytics', 'Revenue & tax reports', 'Traffic source attribution'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
        
        {/* Scroll hint gradient for mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none lg:hidden" />
      </div>
      
      {/* CSS to hide scrollbar but keep functionality */}
      <style dangerouslySetInline={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
