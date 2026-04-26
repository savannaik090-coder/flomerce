import React from "react";
import { Gem, Shirt, Sparkles, Boxes, ArrowRight, Check, Star } from "lucide-react";

type Industry = {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  perks: string[];
  cta: string;
  Icon: React.ComponentType<{ className?: string }>;
  surface: string;
  ink: string;
  accent: string;
  pill: string;
  mock: React.ReactNode;
};

function MockJewellery() {
  return (
    <div className="absolute inset-0 flex items-end justify-center p-5">
      <div className="w-[230px] h-[210px] rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/60 ring-1 ring-amber-200/60 shadow-xl translate-y-3 group-hover:translate-y-1 transition-transform duration-500 overflow-hidden">
        <div className="h-7 px-3 flex items-center justify-between border-b border-amber-200/50">
          <span className="text-[10px] font-['Cormorant_Garamond'] italic font-semibold text-amber-900 tracking-wide">Aurelia Fine Jewellery</span>
          <div className="flex gap-1"><span className="w-1 h-1 rounded-full bg-amber-700/60"/><span className="w-1 h-1 rounded-full bg-amber-700/60"/><span className="w-1 h-1 rounded-full bg-amber-700/60"/></div>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          <div className="aspect-square rounded-lg bg-gradient-to-br from-amber-200 to-yellow-300/70 flex items-center justify-center"><Gem className="w-6 h-6 text-amber-800/70"/></div>
          <div className="aspect-square rounded-lg bg-gradient-to-br from-rose-200 to-amber-200/80 relative"><span className="absolute top-1 right-1 text-[7px] bg-amber-900 text-amber-50 px-1 rounded-sm font-semibold">22K</span></div>
          <div className="aspect-square rounded-lg bg-gradient-to-br from-yellow-100 to-amber-200"/>
          <div className="aspect-square rounded-lg bg-gradient-to-br from-amber-100 to-rose-100 relative"><span className="absolute bottom-1 left-1 text-[7px] bg-emerald-700 text-white px-1 rounded-sm font-semibold">BIS</span></div>
        </div>
      </div>
    </div>
  );
}

