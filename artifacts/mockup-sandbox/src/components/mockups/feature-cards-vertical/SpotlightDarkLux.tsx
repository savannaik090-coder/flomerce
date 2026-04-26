import React, { useEffect, useRef } from "react";
import { Check } from "lucide-react";

export default function SpotlightDarkLux() {
  const cards = [
    {
      id: "storefront",
      category: "STOREFRONT",
      title: "Launch a polished storefront customers love to browse.",
      image: "/__mockup/images/feat-storefront-dark.png",
      features: [
        "Modern responsive themes",
        "Visual homepage customizer",
        "Multi-currency switching",
        "AI translation in 60+ languages",
        "Customer accounts & wishlists"
      ]
    },
    {
      id: "selling",
      category: "SELLING",
      title: "Take orders, accept payments, and stay compliant from day one.",
      image: "/__mockup/images/feat-selling-dark.png",
      features: [
        "Variants & bulk pricing",
        "Order management",
        "Razorpay, Stripe & COD",
        "Automated GST invoicing",
        "Abandoned cart recovery"
      ]
    },
    {
      id: "operations",
      category: "OPERATIONS",
      title: "Run the back office without juggling spreadsheets.",
      image: "/__mockup/images/feat-operations-dark.png",
      features: [
        "Multi-location inventory",
        "Stock transfers",
        "Shiprocket integration",
        "Custom domain & auto SSL",
        "Role-based staff access"
      ]
    },
    {
      id: "marketing",
      category: "MARKETING & GROWTH",
      title: "Bring shoppers back and turn them into regulars.",
      image: "/__mockup/images/feat-marketing-dark.png",
      features: [
        "Web push notifications",
        "WhatsApp marketing & chat",
        "Discounts & coupons",
        "Built-in SEO suite",
        "Verified reviews with photos"
      ]
    },
    {
      id: "insights",
      category: "INSIGHTS",
      title: "See exactly what's working — and what's next.",
      image: "/__mockup/images/feat-insights-dark.png",
      features: [
        "Real-time visitor analytics",
        "Conversion & best sellers",
        "Revenue, tax & shipping reports",
        "Device & geography breakdowns",
        "Traffic source attribution"
      ]
    }
  ];

  return (
    <section className="relative w-full bg-[#030305] text-white py-24 sm:py-32 overflow-hidden font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Noise & Gradients */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Subtle Grid */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.05] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #4f4f4f 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 sm:mb-24">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium tracking-widest uppercase mb-6 ring-1 ring-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Platform Capabilities
          </p>
          <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-white mb-6 leading-[1.1]">
            Everything you need to <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600">run a serious business.</span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed">
            From your first sale to your millionth order. Replace a dozen fragmented tools with one platform built for ambitious Indian merchants. Starting at just ₹9/day.
          </p>
        </div>

        {/* Horizontal Scroll Cards Container */}
        <div className="flex overflow-x-auto pb-12 -mx-6 px-6 lg:mx-0 lg:px-0 snap-x snap-mandatory hide-scrollbar gap-6 lg:gap-8 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0 xl:snap-none">
          {cards.map((card, idx) => (
            <div 
              key={card.id}
              className="group relative flex-none w-[85vw] sm:w-[320px] xl:w-auto flex flex-col snap-center rounded-[2rem] bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm overflow-hidden hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.1)]"
            >
              {/* Inner glow top edge */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-400/20 to-transparent group-hover:via-amber-400/40 transition-colors duration-500" />
              
              {/* Image Section (Top Half) */}
              <div className="relative h-[240px] sm:h-[280px] w-full overflow-hidden bg-black flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent z-10" />
                <img 
                  src={card.image} 
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Category Label over image */}
                <div className="absolute bottom-4 left-6 z-20">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
                    {card.category}
                  </span>
                </div>
              </div>

              {/* Content Section (Bottom Half) */}
              <div className="relative flex flex-col flex-grow p-6 pt-5 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80">
                <h3 className="text-xl sm:text-2xl font-medium text-zinc-100 mb-6 leading-snug">
                  {card.title}
                </h3>
                
                <ul className="mt-auto space-y-3.5">
                  {card.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      <div className="mt-1 w-4 h-4 rounded-full bg-zinc-800/80 flex items-center justify-center flex-shrink-0 border border-zinc-700 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 transition-colors">
                        <Check className="w-2.5 h-2.5 text-zinc-400 group-hover:text-amber-400 transition-colors" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors leading-tight">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hover gradient sweep */}
              <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700 z-30"
                style={{
                  background: 'radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 0%), rgba(245,158,11,0.06), transparent 40%)'
                }}
              />
            </div>
          ))}
        </div>

      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
