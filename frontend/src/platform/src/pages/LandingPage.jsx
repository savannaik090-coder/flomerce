import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import LandingPricing from '../components/LandingPricing.jsx';
import ContactForm from '../components/ContactForm.jsx';
import '../styles/landing.css';
import '../styles/legal.css';

export default function LandingPage() {
  const [showPwa, setShowPwa] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setTimeout(() => setShowPwa(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    setShowPwa(false);
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
  };

  const features = [
    {
      icon: '🛍️',
      title: 'Complete Online Store',
      desc: 'Launch a fully functional e-commerce store with product listings, categories, and a beautiful storefront — ready to sell in minutes.'
    },
    {
      icon: '📦',
      title: 'Order Management',
      desc: 'Track orders from placement to delivery with status updates, customer notifications, and shipping management built in.'
    },
    {
      icon: '💳',
      title: 'Secure Payments',
      desc: 'Accept payments via Razorpay with support for UPI, cards, net banking, and wallets. Cash on delivery also supported.'
    },
    {
      icon: '📊',
      title: 'Built-in Analytics',
      desc: 'Monitor your store performance with visitor tracking, page views, traffic sources, and sales insights from your admin panel.'
    },
    {
      icon: '🔔',
      title: 'Push Notifications',
      desc: 'Engage customers with web push notifications for new products, price drops, and back-in-stock alerts — all automated.'
    },
    {
      icon: '🌐',
      title: 'Custom Domain & SEO',
      desc: 'Connect your own domain, optimize for search engines with built-in SEO tools, sitemaps, and structured data for Google rich results.'
    },
  ];

  return (
    <>
      <div className="container">
        <Navbar showMenu={true} />

        <section className="hero">
          <div className="hero-gradient-bg">
            <div className="hero-gradient-orb hero-orb-1"></div>
            <div className="hero-gradient-orb hero-orb-2"></div>
            <div className="hero-gradient-orb hero-orb-3"></div>
            <div className="hero-gradient-orb hero-orb-4"></div>
          </div>
          <div className="hero-content">
            <h1>Build Your Online Store<br />No Code Needed</h1>
            <p className="hero-desc">Fluxe is a SaaS platform that helps small businesses and entrepreneurs create professional e-commerce websites with product management, order processing, and secure payments — all from one dashboard.</p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
              <a href="#features" className="btn btn-outline" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Learn More</a>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="section-header">
            <h2>Everything You Need to Sell Online</h2>
            <p>From store setup to order delivery, Fluxe gives you all the tools to run your online business.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section">
          <div className="section-header">
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose a plan that fits your business. Start with a free trial, upgrade anytime.</p>
          </div>
          <LandingPricing />
        </section>

        <section id="contact" className="landing-section">
          <ContactForm />
        </section>

        <footer className="landing-footer">
          <div className="footer-top">
            <div className="footer-brand">
              <img src="/assets/images/fluxe-logo.png" alt="Fluxe" className="footer-logo" />
              <p>Empowering small businesses to sell online with ease.</p>
            </div>
            <div className="footer-links-group">
              <h4>Legal</h4>
              <Link to="/terms">Terms & Conditions</Link>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/refund-policy">Refund & Cancellation Policy</Link>
            </div>
            <div className="footer-links-group">
              <h4>Contact</h4>
              <a href="mailto:support@fluxe.in">support@fluxe.in</a>
              <a href="tel:+919901954610">+91 9901954610</a>
              <span>Karwar, Karnataka, India — 581400</span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Fluxe. All rights reserved.</p>
          </div>
        </footer>
      </div>

      <div className={`pwa-install-bar${showPwa ? ' show' : ''}`}>
        <div className="pwa-info">
          <img src="/assets/images/fluxe-logo.png" alt="Logo" className="pwa-logo" />
          <div className="pwa-text">
            <h4>Install Fluxe</h4>
            <p>Add to home screen for better experience</p>
          </div>
        </div>
        <div className="pwa-actions">
          <button className="btn-install" onClick={handleInstall}>Install</button>
          <button className="btn-close-pwa" onClick={() => setShowPwa(false)}>&times;</button>
        </div>
      </div>
    </>
  );
}
