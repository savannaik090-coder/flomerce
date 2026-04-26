import React from 'react';

export default function EditorialPastels() {
  const features = [
    {
      title: "Storefront",
      headline: "Launch a polished storefront customers love to browse.",
      description: "Build a digital presence that feels as curated as your physical shelves. Tailored for Indian merchants who demand a beautiful, frictionless buying experience.",
      image: "/__mockup/images/editorial-storefront.png",
      points: [
        "Modern responsive themes",
        "Visual homepage customizer",
        "Multi-currency switching",
        "AI translation in 60+ languages",
        "Customer accounts & wishlists"
      ]
    },
    {
      title: "Selling",
      headline: "Take orders, accept payments, and stay compliant from day one.",
      description: "We handle the friction of checkout so you can focus on the craft. Accept every major payment method with zero technical headaches.",
      image: "/__mockup/images/editorial-selling.png",
      points: [
        "Variants & bulk pricing",
        "Order management",
        "Razorpay, Stripe & COD",
        "Automated GST invoicing",
        "Abandoned cart recovery"
      ]
    },
    {
      title: "Operations",
      headline: "Run the back office without juggling spreadsheets.",
      description: "A calm, centered approach to inventory and fulfillment. Move stock across locations and ship orders with a single click.",
      image: "/__mockup/images/editorial-operations.png",
      points: [
        "Multi-location inventory",
        "Stock transfers",
        "Shiprocket integration",
        "Custom domain & auto SSL",
        "Role-based staff access"
      ]
    },
    {
      title: "Marketing & Growth",
      headline: "Bring shoppers back and turn them into regulars.",
      description: "Cultivate lasting relationships with the customers who matter most, directly where they spend their time.",
      image: "/__mockup/images/editorial-marketing.png",
      points: [
        "Web push notifications",
        "WhatsApp marketing & chat",
        "Discounts & coupons",
        "Built-in SEO suite",
        "Verified reviews with photos"
      ]
    },
    {
      title: "Insights",
      headline: "See exactly what's working — and what's next.",
      description: "Clear, beautiful data that tells the story of your business growth, helping you make the right decisions quietly and confidently.",
      image: "/__mockup/images/editorial-insights.png",
      points: [
        "Real-time visitor analytics",
        "Conversion & best sellers",
        "Revenue, tax & shipping reports",
        "Device & geography breakdowns",
        "Traffic source attribution"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2A2A2A] font-sans selection:bg-[#E8DCC4] selection:text-[#2A2A2A]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:wght@300;400;500&display=swap');
        
        .font-serif {
          font-family: 'Playfair Display', serif;
        }
        .font-sans {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <div className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 mb-16 md:mb-24 text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-[#8A7E71] mb-6 font-medium">The Flomerce Philosophy</p>
          <h2 className="font-serif text-4xl md:text-6xl max-w-3xl mx-auto leading-[1.1] mb-8 text-[#2A2A2A]">
            A foundation built for those who take commerce seriously.
          </h2>
          <p className="text-lg md:text-xl text-[#5C554D] max-w-2xl mx-auto font-light leading-relaxed">
            Everything you need to build, scale, and manage a beautiful digital storefront. Starting at just ₹9/day.
          </p>
        </div>

        {/* Horizontal scroll container for cards */}
        <div className="flex overflow-x-auto hide-scrollbar px-6 md:px-12 pb-24 snap-x snap-mandatory">
          <div className="flex gap-8 md:gap-12 min-w-max mx-auto">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="w-[300px] md:w-[360px] flex flex-col snap-center shrink-0 group"
              >
                {/* Visual Area */}
                <div className="relative w-full aspect-[3/4] mb-10 overflow-hidden bg-[#F4F1EA]">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    loading={idx < 2 ? "eager" : "lazy"}
                  />
                  {/* Subtle vignette/border overlay */}
                  <div className="absolute inset-0 border border-[#2A2A2A]/5 pointer-events-none mix-blend-multiply"></div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col flex-grow">
                  <div className="border-t border-[#2A2A2A]/10 pt-6 mb-6">
                    <span className="text-xs tracking-[0.15em] uppercase text-[#8A7E71] font-medium">
                      Chapter {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  
                  <h3 className="text-xs uppercase tracking-widest text-[#2A2A2A] mb-4 font-semibold">
                    {feature.title}
                  </h3>
                  
                  <h4 className="font-serif text-2xl md:text-[28px] leading-[1.2] mb-6 text-[#2A2A2A]">
                    {feature.headline}
                  </h4>
                  
                  <p className="text-[#5C554D] leading-relaxed font-light mb-10 text-[15px]">
                    {feature.description}
                  </p>
                  
                  <div className="mt-auto">
                    <ul className="space-y-4">
                      {feature.points.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start text-[14px] text-[#2A2A2A]">
                          <span className="block mt-2 mr-4 w-1 h-1 rounded-full bg-[#D1C6B4] shrink-0"></span>
                          <span className="font-light tracking-wide">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
