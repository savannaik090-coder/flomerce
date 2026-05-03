import React, { useState } from 'react';
import { ArrowRight, ChevronRight, CheckCircle2, Globe, CreditCard, LayoutTemplate, MessageSquare, Zap, BarChart3, Store, Calendar, Smartphone, ShoppingBag, Settings, Menu, Bell, Search, Users } from 'lucide-react';

// Fake UI Components to act as "High-fidelity screenshots"

const DashboardUI = () => (
  <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col h-[600px]">
    <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
          <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
          <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
        </div>
        <div className="h-6 w-64 bg-zinc-800 rounded-md flex items-center px-2">
          <Search className="w-3 h-3 text-zinc-500 mr-2" />
          <div className="h-2 w-16 bg-zinc-700 rounded"></div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-zinc-400" />
        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700"></div>
      </div>
    </div>
    <div className="flex flex-1 overflow-hidden">
      <div className="w-48 border-r border-zinc-800 bg-zinc-900/20 p-4 flex flex-col gap-2">
        {['Overview', 'Orders', 'Products', 'Customers', 'Analytics', 'Settings'].map((item, i) => (
          <div key={item} className={`h-8 rounded-md px-3 flex items-center text-sm ${i === 0 ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>
            {item}
          </div>
        ))}
      </div>
      <div className="flex-1 p-8 bg-[#0a0a0a] overflow-y-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Overview</h2>
            <p className="text-sm text-zinc-400">Your store's performance today.</p>
          </div>
          <div className="h-9 px-4 bg-white text-black rounded-md flex items-center text-sm font-medium">
            Add Product
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: '₹24,500', trend: '+12.5%' },
            { label: 'Orders', value: '42', trend: '+5.2%' },
            { label: 'Store Visits', value: '1,204', trend: '+18.1%' }
          ].map((stat, i) => (
             <div key={i} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40">
               <div className="text-zinc-400 text-sm mb-2">{stat.label}</div>
               <div className="flex items-end gap-3">
                 <div className="text-2xl font-semibold text-white">{stat.value}</div>
                 <div className="text-emerald-400 text-xs mb-1">{stat.trend}</div>
               </div>
             </div>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-white font-medium mb-4">Recent Orders</div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-zinc-800"></div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Order #{1042 + i}</div>
                    <div className="text-xs text-zinc-500">2 items • Today, 14:30</div>
                  </div>
                </div>
                <div className="text-sm text-zinc-300 font-medium">₹1,250</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EditorUI = () => (
  <div className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col h-[500px]">
    <div className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
      <div className="text-sm font-medium text-zinc-300">Theme Editor</div>
      <div className="flex gap-2">
        <div className="h-7 px-3 bg-zinc-800 text-zinc-300 rounded flex items-center text-xs font-medium">Draft</div>
        <div className="h-7 px-3 bg-white text-black rounded flex items-center text-xs font-medium">Publish</div>
      </div>
    </div>
    <div className="flex flex-1 overflow-hidden">
      <div className="w-64 border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sections</div>
        {[
          { name: 'Header', active: false },
          { name: 'Hero Banner', active: true },
          { name: 'Featured Products', active: false },
          { name: 'Rich Text', active: false },
          { name: 'Footer', active: false }
        ].map((sec) => (
          <div key={sec.name} className={`p-3 rounded-lg border ${sec.active ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-800/50 bg-zinc-900/30'}`}>
            <div className={`text-sm font-medium ${sec.active ? 'text-white' : 'text-zinc-400'}`}>{sec.name}</div>
            {sec.active && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-2 w-full bg-zinc-700 rounded"></div>
                <div className="h-2 w-3/4 bg-zinc-700 rounded"></div>
                <div className="h-8 w-full border border-zinc-600 rounded mt-2"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 bg-zinc-900 p-8 flex items-center justify-center">
        {/* Preview Area */}
        <div className="w-[375px] h-[667px] bg-white rounded-[2.5rem] border-8 border-zinc-950 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-6 bg-zinc-950 flex justify-center">
            <div className="w-32 h-4 bg-zinc-950 rounded-b-2xl"></div>
          </div>
          <div className="p-6 pt-12 flex flex-col h-full">
            <div className="flex justify-between items-center mb-8">
              <div className="font-bold text-xl text-black">Aura.</div>
              <Menu className="w-5 h-5 text-black" />
            </div>
            <div className="bg-zinc-100 rounded-2xl h-64 mb-6 flex items-center justify-center relative overflow-hidden">
               <img src="https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=800&q=80" alt="Ceramic" className="absolute inset-0 w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-black/20"></div>
               <div className="relative z-10 text-center px-4">
                 <h2 className="text-white text-2xl font-bold mb-2">New Arrivals</h2>
                 <div className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full inline-block">Shop Now</div>
               </div>
            </div>
            <div className="flex justify-between items-end mb-4">
              <div className="font-semibold text-lg text-black">Trending</div>
              <div className="text-sm text-zinc-500">View all</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-100 rounded-xl h-32"></div>
              <div className="bg-zinc-100 rounded-xl h-32"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export function ProductLed() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="w-6 h-6 bg-white rounded-sm"></div>
              flomerce
            </a>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Templates</a>
              <a href="#" className="hover:text-white transition-colors">Customers</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Log in</a>
            <a href="#" className="h-9 px-4 bg-white text-black rounded-md flex items-center text-sm font-medium hover:bg-zinc-200 transition-colors">
              Start Building
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Glow behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-zinc-800/30 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-sm font-medium text-zinc-300 mb-8">
            <SparklesIcon className="w-4 h-4 text-zinc-400" />
            Flomerce 2.0 is now available
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 max-w-4xl mx-auto leading-[1.1]">
            Everything you need to run your business online.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop stitching together clunky tools. Flomerce gives you a beautiful storefront, payments, appointments, and marketing—all in one unified platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="h-12 px-8 bg-white text-black rounded-lg flex items-center text-base font-semibold hover:bg-zinc-200 transition-colors w-full sm:w-auto justify-center">
              Start your free trial
            </a>
            <a href="#" className="h-12 px-8 bg-zinc-900 border border-zinc-800 text-white rounded-lg flex items-center text-base font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Hero UI Showcase */}
      <section className="px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl p-2 bg-gradient-to-b from-zinc-800/50 to-transparent">
            <DashboardUI />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-zinc-900 bg-[#0c0c0c]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">A complete commerce operating system.</h2>
            <p className="text-zinc-400 text-lg">We built the hard parts so you don't have to. Flomerce combines enterprise-grade infrastructure with the simplicity of a consumer app.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<LayoutTemplate />}
              title="Visual Storefront Editor"
              desc="Design a studio-quality store without code. Choose from premium templates and customize every detail."
            />
            <FeatureCard 
              icon={<CreditCard />}
              title="Integrated Payments"
              desc="Accept UPI, cards, and netbanking out of the box with zero setup required. Fast settlements."
            />
            <FeatureCard 
              icon={<ShoppingBag />}
              title="Order Management"
              desc="Process orders, print shipping labels, and track inventory across multiple locations."
            />
            <FeatureCard 
              icon={<Calendar />}
              title="Appointments & Booking"
              desc="Perfect for salons, clinics, and coaches. Let clients book time slots directly on your site."
            />
            <FeatureCard 
              icon={<MessageSquare />}
              title="WhatsApp Marketing"
              desc="Recover abandoned carts and send promotional broadcasts directly to your customers' WhatsApp."
            />
            <FeatureCard 
              icon={<Globe />}
              title="Multi-language Support"
              desc="Reach customers in their preferred language. Auto-translate your store with one click."
            />
          </div>
        </div>
      </section>

      {/* Deep Dive: The Editor */}
      <section className="py-32 px-6 border-t border-zinc-900 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-sm font-medium text-zinc-300 mb-6">
                Storefronts
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                Design without limits.
              </h2>
              <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                Your brand deserves more than a generic template. Our visual editor gives you fine-grained control over layout, typography, and motion. Build an immersive experience that converts visitors into customers.
              </p>
              <ul className="flex flex-col gap-4">
                {[
                  'Responsive by default on all devices',
                  'Dozens of premium sections and blocks',
                  'Global style tokens for brand consistency'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-zinc-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800/30 to-transparent blur-3xl -z-10 transform translate-x-10 translate-y-10"></div>
              <EditorUI />
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="py-24 px-6 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-16">Trusted by fast-growing independent brands</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '10k+', label: 'Active Merchants' },
              { value: '₹500M+', label: 'GMV Processed' },
              { value: '99.99%', label: 'Uptime SLA' },
              { value: '24/7', label: 'Local Support' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-zinc-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/40 via-[#0a0a0a] to-[#0a0a0a]"></div>
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Ready to launch?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join thousands of merchants running their business on Flomerce. Setup takes minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="h-14 px-10 bg-white text-black rounded-lg flex items-center text-lg font-semibold hover:bg-zinc-200 transition-colors w-full sm:w-auto justify-center">
              Start your 14-day free trial
            </a>
          </div>
          <p className="mt-6 text-sm text-zinc-500">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg text-white">
            <div className="w-5 h-5 bg-white rounded-sm"></div>
            flomerce
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
          <div className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Flomerce Inc.
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  );
}