function MockFashion() {
  return (
    <div className="absolute inset-0 flex items-end justify-center p-5">
      <div className="w-[230px] h-[210px] rounded-2xl bg-white ring-1 ring-rose-200/60 shadow-xl translate-y-3 group-hover:translate-y-1 transition-transform duration-500 overflow-hidden">
        <div className="h-16 bg-gradient-to-br from-rose-200 to-pink-300 relative flex items-end p-3">
          <span className="text-[11px] font-['Playfair_Display'] font-bold text-rose-950 italic">SS '26 Collection</span>
        </div>
        <div className="px-3 pt-2 pb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-800">Linen Wrap Dress</span>
            <span className="text-[10px] font-bold text-rose-700">₹2,499</span>
          </div>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-full bg-rose-300 ring-2 ring-white"/>
            <span className="w-3 h-3 rounded-full bg-emerald-300"/>
            <span className="w-3 h-3 rounded-full bg-slate-800"/>
            <span className="w-3 h-3 rounded-full bg-amber-200"/>
          </div>
          <div className="flex gap-1 pt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-700">XS</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-white">S</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-700">M</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-700">L</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockBeauty() {
  return (
    <div className="absolute inset-0 flex items-end justify-center p-5">
      <div className="w-[230px] h-[210px] rounded-2xl bg-gradient-to-b from-white to-purple-50 ring-1 ring-purple-200/60 shadow-xl translate-y-3 group-hover:translate-y-1 transition-transform duration-500 overflow-hidden">
        <div className="h-7 px-3 flex items-center justify-between border-b border-purple-100">
          <span className="text-[10px] font-bold tracking-[0.2em] text-purple-900">GLOW &amp; CO</span>
          <span className="text-[9px] text-purple-600">SHOP</span>
        </div>
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-pink-100 via-purple-100 to-amber-50 h-20 mb-2 flex items-center justify-center relative overflow-hidden">
            <div className="w-10 h-14 rounded-t-full rounded-b-lg bg-gradient-to-b from-rose-300 to-pink-400 shadow-md"/>
            <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-[8px] px-1.5 py-0.5 rounded-full font-bold text-rose-700">NEW</span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-purple-950">Velvet Lip Tint</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">{[...Array(5)].map((_,i)=><Star key={i} className="w-2 h-2 fill-amber-400 text-amber-400"/>)}</div>
              <span className="text-[9px] font-bold text-purple-700">₹599</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockGeneral() {
  return (
    <div className="absolute inset-0 flex items-end justify-center p-5">
      <div className="w-[230px] h-[210px] rounded-2xl bg-white ring-1 ring-emerald-200/60 shadow-xl translate-y-3 group-hover:translate-y-1 transition-transform duration-500 overflow-hidden">
        <div className="h-7 px-3 flex items-center justify-between border-b border-emerald-100 bg-emerald-50/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center"><Boxes className="w-2.5 h-2.5 text-white"/></div>
            <span className="text-[10px] font-bold text-emerald-900">Marketplace</span>
          </div>
          <span className="text-[8px] text-emerald-700 font-semibold">FREE SHIP</span>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1.5">
          <div className="aspect-square rounded bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center"><div className="w-4 h-4 rounded-sm bg-emerald-600/30"/></div>
          <div className="aspect-square rounded bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-orange-500/40"/></div>
          <div className="aspect-square rounded bg-gradient-to-br from-blue-100 to-cyan-200 flex items-center justify-center"><div className="w-4 h-4 rounded bg-blue-500/30 rotate-45"/></div>
          <div className="aspect-square rounded bg-gradient-to-br from-pink-100 to-rose-200"/>
          <div className="aspect-square rounded bg-gradient-to-br from-violet-100 to-purple-200"/>
          <div className="aspect-square rounded bg-gradient-to-br from-yellow-100 to-amber-200"/>
        </div>
      </div>
    </div>
  );
}

const INDUSTRIES: Industry[] = [
  {
    id: "jewellery",
    eyebrow: "Jewellery",
    title: "Built for jewellers",
    blurb: "From heirloom collections to daily wear — show every karat in the right light.",
    perks: ["BIS hallmark badges", "360° product galleries", "GST invoices day one"],
    cta: "Start a jewellery store",
    Icon: Gem,
    surface: "from-amber-100 via-yellow-50 to-rose-100",
    ink: "text-amber-950",
    accent: "text-amber-700",
    pill: "bg-amber-100 text-amber-900 ring-amber-200",
    mock: <MockJewellery/>,
  },
  {
    id: "fashion",
    eyebrow: "Fashion",
    title: "Built for boutiques",
    blurb: "Drop new collections in minutes. Manage sizes, swatches, and seasonal sales without breaking a sweat.",
    perks: ["Size + colour variants", "Lookbook layouts", "Returns + exchanges"],
    cta: "Start a fashion store",
    Icon: Shirt,
    surface: "from-rose-100 via-pink-50 to-fuchsia-100",
    ink: "text-rose-950",
    accent: "text-rose-700",
    pill: "bg-rose-100 text-rose-900 ring-rose-200",
    mock: <MockFashion/>,
  },
  {
    id: "beauty",
    eyebrow: "Beauty",
    title: "Built for beauty brands",
    blurb: "Make every shade swatchable. Build a glow-up funnel from first visit to repeat order.",
    perks: ["Shade + tone pickers", "Ingredient drawers", "Subscribe & save"],
    cta: "Start a beauty store",
    Icon: Sparkles,
    surface: "from-purple-100 via-pink-50 to-amber-50",
    ink: "text-purple-950",
    accent: "text-purple-700",
    pill: "bg-purple-100 text-purple-900 ring-purple-200",
    mock: <MockBeauty/>,
  },
  {
    id: "general",
    eyebrow: "Anything else",
    title: "Built for whatever you sell",
    blurb: "Electronics, snacks, services, plants, art — if you can ship it or schedule it, you can sell it.",
    perks: ["Unlimited categories", "Service + product mix", "COD on day one"],
    cta: "Start any kind of store",
    Icon: Boxes,
    surface: "from-emerald-100 via-teal-50 to-cyan-100",
    ink: "text-emerald-950",
    accent: "text-emerald-700",
    pill: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    mock: <MockGeneral/>,
  },
];

export default function VibrantTiles() {
  return (
    <section className="relative w-full bg-slate-50 py-16 sm:py-20 overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-rose-100/40 blur-[120px]"/>
        <div className="absolute bottom-0 -left-[10%] w-[40%] h-[40%] rounded-full bg-amber-100/40 blur-[120px]"/>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-5 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500"/>
          Made for your kind of business
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 max-w-3xl leading-[1.05]">
          Whatever you sell, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600">we have a starter ready</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl">
          Pick your category and we'll set up a store stocked with the right pages, badges, and payment flows from day one.
        </p>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-8 -mx-6 px-6 lg:mx-0 lg:px-0 hide-scrollbar">
          {INDUSTRIES.map((ind) => (
            <article
              key={ind.id}
              className="relative shrink-0 snap-start w-[300px] md:w-[320px] flex flex-col bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200/60 overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div className={`relative h-[260px] w-full bg-gradient-to-br ${ind.surface} overflow-hidden`}>
                {ind.mock}
              </div>
              <div className="flex-1 p-6 flex flex-col">
                <div className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full ring-1 ${ind.pill} text-[11px] font-bold uppercase tracking-wider mb-3`}>
                  <ind.Icon className="w-3.5 h-3.5"/>
                  {ind.eyebrow}
                </div>
                <h3 className={`text-xl font-bold ${ind.ink} leading-tight mb-2`}>{ind.title}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{ind.blurb}</p>
                <ul className="space-y-2 mb-5">
                  {ind.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className={`w-4 h-4 ${ind.accent} mt-0.5 shrink-0`} strokeWidth={3}/>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button className={`mt-auto inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors group/cta`}>
                  <span>{ind.cta}</span>
                  <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform"/>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
