import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: March 30, 2026</p>

          <section>
            <h2>1. Introduction</h2>
            <p>Flomerce ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at {PLATFORM_DOMAIN} and any websites created through our Service. This policy applies to all users of the Flomerce platform, including store owners and their customers.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>2.1 Personal Information</h3>
            <p>When you register for an account, we collect:</p>
            <ul>
              <li>Full name</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Password (stored in encrypted/hashed form)</li>
              <li>Business/brand name</li>
            </ul>

            <h3>2.2 Payment Information</h3>
            <p>When you subscribe to a paid plan, payment processing is handled securely by Razorpay, which is PCI DSS Level 1 compliant. We do not store your credit card numbers, debit card details, UPI IDs, or bank account information on our servers. Razorpay processes and stores payment information in accordance with their own privacy policy and security standards. We only store transaction reference IDs for record-keeping.</p>

            <h3>2.3 Website Content</h3>
            <p>We store the content you create on your websites, including product listings, images, category information, site configuration data, and customer order information.</p>

            <h3>2.4 Automatically Collected Information</h3>
            <p>We may automatically collect certain information when you access the Service, including:</p>
            <ul>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Pages visited and time spent</li>
              <li>Referring URL</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your subscription payments via Razorpay</li>
              <li>Send you account-related communications (verification emails, password resets, subscription updates)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Monitor and analyze usage patterns to improve user experience</li>
              <li>Protect against fraudulent or unauthorized activity</li>
              <li>Comply with legal obligations including the Information Technology Act, 2000 and applicable data protection regulations</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing & Disclosure</h2>
            <p>We do not sell your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>Payment Processing:</strong> With Razorpay to process subscription and transaction payments securely</li>
              <li><strong>Cloud Infrastructure:</strong> With Cloudflare for hosting, content delivery, and database services</li>
              <li><strong>Email Service:</strong> With Brevo (formerly Sendinblue) for transactional email delivery</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, court order, or legal process</li>
              <li><strong>Protection of Rights:</strong> To protect the rights, property, or safety of Flomerce, our users, or others</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information, including:</p>
            <ul>
              <li>Encryption of data in transit using SSL/TLS (HTTPS)</li>
              <li>Secure password hashing using bcrypt</li>
              <li>Token-based authentication with session expiry</li>
              <li>Regular security reviews and updates</li>
              <li>Cloudflare's enterprise-grade security infrastructure</li>
            </ul>
            <p>However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide you the Service. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes such as fraud prevention. Transaction records may be retained for up to 7 years as required by Indian tax and accounting regulations.</p>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Withdraw consent for data processing where applicable</li>
              <li>Export your data in a portable format</li>
              <li>Lodge a complaint with a data protection authority</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or call <a href="tel:+919901954610">+91 9901954610</a>.</p>
          </section>

          <section>
            <h2>8. Cookies</h2>
            <p>We use essential cookies and local storage to maintain your login session and store user preferences. We do not use third-party tracking cookies for advertising purposes. Essential cookies are necessary for the functioning of the Service and cannot be disabled.</p>
          </section>

          <section>
            <h2>9. Third-Party Links</h2>
            <p>Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.</p>
          </section>

          <section>
            <h2>10. Children's Privacy</h2>
            <p>The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it promptly.</p>
          </section>

          <section>
            <h2>11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. We will notify registered users of significant changes via email. Your continued use of the Service after any changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
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
