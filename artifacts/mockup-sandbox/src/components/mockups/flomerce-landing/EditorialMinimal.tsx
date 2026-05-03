import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Globe, CreditCard, MessageSquare, LineChart, MoveRight, ChevronRight } from "lucide-react";

export function EditorialMinimal() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#111111] font-['Inter'] selection:bg-[#D95A2B] selection:text-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-[#F9F8F6]/90 backdrop-blur-md py-4 shadow-sm" : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#111111] rounded-sm flex items-center justify-center">
              <span className="text-[#F9F8F6] font-['Playfair_Display'] font-bold italic text-sm leading-none">F</span>
            </div>
            <span className="font-['Inter'] font-semibold tracking-tight text-lg">flomerce</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#111111]/70">
            <a href="#platform" className="hover:text-[#111111] transition-colors">Platform</a>
            <a href="#testimonial" className="hover:text-[#111111] transition-colors">Customers</a>
            <a href="#pricing" className="hover:text-[#111111] transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="#login" className="hidden md:block hover:text-[#111111]/70 transition-colors">Sign in</a>
            <a href="#start" className="bg-[#111111] text-[#F9F8F6] px-5 py-2.5 rounded-full hover:bg-[#D95A2B] transition-colors duration-300">
              Start building
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#111111]/10 text-xs font-medium tracking-wide uppercase text-[#111111]/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D95A2B]"></span>
              Flomerce 2.0 is here
            </div>
            <h1 className="font-['Playfair_Display'] text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight">
              The serious platform for <span className="italic text-[#D95A2B]">ambitious</span> brands.
            </h1>
            <p className="text-xl md:text-2xl text-[#111111]/70 font-light max-w-2xl leading-relaxed">
              Skip the templates. Build a premium online storefront with built-in payments, appointments, and multi-language support. Designed for those who demand excellence.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
              <a href="#start" className="bg-[#111111] text-[#F9F8F6] px-8 py-4 rounded-full font-medium text-lg flex items-center gap-2 hover:bg-[#D95A2B] transition-colors duration-300 w-full sm:w-auto justify-center">
                Start your 14-day trial
                <MoveRight className="w-5 h-5" />
              </a>
              <span className="text-sm text-[#111111]/50 pl-2">No credit card required.</span>
            </div>
          </div>
          
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=80" 
                alt="Minimalist boutique interior" 
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p className="font-['Playfair_Display'] italic text-2xl mb-2">"Flomerce elevated our brand instantly."</p>
                <p className="text-sm font-medium uppercase tracking-wider opacity-80">Studio Nōe, Mumbai</p>
              </div>
            </div>
            
            {/* Floating stats card */}
            <div className="absolute -left-12 top-1/4 bg-white p-6 rounded-2xl shadow-xl hidden md:block max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</p>
                  <p className="font-bold text-xl">+42%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-snug">Average increase in sales for premium merchants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-12 border-y border-[#111111]/10 bg-[#F1EFEA]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-sm font-medium text-[#111111]/50 uppercase tracking-widest whitespace-nowrap">Trusted by industry leaders</p>
          <div className="flex items-center justify-center flex-wrap gap-8 md:gap-16 opacity-60 grayscale mix-blend-multiply">
            {["Vogue", "Kinfolk", "Cereal", "Monocle", "Architectural Digest"].map((logo) => (
              <span key={logo} className="font-['Playfair_Display'] font-bold text-2xl italic">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Editorial */}
      <section id="platform" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-20 max-w-3xl">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl leading-tight mb-6">
            Everything you need. <br />Nothing you don't.
          </h2>
          <p className="text-xl text-[#111111]/70 font-light">
            We stripped away the clutter so you can focus on what matters: your product, your brand, and your customers.
          </p>
        </div>

        <div className="space-y-32">
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 space-y-6">
              <div className="w-12 h-12 rounded-full border border-[#111111]/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#D95A2B]" />
              </div>
              <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl">Immersive Storefronts</h3>
              <p className="text-lg text-[#111111]/70 font-light leading-relaxed">
                Choose from our curated collection of editorial templates or build your own with our visual editor. Fast, responsive, and breathtakingly beautiful on every device.
              </p>
              <ul className="space-y-3 pt-4">
                {["Visual page builder", "Global CDN infrastructure", "Native multi-language support"].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#D95A2B]" />
                    <span className="font-medium text-[#111111]/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2 aspect-square bg-[#F1EFEA] rounded-2xl overflow-hidden">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80" alt="Immersive storefront" className="object-cover w-full h-full" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] bg-[#F1EFEA] rounded-2xl overflow-hidden shadow-lg">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=80" alt="Payments integration" className="object-cover w-full h-full" />
            </div>
            <div className="space-y-6 md:pl-12">
              <div className="w-12 h-12 rounded-full border border-[#111111]/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#D95A2B]" />
              </div>
              <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl">Frictionless Commerce</h3>
              <p className="text-lg text-[#111111]/70 font-light leading-relaxed">
                Accept payments globally from day one. Native integrations with Stripe and Razorpay mean your customers enjoy a seamless checkout experience.
              </p>
              <a href="#payments" className="inline-flex items-center gap-2 text-[#D95A2B] font-medium hover:gap-3 transition-all">
                Explore payments <MoveRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 space-y-6">
              <div className="w-12 h-12 rounded-full border border-[#111111]/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#D95A2B]" />
              </div>
              <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl">Client Relationships</h3>
              <p className="text-lg text-[#111111]/70 font-light leading-relaxed">
                Beyond transactions. Manage appointments, recover abandoned carts via WhatsApp, and build loyalty with built-in CRM tools designed for relationship businesses.
              </p>
            </div>
            <div className="order-1 md:order-2 aspect-square bg-[#F1EFEA] rounded-2xl overflow-hidden">
              <img src="https://images.unsplash.com/photo-1556217466-96b61a7a28e7?auto=format&fit=crop&w=1000&q=80" alt="Client relationships" className="object-cover w-full h-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Quote / Testimonial */}
      <section className="py-24 bg-[#111111] text-[#F9F8F6] text-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-[#D95A2B] mb-8 flex justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.017 18L16.461 11.236H11.236V4H19.983V11.236L17.539 18H14.017ZM6.781 18L9.225 11.236H4V4H12.747V11.236L10.303 18H6.781Z" />
            </svg>
          </div>
          <h2 className="font-['Playfair_Display'] italic text-3xl md:text-5xl leading-tight mb-10">
            "We moved from Shopify because we wanted our online presence to match the quality of our physical spaces. Flomerce provided the refinement we were looking for."
          </h2>
          <div className="flex items-center justify-center gap-4">
            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" alt="Sarah Jenkins" className="w-12 h-12 rounded-full border border-white/20" />
            <div className="text-left">
              <p className="font-medium">Elena Rostova</p>
              <p className="text-sm text-white/50">Founder, Maison Rostova</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-[#111111]/60">Start free. Upgrade when you need more power.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan 1 */}
          <div className="border border-[#111111]/10 rounded-2xl p-10 bg-white shadow-sm hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-medium mb-2">Essential</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-['Playfair_Display']">$29</span>
              <span className="text-[#111111]/50">/month</span>
            </div>
            <p className="text-sm text-[#111111]/70 mb-8 pb-8 border-b border-[#111111]/10">
              For ambitious individuals and new brands starting their journey.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "1 Premium Storefront",
                "Unlimited Products",
                "Built-in Payments (2% fee)",
                "Standard Support"
              ].map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#D95A2B] shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-6 rounded-full border border-[#111111] font-medium hover:bg-[#111111] hover:text-white transition-colors">
              Start Free Trial
            </button>
          </div>

          {/* Plan 2 */}
          <div className="border-2 border-[#111111] rounded-2xl p-10 bg-[#111111] text-white shadow-xl relative">
            <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[#D95A2B] text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
              Recommended
            </div>
            <h3 className="text-xl font-medium mb-2">Professional</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-['Playfair_Display']">$79</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-sm text-white/70 mb-8 pb-8 border-b border-white/10">
              For growing businesses that need advanced tools and lower fees.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Everything in Essential",
                "Multi-language Support",
                "Reduced Payment Fees (1%)",
                "WhatsApp Integration",
                "Priority 24/7 Support"
              ].map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#D95A2B] shrink-0 mt-0.5" />
                  <span className="text-white/90">{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-6 rounded-full bg-white text-[#111111] font-medium hover:bg-[#D95A2B] hover:text-white hover:border-[#D95A2B] transition-colors">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 bg-[#F1EFEA]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-['Playfair_Display'] text-5xl md:text-6xl leading-tight">
            Ready to build something <span className="italic text-[#D95A2B]">extraordinary?</span>
          </h2>
          <p className="text-xl text-[#111111]/70 font-light max-w-2xl mx-auto">
            Join thousands of premium brands that use Flomerce to run their entire business.
          </p>
          <div className="pt-8">
            <a href="#start" className="inline-flex bg-[#111111] text-[#F9F8F6] px-10 py-5 rounded-full font-medium text-lg items-center gap-3 hover:bg-[#D95A2B] transition-all hover:gap-5">
              Launch your store today
              <MoveRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] text-white/60 py-16 px-6 md:px-12 text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                <span className="text-[#111111] font-['Playfair_Display'] font-bold italic text-sm leading-none">F</span>
              </div>
              <span className="text-white font-['Inter'] font-semibold tracking-tight text-lg">flomerce</span>
            </div>
            <p className="max-w-sm">
              The premium commerce operating system for modern brands, boutiques, and service professionals.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">Storefronts</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Payments</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Appointments</a></li>
              <li><a href="#" className="hover:text-white transition-colors">WhatsApp</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Customers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Flomerce Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
