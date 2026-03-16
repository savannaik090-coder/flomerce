import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>Terms & Conditions</h1>
          <p className="legal-updated">Last updated: March 16, 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the Fluxe platform ("Service"), available at fluxe.in, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you may not use our Service.</p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>Fluxe is a software-as-a-service (SaaS) platform that enables users to create, manage, and host e-commerce websites on subdomains of fluxe.in. The platform provides website building tools, product management, order processing, and payment integration capabilities.</p>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2>4. Subscription Plans & Payments</h2>
            <p>Fluxe offers various subscription plans with different features and pricing. By subscribing to a paid plan, you agree to pay the applicable fees as described at the time of purchase. All payments are processed securely through Razorpay. Subscription fees are billed in advance on a recurring basis depending on your chosen billing cycle (monthly, semi-annually, or annually).</p>
          </section>

          <section>
            <h2>5. Free Trial</h2>
            <p>We may offer a free trial period for new users. At the end of the trial period, your account will revert to the free plan unless you subscribe to a paid plan. We reserve the right to modify or discontinue the free trial at any time.</p>
          </section>

          <section>
            <h2>6. User Content</h2>
            <p>You retain ownership of all content you upload to your websites created through Fluxe, including but not limited to product images, descriptions, logos, and text. You are solely responsible for ensuring that your content does not violate any applicable laws, infringe upon intellectual property rights, or contain prohibited material.</p>
          </section>

          <section>
            <h2>7. Prohibited Uses</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Sell illegal, counterfeit, or prohibited goods</li>
              <li>Engage in fraudulent activities or misleading practices</li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Send unsolicited communications or spam</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
            </ul>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>The Fluxe platform, including its design, code, features, and branding, is the intellectual property of Fluxe and is protected by applicable copyright and trademark laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service without prior written consent.</p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms & Conditions or engage in activities that are harmful to the Service or other users. Upon termination, your access to the Service will be revoked and your website data may be deleted after a reasonable retention period.</p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Fluxe shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or in connection with the use of the Service.</p>
          </section>

          <section>
            <h2>11. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or secure at all times.</p>
          </section>

          <section>
            <h2>12. Governing Law</h2>
            <p>These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the courts in India.</p>
          </section>

          <section>
            <h2>13. Changes to Terms</h2>
            <p>We reserve the right to update these Terms & Conditions at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Service after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2>14. Contact Us</h2>
            <p>If you have any questions about these Terms & Conditions, please contact us at:</p>
            <p><strong>Email:</strong> support@fluxe.in</p>
            <p><strong>Website:</strong> <a href="https://fluxe.in">https://fluxe.in</a></p>
          </section>
        </div>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Fluxe. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
