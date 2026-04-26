import React, { useState } from "react";
import { Gem, Shirt, Sparkles, Boxes, ArrowUpRight } from "lucide-react";

type Industry = {
  id: string;
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  hero: string;
  body: string;
  chips: string[];
  preview: React.ReactNode;
  ringClass: string;
  inkClass: string;
};

function PreviewJewellery() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-stone-100 via-amber-50 to-rose-100 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_30%,#000_1px,transparent_1px)] [background-size:18px_18px]"/>
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <span className="text-xs font-['Cormorant_Garamond'] italic font-bold text-stone-900 tracking-[0.3em]">AURELIA</span>
        <span className="text-[10px] text-stone-600 tracking-wider">EST. 1989</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-[200px] h-[260px] rounded-sm bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-400 shadow-2xl flex items-center justify-center">
            <Gem className="w-20 h-20 text-amber-900/40" strokeWidth={1}/>
          </div>
          <div className="absolute -bottom-3 -right-3 bg-white shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600"/>
            <span className="text-[10px] font-bold text-stone-800">BIS Hallmarked</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-stone-600 tracking-wider mb-1">BRIDAL COLLECTION</div>
          <div className="font-['Playfair_Display'] text-xl font-bold text-stone-900 italic">Sitara Necklace Set</div>
        </div>
        <div className="font-['Playfair_Display'] text-2xl font-bold text-stone-900">₹4.2L</div>
      </div>
    </div>
  );
}

function PreviewFashion() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-100 overflow-hidden">
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <span className="text-xs font-['Playfair_Display'] italic font-bold text-rose-950">étoile.</span>
        <span className="text-[10px] text-rose-700 tracking-wider">SS '26</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <div className="relative">
          <div className="w-[180px] h-[260px] rounded-2xl bg-gradient-to-b from-rose-200 via-pink-300 to-rose-400 shadow-2xl flex items-end justify-center pb-6">
            <div className="w-12 h-32 bg-gradient-to-b from-rose-50/80 to-pink-100/60 rounded-t-full"/>
          </div>
          <div className="absolute -left-4 top-12 bg-white shadow-lg rounded-lg p-2.5 w-[120px]">
            <div className="text-[9px] text-rose-900 font-semibold mb-1">SHADES</div>
            <div className="flex gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-400 ring-2 ring-white shadow-sm"/>
              <span className="w-4 h-4 rounded-full bg-emerald-400"/>
              <span className="w-4 h-4 rounded-full bg-slate-800"/>
              <span className="w-4 h-4 rounded-full bg-amber-300"/>
            </div>
          </div>
          <div className="absolute -right-4 bottom-16 bg-white shadow-lg rounded-lg px-2.5 py-1.5">
            <div className="text-[9px] font-bold text-rose-700">FREE EXCHANGES</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-rose-700 tracking-wider mb-1">NEW IN</div>
          <div className="font-['Playfair_Display'] text-xl font-bold text-rose-950 italic">Linen Wrap Dress</div>
        </div>
        <div className="font-['Playfair_Display'] text-2xl font-bold text-rose-950">₹2,499</div>
      </div>
    </div>
  );
}

function PreviewBeauty() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 overflow-hidden">
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <span className="text-xs font-bold text-purple-950 tracking-[0.3em]">GLOW &amp; CO</span>
        <span className="text-[10px] text-purple-700 tracking-wider">CLEAN BEAUTY</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-[120px] h-[200px] rounded-t-[40%] rounded-b-2xl bg-gradient-to-b from-rose-300 via-pink-400 to-fuchsia-500 shadow-2xl"/>
          <div className="absolute -left-12 top-4 bg-white shadow-lg rounded-xl p-2.5 w-[110px]">
            <div className="text-[9px] text-purple-900 font-bold mb-1.5">PICK YOUR SHADE</div>
            <div className="grid grid-cols-4 gap-1">
              <span className="aspect-square rounded bg-rose-300"/>
              <span className="aspect-square rounded bg-pink-400 ring-2 ring-purple-600"/>
              <span className="aspect-square rounded bg-fuchsia-500"/>
              <span className="aspect-square rounded bg-rose-700"/>
              <span className="aspect-square rounded bg-amber-300"/>
              <span className="aspect-square rounded bg-orange-400"/>
              <span className="aspect-square rounded bg-rose-500"/>
              <span className="aspect-square rounded bg-red-700"/>
            </div>
          </div>
          <div className="absolute -right-10 bottom-8 bg-white shadow-lg rounded-xl px-2.5 py-2">
            <div className="text-[9px] font-bold text-emerald-700 leading-tight">VEGAN<br/>CRUELTY-FREE</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-purple-700 tracking-wider mb-1">BESTSELLER</div>
          <div className="font-['Playfair_Display'] text-xl font-bold text-purple-950 italic">Velvet Lip Tint</div>
        </div>
        <div className="font-['Playfair_Display'] text-2xl font-bold text-purple-950">₹599</div>
      </div>
    </div>
  );
}

