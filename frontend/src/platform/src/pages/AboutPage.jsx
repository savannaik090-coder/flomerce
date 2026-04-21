import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { SUPPORT_EMAIL, PLATFORM_URL, PLATFORM_DOMAIN } from '../config.js';

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>{t('landing.aboutTitle')}</h1>
          <p className="legal-updated">{t('landing.aboutTagline')}</p>

          <section>
            <h2>{t('landing.aboutWhoTitle')}</h2>
            <p>Flomerce is a software-as-a-service (SaaS) platform built to help small businesses, entrepreneurs, and creators launch their own professional e-commerce websites — without writing a single line of code. We believe that every business, no matter how small, deserves a powerful online presence.</p>
            <p>Based in Karwar, Karnataka, India, Flomerce was founded with a simple mission: make online selling accessible, affordable, and effortless for everyone.</p>
          </section>

          <section>
            <h2>{t('landing.aboutWhatTitle')}</h2>
            <p>Flomerce provides a complete, all-in-one platform for creating and managing online stores. Each store gets its own branded subdomain (e.g., your-store.{PLATFORM_DOMAIN}) and comes packed with everything needed to run a successful e-commerce business:</p>
            <ul>
              <li><strong>Store Builder:</strong> Create a fully functional online store in minutes with beautiful, ready-to-use templates</li>
              <li><strong>Product Management:</strong> Add products with images, categories, variants, pricing, and inventory tracking</li>
              <li><strong>Order Processing:</strong> Complete order lifecycle management — from placement to delivery, with real-time status updates and customer notifications</li>
              <li><strong>Secure Payments:</strong> Accept payments through Razorpay (UPI, cards, net banking, wallets) and cash on delivery</li>
              <li><strong>Customer Management:</strong> Built-in customer accounts, wishlists, order history, and reviews</li>
              <li><strong>Analytics & Insights:</strong> Track visitors, page views, traffic sources, and sales from your admin dashboard</li>
              <li><strong>SEO Tools:</strong> Built-in search engine optimization with meta tags, sitemaps, and Google structured data</li>
              <li><strong>Push Notifications:</strong> Engage customers with automated alerts for new products, price drops, and back-in-stock items</li>
              <li><strong>Custom Domains:</strong> Connect your own domain name for a fully branded experience</li>
            </ul>
          </section>

          <section>
            <h2>{t('landing.aboutMissionTitle')}</h2>
            <p>We are on a mission to democratize e-commerce for small businesses across India and beyond. Traditional e-commerce solutions are often expensive, complex, and require technical expertise. Flomerce eliminates these barriers by providing an intuitive, affordable platform that anyone can use.</p>
            <p>Whether you sell jewellery, clothing, beauty products, or any other retail goods — Flomerce gives you the tools to build your brand, reach customers, and grow your business online.</p>
          </section>

          <section>
            <h2>{t('landing.aboutHowTitle')}</h2>
            <ol>
              <li><strong>Sign Up:</strong> Create your free account in seconds — no credit card required</li>
              <li><strong>Build Your Store:</strong> Choose a template, add your brand name, logo, and products</li>
              <li><strong>Set Up Payments:</strong> Connect your own Razorpay merchant account to accept payments directly</li>
              <li><strong>Go Live:</strong> Your store is instantly live on your own subdomain, ready for customers</li>
            </ol>
          </section>

          <section>
            <h2>{t('landing.aboutValuesTitle')}</h2>
            <ul>
              <li><strong>Simplicity:</strong> We build tools that are easy to use, so you can focus on your business, not technology</li>
              <li><strong>Transparency:</strong> Clear pricing, no hidden fees, and honest communication</li>
              <li><strong>Security:</strong> Your data and your customers' data are protected with industry-standard security measures</li>
              <li><strong>Support:</strong> We are here to help you succeed — reach out to us anytime</li>
            </ul>
          </section>

          <section>
            <h2>{t('landing.aboutContactTitle')}</h2>
            <p>We would love to hear from you. Whether you have questions, feedback, or need help getting started:</p>
            <p><strong>Flomerce</strong></p>
            <p><strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>Phone:</strong> <a href="tel:+919901954610">+91 9901954610</a></p>
            <p><strong>Address:</strong> Karwar, Karnataka, India — 581400</p>
            <p><strong>Website:</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
          </section>
        </div>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <Link to="/about">{t('landing.footerAbout')}</Link>
            <Link to="/terms">{t('landing.footerTerms')}</Link>
            <Link to="/privacy-policy">{t('landing.footerPrivacy')}</Link>
            <Link to="/refund-policy">{t('landing.footerRefund')}</Link>
            <Link to="/shipping-policy">{t('landing.footerShipping')}</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Flomerce. {t('landing.rightsReserved')}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Karwar, Karnataka, India — 581400 | +91 9901954610 | {SUPPORT_EMAIL}</p>
        </footer>
      </div>
    </div>
  );
}
