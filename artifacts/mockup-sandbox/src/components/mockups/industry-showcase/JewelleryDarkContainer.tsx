import React from "react";
import {
  Gem, Shirt, Sparkles, Boxes, ArrowRight, Check, Star,
  Search, Heart, ShoppingBag, Wifi, Signal, BatteryFull
} from "lucide-react";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] h-[560px] rounded-[44px] bg-slate-900 p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-[6px] ring-slate-950/80">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[26px] bg-slate-950 rounded-b-2xl z-20" />
      <div className="relative w-full h-full rounded-[34px] bg-white overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[34px] flex items-center justify-between px-6 text-[10px] font-semibold z-10 text-slate-900">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="w-2.5 h-2.5" />
            <Wifi className="w-2.5 h-2.5" />
            <BatteryFull className="w-3 h-3" />
          </div>
        </div>
        <div className="pt-[34px] h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function StoreJewellery() {
  return (
    <div className="h-full bg-gradient-to-b from-stone-50 to-amber-50 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-200/60">
        <span className="font-['Cormorant_Garamond'] italic text-base font-bold tracking-[0.2em] text-stone-900">AURELIA</span>
        <div className="flex gap-2.5"><Search className="w-4 h-4 text-stone-700" /><Heart className="w-4 h-4 text-stone-700" /><ShoppingBag className="w-4 h-4 text-stone-700" /></div>
      </div>
      <div className="px-4 py-3 bg-gradient-to-r from-amber-100 to-rose-100 border-b border-amber-200/40">
        <div className="text-[9px] tracking-widest text-amber-800 font-bold mb-0.5">BRIDAL EDIT</div>
        <div className="font-['Playfair_Display'] text-sm font-bold text-stone-900 italic">Heirlooms for the moment</div>
      </div>
      <div className="flex-1 p-3 grid grid-cols-2 gap-2.5 overflow-hidden">
        <div className="rounded-xl bg-gradient-to-br from-amber-200 to-yellow-300 aspect-square shadow-sm relative">
          <span className="absolute top-1.5 right-1.5 bg-emerald-700 text-white text-[7px] px-1.5 py-0.5 rounded font-bold">BIS</span>
          <Gem className="w-8 h-8 text-amber-900/40 absolute inset-0 m-auto" strokeWidth={1} />
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-200 to-amber-200 aspect-square shadow-sm" />
        <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-amber-300 aspect-square shadow-sm" />
        <div className="rounded-xl bg-gradient-to-br from-amber-100 to-rose-200 aspect-square shadow-sm" />
        <div className="col-span-2 rounded-xl bg-white ring-1 ring-stone-200 p-3 shadow-sm">
          <div className="text-[10px] font-['Playfair_Display'] italic font-bold text-stone-900">Sitara Necklace</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-bold text-amber-700">₹4.2L</span>
            <span className="text-[8px] text-emerald-700 font-bold">EMI from ₹3,499</span>
          </div>
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
            <span className="w-3 h-3 rounded-full bg-rose-300 ring-2 ring-white" />
            <span className="w-3 h-3 rounded-full bg-emerald-300" />
            <span className="w-3 h-3 rounded-full bg-slate-800" />
            <span className="w-3 h-3 rounded-full bg-amber-200" />
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
            <div className="w-10 h-14 rounded-t-full rounded-b-lg bg-gradient-to-b from-rose-300 to-pink-400 shadow-md" />
            <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm text-[8px] px-1.5 py-0.5 rounded-full font-bold text-rose-700">NEW</span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-purple-950">Velvet Lip Tint</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-2 h-2 fill-amber-400 text-amber-400" />)}</div>
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
            <div className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center"><Boxes className="w-2.5 h-2.5 text-white" /></div>
            <span className="text-[10px] font-bold text-emerald-900">Marketplace</span>
          </div>
          <span className="text-[8px] text-emerald-700 font-semibold">FREE SHIP</span>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1.5">
          <div className="aspect-square rounded bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center"><div className="w-4 h-4 rounded-sm bg-emerald-600/30" /></div>
          <div className="aspect-square rounded bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-orange-500/40" /></div>
          <div className="aspect-square rounded bg-gradient-to-br from-blue-100 to-cyan-200 flex items-center justify-center"><div className="w-4 h-4 rounded bg-blue-500/30 rotate-45" /></div>
          <div className="aspect-square rounded bg-gradient-to-br from-pink-100 to-rose-200" />
          <div className="aspect-square rounded bg-gradient-to-br from-violet-100 to-purple-200" />
          <div className="aspect-square rounded bg-gradient-to-br from-yellow-100 to-amber-200" />
        </div>
      </div>
    </div>
  );
}

