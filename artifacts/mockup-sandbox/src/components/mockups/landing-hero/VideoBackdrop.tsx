import { ArrowRight, Play, Sparkles } from "lucide-react";
import "./_group.css";

const VIDEO_SRC = "/__mockup/videos/hero-demo.mp4";
const VIDEO_POSTER =
  "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1600&q=70";

function NavBar() {
  return (
    <header className="lp-nav">
      <div className="lp-nav-inner">
        <a className="lp-brand" href="#">
          <span className="lp-brand-mark">F</span>
          <span className="lp-brand-name">flomerce</span>
        </a>
        <nav className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="lp-nav-cta">
          <a href="#login" className="lp-nav-login">Log in</a>
          <a href="#start" className="lp-nav-start">
            Start free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      {/* Video background — full bleed at top, fades into the page where the headline begins */}
      <div className="lp-hero-video-wrap" aria-hidden="true">
        <video
          className="lp-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={VIDEO_POSTER}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
        {/* Subtle tint over the video so the brand still feels light/elegant */}
        <div className="lp-hero-video-tint" />
        {/* Bottom gradient mask — fades the video into the page right where the headline starts */}
        <div className="lp-hero-video-fade" />
      </div>

      <div className="lp-hero-inner">
        <div className="lp-hero-badge">
          <Sparkles className="w-3.5 h-3.5" />
          New · The all-in-one commerce OS for India
        </div>

        <h1 className="lp-hero-title">
          Launch your store.{" "}
          <span className="lp-hero-accent">Sell everywhere.</span>{" "}
          Grow without limits.
        </h1>

        <p className="lp-hero-desc">
          Themes, payments, shipping, WhatsApp, SEO and analytics — every tool
          your brand needs to go from first product to flagship, on one
          beautifully simple platform.
        </p>

        <div className="lp-hero-buttons">
          <a className="lp-btn-primary" href="#start">
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </a>
          <a className="lp-btn-ghost" href="#demo">
            <Play className="w-3.5 h-3.5" fill="currentColor" />
            Watch 90-sec demo
          </a>
        </div>

        <ul className="lp-hero-trust">
          <li>4.9/5 from 2,800+ merchants</li>
          <li className="lp-trust-sep" aria-hidden="true">·</li>
          <li>No credit card required</li>
          <li className="lp-trust-sep" aria-hidden="true">·</li>
          <li>Cancel anytime</li>
        </ul>
      </div>
    </section>
  );
}

function TrustedStrip() {
  const partners = ["Razorpay", "Stripe", "Shiprocket", "WhatsApp", "Google", "Cloudflare"];
  return (
    <section className="lp-trusted">
      <span className="lp-trusted-pill">Trusted by India's fastest-growing brands</span>
      <ul className="lp-trusted-logos">
        {partners.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </section>
  );
}

function FeatureTeaser() {
  const features = [
    { title: "Beautiful themes", desc: "Studio-quality storefronts that load fast on every device." },
    { title: "Built-in payments", desc: "Razorpay, Stripe and UPI — settled to your bank, fully reconciled." },
    { title: "WhatsApp marketing", desc: "Broadcast offers and recover carts with native WhatsApp flows." },
  ];
  return (
    <section className="lp-features">
      {features.map((f) => (
        <div key={f.title} className="lp-feature">
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      ))}
    </section>
  );
}

export function VideoBackdrop() {
  return (
    <div className="lp-page">
      <NavBar />
      <Hero />
      <TrustedStrip />
      <FeatureTeaser />
    </div>
  );
}
