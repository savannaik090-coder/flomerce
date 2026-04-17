import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>Terms & Conditions</h1>
          <p className="legal-updated">Last updated: March 30, 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the Flomerce platform ("Service"), available at {PLATFORM_DOMAIN}, you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree with any part of these Terms, you may not use our Service. These Terms constitute a legally binding agreement between you and Flomerce.</p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>Flomerce is a software-as-a-service (SaaS) platform that enables users to create, manage, and host e-commerce websites on subdomains of {PLATFORM_DOMAIN} (e.g., your-store.{PLATFORM_DOMAIN}). The platform provides website building tools, product management, order processing, customer management, analytics, and payment integration capabilities. Flomerce is a digital product — no physical goods are shipped by Flomerce. Access to all platform features is granted immediately upon successful payment or trial activation.</p>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>To use the Service, you must create an account by providing accurate and complete information including your full name, email address, and a secure password. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at {SUPPORT_EMAIL} of any unauthorized use of your account. You must be at least 18 years of age to create an account.</p>
          </section>

          <section>
            <h2>4. Subscription Plans & Payments</h2>
            <p>Flomerce offers various subscription plans with different features and pricing, viewable on our website. By subscribing to a paid plan, you agree to pay the applicable fees as described at the time of purchase. All payments are processed securely through Razorpay, a PCI DSS-compliant payment gateway. Subscription fees are billed in advance on a recurring basis depending on your chosen billing cycle. All prices are displayed in Indian Rupees (INR). Razorpay supports payments via credit cards, debit cards, UPI, net banking, and digital wallets. Standard payment gateway transaction fees as charged by Razorpay (currently 2% per transaction for most payment methods) may apply and are borne by Flomerce for platform subscription payments. These rates are determined by Razorpay and may change; refer to <a href="https://razorpay.com/pricing" target="_blank" rel="noopener noreferrer">Razorpay's pricing page</a> for current rates.</p>
          </section>

          <section>
            <h2>5. Payment Processing & Gateway Integration</h2>
            <p>Flomerce operates as a <strong>standard merchant</strong> and is <strong>not a payment aggregator, facilitator, or intermediary</strong>. The platform handles two distinct types of payments:</p>
            <ul>
              <li><strong>Platform Subscription Payments:</strong> Fees paid by website owners for Flomerce subscription plans (Starter, Growth, Pro, etc.) are collected directly by Flomerce through its own Razorpay merchant account. These are payments for Flomerce's SaaS services only.</li>
              <li><strong>Website Customer Payments:</strong> Payments made by end customers on websites created through Flomerce are processed entirely through the <strong>website owner's own, independently registered Razorpay merchant account</strong>. Website owners are required to obtain their own Razorpay account, complete their own KYC verification, and enter their own API credentials in their website dashboard settings.</li>
            </ul>
            <p>Flomerce does <strong>not collect, hold, pool, settle, or route</strong> any payments on behalf of website owners or their customers. All transaction funds flow directly from the customer to the website owner's Razorpay account. Flomerce has no access to or control over these funds at any point.</p>
            <p>Each website owner is solely responsible for:</p>
            <ul>
              <li>Maintaining their own valid Razorpay merchant account and KYC compliance</li>
              <li>Securing their own API keys and credentials</li>
              <li>Handling refunds, disputes, and chargebacks for their own website transactions</li>
              <li>Complying with all applicable payment regulations, including RBI guidelines on digital payments</li>
            </ul>
            <p>Payment gateway transaction fees charged by Razorpay on website customer payments (e.g., 2% per transaction) are applied to the website owner's Razorpay account as per their own agreement with Razorpay. Flomerce does not charge any additional commission or processing fee on these transactions.</p>
            <p>Razorpay API keys entered by website owners are stored securely in encrypted form and are used solely for processing transactions on their respective websites. Flomerce does not share, transfer, or use one merchant's credentials for any other purpose.</p>
          </section>

          <section>
            <h2>6. Free Trial</h2>
            <p>We offer a 7-day free trial period for new users. During the trial period, you have full access to the platform features at no cost. No payment information is required to start a free trial. At the end of the trial, your account will be suspended and your website will be disabled unless you subscribe to a paid plan. We reserve the right to modify or discontinue the free trial at any time.</p>
          </section>

          <section>
            <h2>7. Digital Delivery</h2>
            <p>Flomerce is a digital SaaS product. No physical goods are shipped by Flomerce. Upon successful payment or trial activation, access to the platform and all included features is granted immediately. Your e-commerce website will be live and accessible at your chosen subdomain (your-store.{PLATFORM_DOMAIN}) within seconds of creation.</p>
          </section>

          <section>
            <h2>8. User Content</h2>
            <p>You retain ownership of all content you upload to your websites created through Flomerce, including but not limited to product images, descriptions, logos, and text. You are solely responsible for ensuring that your content does not violate any applicable laws, infringe upon intellectual property rights, or contain prohibited material. You grant Flomerce a limited, non-exclusive license to host and display your content as necessary to provide the Service.</p>
          </section>

          <section>
            <h2>9. Prohibited Uses</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Sell illegal, counterfeit, or prohibited goods</li>
              <li>Engage in fraudulent activities or misleading practices</li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Send unsolicited communications or spam</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Sell products related to gambling, adult content, cryptocurrency, or any other restricted category</li>
            </ul>
          </section>

          <section>
            <h2>10. Intellectual Property</h2>
            <p>The Flomerce platform, including its design, code, features, and branding, is the intellectual property of Flomerce and is protected by applicable copyright and trademark laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service without prior written consent.</p>
          </section>

          <section>
            <h2>11. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in activities that are harmful to the Service or other users. Upon termination, your access to the Service will be revoked. Your website data will be retained for 30 days after termination, during which you may request data export. After this period, data may be permanently deleted.</p>
          </section>

          <section>
            <h2>12. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Flomerce shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or in connection with the use of the Service. Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>
          </section>

          <section>
            <h2>13. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or secure at all times. We strive for 99.9% uptime but do not guarantee it.</p>
          </section>

          <section>
            <h2>14. Governing Law & Dispute Resolution</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in Karnataka, India. Before initiating legal proceedings, both parties agree to attempt resolution through good-faith negotiation.</p>
          </section>

          <section>
            <h2>15. Changes to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Changes will be posted on this page with an updated "Last updated" date. We will notify registered users of significant changes via email. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2>16. Contact Us</h2>
            <p>If you have any questions about these Terms & Conditions, please contact us at:</p>
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