type Tile = {
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

const TILES: Tile[] = [
  {
    id: "fashion",
    eyebrow: "Fashion",
    title: "Built for boutiques",
    blurb: "Drop new collections in minutes. Sizes, swatches, and seasonal sales without the headache.",
    perks: ["Size + colour variants", "Lookbook layouts", "Returns + exchanges"],
    cta: "Start a fashion store",
    Icon: Shirt,
    surface: "from-rose-100 via-pink-50 to-fuchsia-100",
    ink: "text-rose-950",
    accent: "text-rose-700",
    pill: "bg-rose-100 text-rose-900 ring-rose-200",
    mock: <MockFashion />,
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
    mock: <MockBeauty />,
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
    mock: <MockGeneral />,
  },
];

export default function JewelleryDarkContainer() {
  return (
    <section className="relative w-full bg-white py-10 sm:py-14 px-4 sm:px-6 font-sans">
      {/* The dark wrapper container */}
      <div className="relative max-w-[1400px] mx-auto rounded-[36px] bg-slate-950 overflow-hidden ring-1 ring-white/5 shadow-[0_40px_80px_-20px_rgba(2,6,23,0.4)]">
        {/* subtle ambient highlights inside the dark container */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-[5%] left-[8%] w-[40%] h-[35%] rounded-full bg-indigo-600/15 blur-[140px]" />
          <div className="absolute top-[35%] right-[8%] w-[40%] h-[35%] rounded-full bg-amber-500/10 blur-[140px]" />
          <div className="absolute bottom-[5%] left-[35%] w-[35%] h-[35%] rounded-full bg-violet-500/10 blur-[140px]" />
        </div>

        <div className="relative px-6 sm:px-10 lg:px-14 py-14 sm:py-20">
          {/* Header */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 mb-5 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Made for your kind of business
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-[1.05]">
              Whatever you sell, <span className="text-white">we have a starter ready</span>
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Pick your category and your store wakes up with the right pages, badges, and payment flows already in place.
            </p>
          </div>

          {/* Spotlight: Jewellery — light card lifted on dark bg */}
          <div className="relative">
            <div className="relative rounded-[28px] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)] ring-1 ring-white/10 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[80%] rounded-full bg-amber-50/80 blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-[40%] h-[60%] rounded-full bg-rose-50/60 blur-[100px]" />
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-6 p-6 sm:p-10 lg:p-12">

                {/* Left: copy + CTA */}
                <div className="lg:col-span-4 order-2 lg:order-1 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 bg-amber-100 text-amber-900 ring-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Featured industry
                  </div>
                  <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full ring-1 bg-amber-50 text-amber-900 ring-amber-200/80 text-[11px] font-bold uppercase tracking-wider">
                    <Gem className="w-3.5 h-3.5" />
                    Jewellery
                  </div>
                  <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1]">
                    Built for <span className="text-slate-900">jewellers</span>.
                  </h3>
                  <p className="text-base text-slate-600 leading-relaxed">
                    From heirloom collections to daily wear, show every karat in the right light. Hallmark badges, GST invoices, and 360° galleries shipped on day one.
                  </p>
                  <button className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors group">
                    Start a jewellery store
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Center: phone */}
                <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
                  <PhoneFrame><StoreJewellery /></PhoneFrame>
                </div>

                {/* Right: support cards */}
                <div className="lg:col-span-3 order-3 space-y-3">
                  <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold tracking-wider text-amber-700 mb-1.5">PRELOADED</div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug">Bridal, daily wear, gifting categories &amp; SEO copy already written</div>
                  </div>
                  <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold tracking-wider text-amber-700 mb-1.5">PROOF</div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug">BIS hallmark badges, certifications &amp; 360° spin gallery built in</div>
                  </div>
                  <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold tracking-wider text-amber-700 mb-1.5">PAYMENTS</div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug">UPI, cards, COD, GST invoices &amp; EMI ready on day one</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-14 mb-7">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="text-[11px] font-bold tracking-[0.25em] text-slate-400 uppercase mb-2">Other categories we love</div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Pick the one that's yours.</h3>
              </div>
              <div className="hidden md:block text-sm text-slate-400 max-w-xs text-right">
                Each category ships with its own templates, payment flows, and copy.
              </div>
            </div>
          </div>

          {/* Tiles row: Fashion, Beauty, General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TILES.map((ind) => (
              <article
                key={ind.id}
                className="relative flex flex-col bg-white rounded-[24px] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.4)] ring-1 ring-white/10 overflow-hidden group hover:-translate-y-1 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] transition-all duration-300"
              >
                <div className={`relative h-[240px] w-full bg-gradient-to-br ${ind.surface} overflow-hidden`}>
                  {ind.mock}
                </div>
                <div className="flex-1 p-6 flex flex-col">
                  <div className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full ring-1 ${ind.pill} text-[11px] font-bold uppercase tracking-wider mb-3`}>
                    <ind.Icon className="w-3.5 h-3.5" />
                    {ind.eyebrow}
                  </div>
                  <h4 className={`text-xl font-bold ${ind.ink} leading-tight mb-2`}>{ind.title}</h4>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{ind.blurb}</p>
                  <ul className="space-y-2 mb-5">
                    {ind.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className={`w-4 h-4 ${ind.accent} mt-0.5 shrink-0`} strokeWidth={3} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-auto inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors group/cta">
                    <span>{ind.cta}</span>
                    <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
