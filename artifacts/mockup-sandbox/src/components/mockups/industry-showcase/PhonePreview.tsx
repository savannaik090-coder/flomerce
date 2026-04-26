import React, { useState } from "react";
import { Gem, Shirt, Sparkles, Boxes, ArrowRight, Search, Heart, ShoppingBag, Star, Wifi, Signal, BatteryFull } from "lucide-react";

type Industry = {
  id: string;
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  brandName: string;
  brandFont: string;
  hero: string;
  bullet: string;
  storefront: React.ReactNode;
  badge: string;
  badgeAccent: string;
};

function PhoneFrame({ children, accentBar }: { children: React.ReactNode; accentBar: string }) {
  return (
    <div className="relative mx-auto w-[280px] h-[560px] rounded-[44px] bg-slate-900 p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] ring-[6px] ring-slate-950/80">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[26px] bg-slate-950 rounded-b-2xl z-20"/>
      <div className="relative w-full h-full rounded-[34px] bg-white overflow-hidden">
        <div className={`absolute top-0 inset-x-0 h-[34px] flex items-center justify-between px-6 text-[10px] font-semibold z-10 ${accentBar}`}>
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="w-2.5 h-2.5"/>
            <Wifi className="w-2.5 h-2.5"/>
            <BatteryFull className="w-3 h-3"/>
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
        <div className="flex gap-2.5"><Search className="w-4 h-4 text-stone-700"/><Heart className="w-4 h-4 text-stone-700"/><ShoppingBag className="w-4 h-4 text-stone-700"/></div>
      </div>
      <div className="px-4 py-3 bg-gradient-to-r from-amber-100 to-rose-100 border-b border-amber-200/40">
        <div className="text-[9px] tracking-widest text-amber-800 font-bold mb-0.5">BRIDAL EDIT</div>
        <div className="font-['Playfair_Display'] text-sm font-bold text-stone-900 italic">Heirlooms for the moment</div>
      </div>
      <div className="flex-1 p-3 grid grid-cols-2 gap-2.5 overflow-hidden">
        <div className="rounded-xl bg-gradient-to-br from-amber-200 to-yellow-300 aspect-square shadow-sm relative">
          <span className="absolute top-1.5 right-1.5 bg-emerald-700 text-white text-[7px] px-1.5 py-0.5 rounded font-bold">BIS</span>
          <Gem className="w-8 h-8 text-amber-900/40 absolute inset-0 m-auto" strokeWidth={1}/>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-200 to-amber-200 aspect-square shadow-sm"/>
        <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-amber-300 aspect-square shadow-sm"/>
        <div className="rounded-xl bg-gradient-to-br from-amber-100 to-rose-200 aspect-square shadow-sm"/>
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

function StoreFashion() {
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-rose-100">
        <span className="font-['Playfair_Display'] italic text-base font-bold text-rose-950">étoile.</span>
        <div className="flex gap-2.5"><Search className="w-4 h-4 text-rose-900"/><Heart className="w-4 h-4 text-rose-900"/><ShoppingBag className="w-4 h-4 text-rose-900"/></div>
      </div>
      <div className="px-4 py-3 bg-gradient-to-r from-rose-100 to-pink-200">
        <div className="text-[9px] tracking-widest text-rose-700 font-bold mb-0.5">NEW DROP</div>
        <div className="font-['Playfair_Display'] text-sm font-bold text-rose-950 italic">Spring &nbsp;'26 capsule</div>
      </div>
      <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
        <div className="flex gap-2 overflow-hidden">
          <div className="shrink-0 w-[100px] h-[120px] rounded-xl bg-gradient-to-b from-rose-200 to-pink-300 shadow-sm relative">
            <span className="absolute bottom-1.5 left-1.5 text-[8px] bg-white/90 px-1.5 py-0.5 rounded font-bold text-rose-900">₹2,499</span>
          </div>
          <div className="shrink-0 w-[100px] h-[120px] rounded-xl bg-gradient-to-b from-fuchsia-200 to-rose-300 shadow-sm relative">
            <span className="absolute bottom-1.5 left-1.5 text-[8px] bg-white/90 px-1.5 py-0.5 rounded font-bold text-rose-900">₹1,899</span>
          </div>
          <div className="shrink-0 w-[60px] h-[120px] rounded-xl bg-gradient-to-b from-pink-200 to-rose-300 shadow-sm"/>
        </div>
        <div className="rounded-xl bg-rose-50 p-2.5 ring-1 ring-rose-100">
          <div className="text-[10px] font-bold text-rose-950 mb-1.5">Linen Wrap Dress</div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-300 ring-2 ring-white shadow-sm"/>
            <span className="w-3 h-3 rounded-full bg-emerald-300"/>
            <span className="w-3 h-3 rounded-full bg-slate-800"/>
            <span className="w-3 h-3 rounded-full bg-amber-200"/>
          </div>
          <div className="flex gap-1">
            <span className="text-[9px] px-2 py-0.5 rounded border border-rose-200 text-rose-900">XS</span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-rose-900 text-white">S</span>
            <span className="text-[9px] px-2 py-0.5 rounded border border-rose-200 text-rose-900">M</span>
            <span className="text-[9px] px-2 py-0.5 rounded border border-rose-200 text-rose-900">L</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreBeauty() {
  return (
    <div className="h-full bg-gradient-to-b from-purple-50 via-white to-pink-50 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-purple-100">
        <span className="text-base font-bold tracking-[0.25em] text-purple-950">GLOW</span>
        <div className="flex gap-2.5"><Search className="w-4 h-4 text-purple-900"/><Heart className="w-4 h-4 text-purple-900"/><ShoppingBag className="w-4 h-4 text-purple-900"/></div>
      </div>
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl h-[120px] bg-gradient-to-br from-pink-200 via-purple-200 to-amber-100 relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-20 rounded-t-full rounded-b-lg bg-gradient-to-b from-rose-300 via-pink-400 to-fuchsia-500 shadow-md"/>
          </div>
          <span className="absolute top-2 right-2 bg-white/90 text-[8px] px-1.5 py-0.5 rounded-full font-bold text-rose-700">NEW</span>
          <div className="absolute bottom-2 left-2 text-[9px] font-bold text-purple-950">Velvet Lip Tint</div>
        </div>
      </div>
      <div className="px-4 py-2">
        <div className="text-[9px] font-bold text-purple-900 mb-1.5 tracking-wider">PICK YOUR SHADE</div>
        <div className="grid grid-cols-6 gap-1.5">
          <span className="aspect-square rounded-md bg-rose-300 shadow-sm"/>
          <span className="aspect-square rounded-md bg-pink-400 shadow-sm ring-2 ring-purple-700"/>
          <span className="aspect-square rounded-md bg-fuchsia-500 shadow-sm"/>
          <span className="aspect-square rounded-md bg-rose-700 shadow-sm"/>
          <span className="aspect-square rounded-md bg-amber-300 shadow-sm"/>
          <span className="aspect-square rounded-md bg-orange-400 shadow-sm"/>
        </div>
      </div>
      <div className="px-4 py-2 flex-1">
        <div className="bg-white rounded-xl p-2.5 ring-1 ring-purple-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-purple-950">Velvet Lip Tint</span>
            <span className="text-[10px] font-bold text-purple-700">₹599</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_,i)=><Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400"/>)}
            <span className="text-[8px] text-purple-700 ml-1">2,481 reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreGeneral() {
  return (
    <div className="h-full bg-emerald-50/40 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-emerald-100 bg-white">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center"><Boxes className="w-3 h-3 text-white"/></div>
          <span className="text-sm font-bold text-emerald-900">Marketplace</span>
        </div>
        <div className="flex gap-2.5"><Search className="w-4 h-4 text-emerald-900"/><ShoppingBag className="w-4 h-4 text-emerald-900"/></div>
      </div>
      <div className="px-4 py-2.5">
        <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-3 text-white">
          <div className="text-[9px] font-bold tracking-wider opacity-90 mb-0.5">FREE DELIVERY</div>
          <div className="text-xs font-bold">Over 220 categories. One store.</div>
        </div>
      </div>
      <div className="px-4 pb-2 flex gap-2 overflow-hidden">
        <span className="shrink-0 text-[9px] px-2.5 py-1 rounded-full bg-emerald-900 text-white font-bold">All</span>
        <span className="shrink-0 text-[9px] px-2.5 py-1 rounded-full bg-white ring-1 ring-emerald-200 text-emerald-900 font-semibold">Electronics</span>
        <span className="shrink-0 text-[9px] px-2.5 py-1 rounded-full bg-white ring-1 ring-emerald-200 text-emerald-900 font-semibold">Home</span>
        <span className="shrink-0 text-[9px] px-2.5 py-1 rounded-full bg-white ring-1 ring-emerald-200 text-emerald-900 font-semibold">Snacks</span>
      </div>
      <div className="flex-1 p-3 grid grid-cols-3 gap-2 overflow-hidden">
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-emerald-200 to-teal-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Earphones</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹1,299</div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-orange-200 to-amber-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Snack Box</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹449</div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-blue-200 to-cyan-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Bottle</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹599</div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-pink-200 to-rose-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Mug</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹349</div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-violet-200 to-purple-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Plant</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹799</div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-emerald-100 p-2 shadow-sm">
          <div className="aspect-square rounded bg-gradient-to-br from-yellow-200 to-amber-300 mb-1"/>
          <div className="text-[8px] font-bold text-emerald-950">Candle</div>
          <div className="text-[8px] text-emerald-700 font-bold">₹399</div>
        </div>
      </div>
    </div>
  );
}

const INDUSTRIES: Industry[] = [
  {
    id: "jewellery", name: "Jewellery", Icon: Gem,
    brandName: "AURELIA", brandFont: "italic font-['Cormorant_Garamond']",
    hero: "Pre-loaded with bridal sets, daily wear, BIS hallmark badges, and 360° galleries.",
    bullet: "Trusted by 1,400+ jewellers",
    storefront: <StoreJewellery/>,
    badge: "BIS-ready", badgeAccent: "bg-amber-100 text-amber-900 ring-amber-200",
  },
  {
    id: "fashion", name: "Fashion", Icon: Shirt,
    brandName: "étoile.", brandFont: "italic font-['Playfair_Display']",
    hero: "Sized, swatched, and lookbook-ready. Drops, exchanges, and seasonal sales sorted out of the box.",
    bullet: "Used by 3,200+ boutiques",
    storefront: <StoreFashion/>,
    badge: "Variants built in", badgeAccent: "bg-rose-100 text-rose-900 ring-rose-200",
  },
  {
    id: "beauty", name: "Beauty", Icon: Sparkles,
    brandName: "GLOW & CO", brandFont: "font-bold tracking-[0.2em]",
    hero: "Shade pickers, ingredient drawers, subscription orders. Built to turn first orders into rituals.",
    bullet: "Loved by 900+ beauty brands",
    storefront: <StoreBeauty/>,
    badge: "Subscriptions ready", badgeAccent: "bg-purple-100 text-purple-900 ring-purple-200",
  },
  {
    id: "general", name: "Anything else", Icon: Boxes,
    brandName: "Marketplace", brandFont: "font-bold",
    hero: "Electronics, snacks, plants, art, services. Mix categories, payment modes, and delivery types in one store.",
    bullet: "Powering 12,000+ general stores",
    storefront: <StoreGeneral/>,
    badge: "All categories", badgeAccent: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  },
];

export default function PhonePreview() {
  const [active, setActive] = useState("jewellery");
  const current = INDUSTRIES.find((i) => i.id === active)!;

  return (
    <section className="relative w-full bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20 overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute top-[20%] left-[10%] w-[35%] h-[40%] rounded-full bg-rose-100/40 blur-[120px]"/>
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[40%] rounded-full bg-emerald-100/40 blur-[120px]"/>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-8 text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 mb-5 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500"/>
          See your store before you build it
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 max-w-3xl mx-auto leading-[1.05]">
          Pick your category. <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-violet-600">Watch your store come alive.</span>
        </h2>
        <p className="text-base text-slate-600 max-w-xl mx-auto">
          Tap through the industries below — every preview is what your storefront actually looks like on day one.
        </p>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-8 mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {INDUSTRIES.map((ind) => {
            const isActive = ind.id === active;
            return (
              <button
                key={ind.id}
                onClick={() => setActive(ind.id)}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <ind.Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-slate-500"}`}/>
                {ind.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">

          <div className="lg:col-span-4 order-2 lg:order-1 space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 ${current.badgeAccent}`}>
              <current.Icon className="w-3.5 h-3.5"/>
              {current.badge}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 leading-tight">{current.hero}</h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className="flex">{[...Array(5)].map((_,i)=><Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400"/>)}</span>
              <span>{current.bullet}</span>
            </div>
            <button className="mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors group">
              Start a {current.name.toLowerCase()} store
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/>
            </button>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
            <PhoneFrame accentBar="text-slate-900">{current.storefront}</PhoneFrame>
          </div>

          <div className="lg:col-span-3 order-3 space-y-3">
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold tracking-wider text-slate-500 mb-1.5">PRELOADED</div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">Industry-specific categories &amp; SEO copy already written</div>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold tracking-wider text-slate-500 mb-1.5">PAYMENTS</div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">UPI, cards, COD, and EMI ready to accept on day one</div>
            </div>
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
              <div className="text-[10px] font-bold tracking-wider text-slate-500 mb-1.5">SHIPPING</div>
              <div className="text-sm font-semibold text-slate-900 leading-snug">Pickup partners pre-wired to over 26,000 PIN codes</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
