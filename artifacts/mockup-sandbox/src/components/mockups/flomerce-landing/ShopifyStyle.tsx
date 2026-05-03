import React from "react";
import { 
  ArrowRight, 
  CheckCircle2, 
  Store, 
  CreditCard, 
  Smartphone, 
  Globe2, 
  TrendingUp, 
  Menu,
  X,
  Play
} from "lucide-react";

export function ShopifyStyle() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-['Inter'] text-[#1A1A1A] selection:bg-[#004D40] selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#E5E2DC] bg-[#FDFBF7]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="#" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#004D40] text-white font-bold text-xl">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-[#004D40]">Flomerce</span>
              </a>
              <div className="hidden md:flex gap-6">
                <a href="#features" className="text-sm font-medium text-[#4A4A4A] hover:text-[#004D40] transition-colors">Features</a>
                <a href="#solutions" className="text-sm font-medium text-[#4A4A4A] hover:text-[#004D40] transition-colors">Solutions</a>
                <a href="#pricing-section" className="text-sm font-medium text-[#4A4A4A] hover:text-[#004D40] transition-colors">Pricing</a>
                <a href="#resources" className="text-sm font-medium text-[#4A4A4A] hover:text-[#004D40] transition-colors">Resources</a>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <a href="#login" className="text-sm font-medium text-[#4A4A4A] hover:text-[#004D40]">Log in</a>
              <button className="rounded bg-[#004D40] px-4 py-2 text-sm font-medium text-white hover:bg-[#003B31] transition-colors">
                Start free trial
              </button>
            </div>
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[#4A4A4A]">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E2DC] bg-[#FDFBF7] px-4 py-4">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium">Features</a>
              <a href="#pricing" className="text-sm font-medium">Pricing</a>
              <hr className="border-[#E5E2DC]" />
              <button className="w-full rounded bg-[#004D40] px-4 py-2 text-sm font-medium text-white">
                Start free trial
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[#1A1A1A] leading-[1.1]">
                The engine behind your independent business.
              </h1>
              <p className="mt-6 text-lg text-[#4A4A4A] leading-relaxed">
                Flomerce gives you a complete platform to build your store, manage inventory, process payments, and grow your brand. Built for serious merchants who want to scale.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button className="flex items-center justify-center gap-2 rounded bg-[#004D40] px-6 py-3.5 text-base font-medium text-white hover:bg-[#003B31] transition-colors">
                  Start your free trial
                  <ArrowRight size={18} />
                </button>
                <button className="flex items-center justify-center gap-2 rounded border border-[#E5E2DC] bg-white px-6 py-3.5 text-base font-medium text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors">
                  <Play size={18} />
                  Watch Demo
                </button>
              </div>
              <p className="mt-4 text-sm text-[#737373]">No credit card required. 14-day free trial.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded bg-[#E5E2DC]" />
              <img 
                src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=1200" 
                alt="Merchant managing store" 
                className="relative z-10 w-full rounded shadow-xl border border-[#E5E2DC] object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-6 -left-6 z-20 rounded bg-white p-4 shadow-lg border border-[#E5E2DC] flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5E9] text-[#004D40]">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Today's Sales</p>
                  <p className="text-xl font-bold">₹24,500</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="border-y border-[#E5E2DC] bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-[#737373] uppercase tracking-widest mb-8">
            Powering over 10,000 independent businesses across India
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale">
            {/* Logos placeholder using text for mockup */}
            <span className="text-xl font-bold font-serif">The Artisan Baker</span>
            <span className="text-xl font-bold tracking-tighter">URBAN CLOSET</span>
            <span className="text-xl font-bold italic">Lumina Clinic</span>
            <span className="text-xl font-bold uppercase tracking-widest">Kaveri</span>
            <span className="text-xl font-bold">Studio 9</span>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 bg-[#FDFBF7]" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]">Everything you need to run your business</h2>
            <p className="mt-4 text-lg text-[#4A4A4A]">A single, powerful platform that brings all your commerce operations under one roof.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Store className="text-[#004D40]" size={28} />,
                title: "Storefront Design",
                desc: "Launch with beautifully crafted templates. Customize every detail without writing a single line of code."
              },
              {
                icon: <CreditCard className="text-[#004D40]" size={28} />,
                title: "Seamless Payments",
                desc: "Accept credit cards, UPI, and wallets from day one. Fully integrated, automatically reconciled."
              },
              {
                icon: <Smartphone className="text-[#004D40]" size={28} />,
                title: "Mobile Management",
                desc: "Run your entire business from your phone. Track inventory, fulfill orders, and contact customers."
              },
              {
                icon: <Globe2 className="text-[#004D40]" size={28} />,
                title: "Multi-language",
                desc: "Reach customers in their preferred language. Auto-translate your store to regional languages."
              },
              {
                icon: <TrendingUp className="text-[#004D40]" size={28} />,
                title: "Actionable Analytics",
                desc: "Understand your sales trends, track conversion rates, and know exactly what's driving your growth."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 bg-white border border-[#E5E2DC] rounded hover:border-[#004D40] transition-colors cursor-default">
                <div className="mb-6 inline-block p-3 bg-[#F5F3EF] rounded group-hover:bg-[#E8F5E9] transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{feature.title}</h3>
                <p className="text-[#4A4A4A] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split Feature Content */}
      <section className="py-24 bg-white border-y border-[#E5E2DC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <img 
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200" 
                alt="Store owner" 
                className="w-full rounded shadow-md border border-[#E5E2DC]"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-6">Designed for actual merchants.</h2>
              <p className="text-lg text-[#4A4A4A] mb-8 leading-relaxed">
                We didn't build a website builder. We built a commerce engine. Flomerce handles the complex operational details so you can focus on making and selling great products.
              </p>
              <ul className="space-y-4">
                {[
                  "Inventory management that actually makes sense",
                  "Automated tax calculations and GST invoicing",
                  "Built-in abandoned cart recovery via WhatsApp",
                  "Unified inbox for customer inquiries"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#004D40] mt-1 shrink-0" size={20} />
                    <span className="text-[#1A1A1A] font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-[#004D40] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <svg className="mx-auto mb-8 h-12 w-12 text-[#4CAF50] opacity-50" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
          </svg>
          <p className="text-2xl sm:text-3xl font-medium leading-relaxed mb-8">
            "Moving to Flomerce felt like stepping into a professional kitchen after cooking at home. Everything is exactly where it needs to be, and it never crashes when we have a rush of orders."
          </p>
          <div className="flex items-center justify-center gap-4">
            <img 
              src="https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=150" 
              alt="Priya Sharma" 
              className="h-14 w-14 rounded-full object-cover border-2 border-[#4CAF50]"
            />
            <div className="text-left">
              <div className="font-bold">Priya Sharma</div>
              <div className="text-[#A5D6A7] text-sm">Founder, The Artisan Baker</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-[#1A1A1A] mb-6">Ready to build your business?</h2>
          <p className="text-lg text-[#4A4A4A] mb-10">
            Join thousands of independent merchants who trust Flomerce to run their stores.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="rounded bg-[#004D40] px-8 py-4 text-base font-bold text-white hover:bg-[#003B31] transition-colors">
              Start 14-day free trial
            </button>
            <button className="rounded border border-[#E5E2DC] bg-white px-8 py-4 text-base font-bold text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors">
              Talk to sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E2DC] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Storefront</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Payments</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Inventory</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-4">Solutions</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Retail</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Food & Beverage</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Services</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Creators</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Help Center</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Community</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Blog</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Developer API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#1A1A1A] mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">About</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Careers</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Press</a></li>
                <li><a href="#" className="text-sm text-[#4A4A4A] hover:text-[#004D40]">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#E5E2DC] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#004D40] text-white font-bold text-xs">
                F
              </div>
              <span className="text-sm font-bold text-[#004D40]">Flomerce</span>
            </div>
            <p className="text-sm text-[#737373]">© {new Date().getFullYear()} Flomerce Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-sm text-[#737373] hover:text-[#1A1A1A]">Terms</a>
              <a href="#" className="text-sm text-[#737373] hover:text-[#1A1A1A]">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
