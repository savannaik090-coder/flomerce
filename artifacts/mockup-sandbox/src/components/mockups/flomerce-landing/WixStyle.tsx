import React from "react";
import { ArrowRight, CheckCircle2, Play, Star, Store, Calendar, CreditCard, Globe } from "lucide-react";

const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    .wix-style-page {
      --brand-primary: #0F3A2E; /* Deep forest green */
      --brand-accent: #E5F3B4; /* Soft mint/lime wash */
      --brand-accent-hover: #D4E893;
      --brand-peach: #FFE5D9;
      --brand-lavender: #E8E1F5;
      --brand-blue: #D6EFFF;
      --text-main: #1A1A1A;
      --text-muted: #555555;
      
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text-main);
      background-color: #FAFAFA;
      overflow-x: hidden;
    }

    .wix-style-page h1, .wix-style-page h2, .wix-style-page h3, .wix-style-page h4, .wix-style-page .font-display {
      font-family: 'Outfit', sans-serif;
      letter-spacing: -0.02em;
    }

    .btn-primary {
      background-color: var(--brand-primary);
      color: white;
      border-radius: 9999px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(15, 58, 46, 0.4);
    }

    .btn-secondary {
      background-color: white;
      color: var(--brand-primary);
      border: 1px solid #E5E5E5;
      border-radius: 9999px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      border-color: var(--brand-primary);
      background-color: #F8F9FA;
    }

    .glass-nav {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .hero-wash {
      background: linear-gradient(135deg, var(--brand-peach) 0%, var(--brand-accent) 100%);
      border-radius: 2rem;
    }

    .feature-card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      transition: all 0.3s ease;
      border: 1px solid rgba(0,0,0,0.03);
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px -20px rgba(0,0,0,0.08);
    }

    .hover-lift {
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hover-lift:hover {
      transform: translateY(-8px);
    }
  `}} />
);

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0F3A2E] flex items-center justify-center text-white font-display font-bold text-xl">
          F
        </div>
        <span className="font-display font-bold text-xl tracking-tight">flomerce</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 font-medium text-[15px] text-[#555]">
        <a href="#platform" className="hover:text-[#1A1A1A] transition-colors">Platform</a>
        <a href="#templates" className="hover:text-[#1A1A1A] transition-colors">Templates</a>
        <a href="#stories" className="hover:text-[#1A1A1A] transition-colors">Stories</a>
        <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <a href="#login" className="hidden sm:inline font-medium text-[15px] hover:text-[#1A1A1A] transition-colors text-[#555]">Log In</a>
        <button className="btn-primary">Start Free</button>
      </div>
    </div>
  </nav>
);

const Hero = () => (
  <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
    <div className="hero-wash p-8 md:p-16 lg:p-20 flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/30 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>

      <div className="flex-1 relative z-10 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-sm font-semibold text-[#0F3A2E] mb-6">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          Join 50,000+ creators and merchants
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#0F3A2E] leading-[1.1] mb-6">
          Your business, <br/>
          beautifully online.
        </h1>
        
        <p className="text-lg md:text-xl text-[#0F3A2E]/80 mb-10 max-w-xl mx-auto lg:mx-0">
          Create a stunning storefront, take bookings, and sell products anywhere. No coding required. Just your vision, brought to life.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
          <button className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
            Create your website
          </button>
          <button className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2 bg-white/50 backdrop-blur-sm border-transparent hover:bg-white hover:border-white">
            <Play size={20} /> Watch Demo
          </button>
        </div>
        <p className="mt-4 text-sm text-[#0F3A2E]/60 font-medium">Free 14-day trial. No credit card needed.</p>
      </div>

      <div className="flex-1 relative z-10 w-full max-w-lg lg:max-w-none">
        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 bg-white">
          <img 
            src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=2000&auto=format&fit=crop" 
            alt="Small business owner"
            className="w-full h-auto object-cover aspect-[4/3]"
          />
          <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold text-gray-900">Payment Received</p>
              <p className="text-sm text-gray-500">₹4,500 from Ananya S.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Features = () => {
  const features = [
    {
      icon: <Store className="w-8 h-8 text-blue-500" />,
      title: "Sell Products",
      desc: "Physical, digital, or subscriptions. Manage inventory, shipping, and taxes with ease.",
      bg: "bg-blue-50"
    },
    {
      icon: <Calendar className="w-8 h-8 text-orange-500" />,
      title: "Take Bookings",
      desc: "Let clients book appointments, classes, or consultations directly on your site.",
      bg: "bg-orange-50"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-green-500" />,
      title: "Get Paid",
      desc: "Accept UPI, credit cards, and wallets natively. Zero setup required.",
      bg: "bg-green-50"
    },
    {
      icon: <Globe className="w-8 h-8 text-purple-500" />,
      title: "Go Global",
      desc: "Auto-translate your store into multiple languages to reach customers everywhere.",
      bg: "bg-purple-50"
    }
  ];

  return (
    <section className="py-24 px-6 bg-white" id="platform">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need to succeed</h2>
          <p className="text-lg text-gray-600">
            Flomerce gives you the powerful tools of an enterprise platform, wrapped in an interface anyone can use.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="feature-card group cursor-pointer">
              <div className={`w-16 h-16 rounded-2xl ${f.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                {f.desc}
              </p>
              <div className="flex items-center font-semibold text-[#0F3A2E] group-hover:text-black transition-colors">
                Learn more <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Templates = () => (
  <section className="py-24 px-6 bg-[#FAFAFA]" id="templates">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Start with a stunning design</h2>
          <p className="text-lg text-gray-600">
            Choose from dozens of designer-made templates. Customize every pixel to match your brand's unique vibe.
          </p>
        </div>
        <button className="btn-secondary whitespace-nowrap self-start">
          Explore all templates
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", title: "Ceramics Studio", type: "Store" },
          { img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", title: "Wellness Clinic", type: "Appointments" },
          { img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80", title: "Indie Fashion", type: "Boutique" },
        ].map((t, i) => (
          <div key={i} className="group cursor-pointer hover-lift">
            <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-all duration-300 bg-white">
              <img src={t.img} alt={t.title} className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-800 uppercase tracking-wide">
                {t.type}
              </div>
            </div>
            <h3 className="text-xl font-bold">{t.title}</h3>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Story = () => (
  <section className="py-24 px-6 bg-white" id="stories">
    <div className="max-w-7xl mx-auto bg-[#E8E1F5] rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
      {/* Decorative */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#D6EFFF] rounded-full blur-2xl"></div>
      
      <div className="w-full md:w-1/2 relative z-10">
        <img 
          src="https://images.unsplash.com/photo-1556910103-1c02745a872f?auto=format&fit=crop&w=1000&q=80" 
          alt="Coffee roaster" 
          className="rounded-2xl shadow-xl w-full h-auto object-cover aspect-square"
        />
      </div>
      
      <div className="w-full md:w-1/2 relative z-10">
        <div className="flex gap-1 mb-6">
          {[...Array(5)].map((_, i) => <Star key={i} className="fill-[#0F3A2E] text-[#0F3A2E]" size={20} />)}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#0F3A2E] leading-tight">
          "I went from selling via Instagram DMs to having a fully automated storefront in an afternoon. My sales doubled in the first month."
        </h2>
        <div className="text-[#0F3A2E]/80">
          <p className="font-bold text-lg">Priya Sharma</p>
          <p>Founder, The Artisan Baker</p>
        </div>
      </div>
    </div>
  </section>
);

const CTA = () => (
  <section id="pricing" className="py-32 px-6">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
        Ready to build <br/> something amazing?
      </h2>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        Join the thousands of business owners who trust Flomerce to run their online presence. Start your 14-day free trial today.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button className="btn-primary text-lg px-10 py-4">Start your free trial</button>
        <button className="btn-secondary text-lg px-10 py-4">Talk to sales</button>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-white border-t border-gray-100 py-16 px-6">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
      <div className="col-span-2 lg:col-span-2">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#0F3A2E] flex items-center justify-center text-white font-display font-bold text-xl">
            F
          </div>
          <span className="font-display font-bold text-xl tracking-tight">flomerce</span>
        </div>
        <p className="text-gray-500 mb-6 max-w-xs">
          The friendly platform for small businesses to launch, run, and grow their online presence.
        </p>
      </div>
      <div>
        <h4 className="font-bold mb-4">Product</h4>
        <ul className="space-y-3 text-gray-600">
          <li><a href="#" className="hover:text-[#0F3A2E]">Storefront</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Appointments</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Payments</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Pricing</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-4">Resources</h4>
        <ul className="space-y-3 text-gray-600">
          <li><a href="#" className="hover:text-[#0F3A2E]">Templates</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Blog</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Help Center</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Community</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-4">Company</h4>
        <ul className="space-y-3 text-gray-600">
          <li><a href="#" className="hover:text-[#0F3A2E]">About</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Careers</a></li>
          <li><a href="#" className="hover:text-[#0F3A2E]">Contact</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
      <p>© 2026 Flomerce Inc. All rights reserved.</p>
      <div className="flex gap-6">
        <a href="#" className="hover:text-[#0F3A2E]">Privacy Policy</a>
        <a href="#" className="hover:text-[#0F3A2E]">Terms of Service</a>
      </div>
    </div>
  </footer>
);

export default function WixStyle() {
  return (
    <div className="wix-style-page min-h-screen selection:bg-[#E5F3B4] selection:text-[#0F3A2E]">
      <CustomStyles />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Templates />
        <Story />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
