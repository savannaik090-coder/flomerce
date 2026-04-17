import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

export default function ShippingPolicyPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>Shipping & Delivery Policy</h1>
          <p className="legal-updated">Last updated: March 31, 2026</p>

          <section>
            <h2>1. Digital Product — No Physical Shipping</h2>
            <p>Flomerce is a software-as-a-service (SaaS) platform. All our services are delivered digitally via the internet. <strong>No physical goods are shipped by Flomerce.</strong> There is no physical shipment, courier, or logistics involved in any of our services.</p>
          </section>

          <section>
            <h2>2. Instant Digital Delivery</h2>
            <p>Upon successful payment or free trial activation, access to the Flomerce platform and all included features is granted <strong>immediately</strong>. Specifically:</p>
            <ul>
              <li>Your account is activated instantly after payment confirmation</li>
              <li>Your e-commerce website is created and live within seconds at your chosen subdomain (e.g., your-store.{PLATFORM_DOMAIN})</li>
              <li>All subscription features are available immediately upon activation</li>
              <li>No waiting period or manual activation is required</li>
            </ul>
          </section>

          <section>
            <h2>3. Service Availability</h2>
            <p>Flomerce is a cloud-based platform accessible 24/7 from any device with an internet connection and a modern web browser. We strive for 99.9% uptime. In case of scheduled maintenance, we will notify users in advance via email.</p>
          </section>

          <section>
            <h2>4. Access Methods</h2>
            <p>You can access the Flomerce platform through:</p>
            <ul>
              <li><strong>Web Browser:</strong> Visit <a href={PLATFORM_URL}>{PLATFORM_DOMAIN}</a> and log in to your account</li>
              <li><strong>Mobile Browser:</strong> The platform is fully responsive and works on all mobile devices</li>
              <li><strong>PWA (Progressive Web App):</strong> Install Flomerce on your device for a native app-like experience</li>
            </ul>
          </section>

          <section>
            <h2>5. Regarding Stores Created on Flomerce</h2>
            <p>Flomerce enables merchants to create their own e-commerce websites. Shipping and delivery of physical products sold through stores built on Flomerce is the <strong>sole responsibility of the respective store owner (merchant)</strong>. Flomerce does not handle, manage, or take any responsibility for:</p>
            <ul>
              <li>Shipping or delivery of products sold by merchants on their stores</li>
              <li>Shipping costs, delivery timelines, or courier services used by merchants</li>
              <li>Lost, damaged, or delayed shipments of merchant products</li>
              <li>Returns or exchanges of physical goods sold by merchants</li>
            </ul>
            <p>Each store owner is responsible for defining and displaying their own shipping and delivery policies on their respective websites.</p>
          </section>

          <section>
            <h2>6. Contact Us</h2>
            <p>If you have any questions about this Shipping & Delivery Policy, please contact us at:</p>
            <p><strong>Flomerce</strong></p>
            <p><strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>Phone:</strong> <a href="tel:+919901954610">+91 9901954610</a></p>
            <p><strong>Address:</strong> Karwar, Karnataka, India — 581400</p>
            <p><strong>Website:</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
          </section>
        </div>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/refund-policy">Refund & Cancellation Policy</Link>
            <Link to="/shipping-policy">Shipping & Delivery Policy</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Flomerce. All rights reserved.</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Karwar, Karnataka, India — 581400 | +91 9901954610 | {SUPPORT_EMAIL}</p>
        </footer>
      </div>
    </div>
  );
}