function PreviewGeneral() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 overflow-hidden">
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-950 tracking-[0.2em] flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5"/>MARKETPLACE</span>
        <span className="text-[10px] text-emerald-700 font-semibold">FREE COD</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-emerald-200 to-teal-400 shadow-lg flex items-center justify-center"><div className="w-7 h-7 rounded bg-emerald-700/30"/></div>
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-orange-200 to-amber-400 shadow-lg flex items-center justify-center"><div className="w-7 h-7 rounded-full bg-orange-700/30"/></div>
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-blue-200 to-cyan-400 shadow-lg flex items-center justify-center"><div className="w-7 h-7 rotate-45 bg-blue-700/30"/></div>
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-pink-200 to-rose-400 shadow-lg"/>
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-violet-200 to-purple-400 shadow-lg"/>
          <div className="w-[80px] h-[80px] rounded-xl bg-gradient-to-br from-yellow-200 to-amber-400 shadow-lg"/>
        </div>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-emerald-700 tracking-wider mb-1">220 CATEGORIES</div>
          <div className="font-['Playfair_Display'] text-xl font-bold text-emerald-950 italic">Whatever you sell</div>
        </div>
        <div className="font-['Playfair_Display'] text-xl font-bold text-emerald-950">→</div>
      </div>
    </div>
  );
}

const INDUSTRIES: Industry[] = [
  {
    id: "jewellery", name: "Jewellery", Icon: Gem,
    hero: "For the makers of forever pieces.",
    body: "Display every karat and clasp the way it deserves. Hallmark badges, GST invoicing, and 360° galleries shipped on day one.",
    chips: ["BIS hallmark proof", "360° spin galleries", "GST invoice ready"],
    preview: <PreviewJewellery/>,
    ringClass: "ring-amber-300", inkClass: "text-amber-900",
  },
  {
    id: "fashion", name: "Fashion", Icon: Shirt,
    hero: "For boutiques that drop a new look every Friday.",
    body: "Sizes, swatches, lookbooks, and seasonal sales — all the things a fashion store needs without the headache.",
    chips: ["Size + swatch variants", "Lookbook layouts", "Returns + exchanges"],
    preview: <PreviewFashion/>,
    ringClass: "ring-rose-300", inkClass: "text-rose-900",
  },
  {
    id: "beauty", name: "Beauty", Icon: Sparkles,
    hero: "For brands that make people feel something.",
    body: "Shade pickers, ingredient drawers, subscriptions, and the kind of polish that turns a first visit into a third order.",
    chips: ["Shade + tone pickers", "Ingredient drawers", "Subscribe & save"],
    preview: <PreviewBeauty/>,
    ringClass: "ring-purple-300", inkClass: "text-purple-900",
  },
  {
    id: "general", name: "Anything else", Icon: Boxes,
    hero: "For everyone in between.",
    body: "Electronics, plants, food, services, art, custom orders. If you can ship it or schedule it, your store knows what to do.",
    chips: ["Unlimited categories", "Product + service mix", "COD + UPI on launch"],
    preview: <PreviewGeneral/>,
    ringClass: "ring-emerald-300", inkClass: "text-emerald-900",
  },
];

export default function EditorialTabs() {
  const [active, setActive] = useState("jewellery");
  const current = INDUSTRIES.find((i) => i.id === active)!;

  return (
    <section className="relative w-full bg-stone-50 py-16 sm:py-20 overflow-hidden font-sans">
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

          <div className="lg:col-span-5 lg:sticky lg:top-12">
            <div className="text-[11px] font-bold tracking-[0.25em] text-stone-500 uppercase mb-4">Built for your business</div>
            <h2 className="font-['Playfair_Display'] text-5xl lg:text-6xl font-bold text-stone-900 leading-[1.0] tracking-tight mb-6">
              Whatever you sell,<br/>
              <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-rose-700 to-amber-700">we make it shine.</span>
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8 max-w-md">
              Tell us your category and your store wakes up with the right pages, badges, and copy already in place.
            </p>

            <div className="flex flex-col gap-1.5">
              {INDUSTRIES.map((ind) => {
                const isActive = ind.id === active;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setActive(ind.id)}
                    className={`group flex items-center justify-between text-left px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-stone-900 text-white shadow-md"
                        : "bg-transparent text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ind.Icon className={`w-5 h-5 ${isActive ? "text-amber-300" : "text-stone-500"}`}/>
                      <span className={`text-base font-semibold ${isActive ? "text-white" : ""}`}>{ind.name}</span>
                    </div>
                    <ArrowUpRight className={`w-4 h-4 transition-transform ${isActive ? "text-amber-300 -translate-y-0.5 translate-x-0.5" : "text-stone-400 group-hover:translate-x-0.5"}`}/>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className={`relative rounded-[28px] bg-white shadow-xl ring-1 ring-stone-200 overflow-hidden transition-all duration-300`}>
              <div className="relative aspect-[4/5] lg:aspect-[5/6] w-full">
                {current.preview}
              </div>
              <div className="p-7 lg:p-9 border-t border-stone-100">
                <h3 className={`font-['Playfair_Display'] text-3xl lg:text-4xl font-bold ${current.inkClass} italic leading-tight mb-3`}>
                  {current.hero}
                </h3>
                <p className="text-base text-stone-600 leading-relaxed mb-5 max-w-xl">{current.body}</p>
                <div className="flex flex-wrap gap-2">
                  {current.chips.map((chip) => (
                    <span
                      key={chip}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 ring-1 ring-stone-200 text-stone-800`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
