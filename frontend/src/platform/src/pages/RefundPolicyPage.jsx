import { Link } from 'react-router-dom';
import Navbar from '../components/LegalNavbar.jsx';
import LegalBindingBanner from '../components/LegalBindingBanner.jsx';
import LegalFooter from '../components/LegalFooter.jsx';
import '../styles/legal.css';
import { PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

const PHONE = '+91 9901954610';

export default function RefundPolicyPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>Refund & Cancellation Policy</h1>
          <p className="legal-updated">Last updated: March 30, 2026</p>

          <LegalBindingBanner />

          <section className="legal-summary" style={{ background: '#f1f5f9', borderRadius: 8, padding: '1rem 1.25rem', margin: '0 0 1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>Summary</h2>
            <ul>
              <li>Flomerce is a digital service activated immediately upon payment.</li>
              <li>New subscribers can request a full refund within 7 days of first payment.</li>
              <li>Cancellation stops future renewals; the current period stays active until it ends.</li>
              <li>Duplicate charges and failed activations are refunded automatically.</li>
              <li>To request a refund, email support with your transaction ID.</li>
            </ul>
          </section>

          <section>
            <h2>1. Overview</h2>
            <p>This Refund & Cancellation Policy outlines the terms under which you may cancel your subscription and request a refund for the Flomerce platform services. Flomerce is a digital SaaS product — no physical goods are shipped. Access to the platform is granted immediately upon successful payment. We aim to be fair and transparent in our refund process.</p>
          </section>

          <section>
            <h2>2. Digital Delivery</h2>
            <p>Flomerce is a software-as-a-service platform. All services are delivered digitally via the internet. Upon successful payment, access to your subscription plan and all included features is activated immediately. There is no physical shipment involved in any of our services.</p>
          </section>

          <section>
            <h2>3. Free Trial</h2>
            <p>Flomerce offers a 7-day free trial for new users. During the trial period, you have full access to the platform features at no cost. No payment information is required to start a free trial. At the end of the trial, your account will be suspended and your website will be disabled unless you choose to subscribe to a paid plan.</p>
          </section>

          <section>
            <h2>4. Subscription Cancellation</h2>
            <p>You may cancel your subscription at any time from your dashboard. Upon cancellation:</p>
            <ul>
              <li>Your subscription will remain active until the end of the current billing period</li>
              <li>You will not be charged for the next billing cycle</li>
              <li>Your websites will continue to function until the subscription period ends</li>
              <li>After the subscription expires, your account will be suspended and your website will be disabled</li>
              <li>Your data will be retained for 30 days after expiry, during which you can resubscribe to restore access</li>
            </ul>
          </section>

          <section>
            <h2>5. Refund Eligibility</h2>
            <p>Refunds may be issued under the following conditions:</p>
            <ul>
              <li><strong>Within 7 days of first payment:</strong> If you are not satisfied with the Service within the first 7 days of your initial paid subscription, you may request a full refund</li>
              <li><strong>Service unavailability:</strong> If the Service experiences significant downtime (more than 24 consecutive hours) or is unavailable for an extended period due to issues on our end, you may be eligible for a prorated refund</li>
              <li><strong>Duplicate charges:</strong> If you are charged more than once for the same billing period, the duplicate charge will be refunded immediately</li>
              <li><strong>Failed service activation:</strong> If your subscription payment was processed but the service was not activated, you are eligible for a full refund</li>
            </ul>
          </section>

          <section>
            <h2>6. Non-Refundable Situations</h2>
            <p>Refunds will not be issued in the following cases:</p>
            <ul>
              <li>After 7 days from the initial payment for first-time subscribers</li>
              <li>If your account was suspended or terminated due to violation of our Terms & Conditions</li>
              <li>For partial months or unused portions of a subscription (beyond the 7-day window)</li>
              <li>If you simply forgot to cancel before the renewal date</li>
              <li>For any add-on services or one-time purchases already delivered</li>
              <li>For renewal payments on existing subscriptions (cancellation stops future charges but does not refund the current period)</li>
            </ul>
          </section>

          <section>
            <h2>7. How to Request a Refund</h2>
            <p>To request a refund, please follow these steps:</p>
            <ol>
              <li>
                Send an email to 
                <a href={`mailto:${SUPPORT_EMAIL}`}><strong>{SUPPORT_EMAIL}</strong></a>{' '}
                with the subject line "Refund Request"
              </li>
              <li>Include your registered email address and the reason for the refund</li>
              <li>Provide the transaction ID or payment reference number if available</li>
            </ol>
            <p>
              Alternatively, you can call us at{' '}
              <a href="tel:+919901954610"><strong>{PHONE}</strong></a>{' '}
              during business hours (Mon–Sat, 10 AM – 6 PM IST).
            </p>
            <p>We will acknowledge your request within 24 hours and complete the review within 3–5 business days.</p>
          </section>

          <section>
            <h2>8. Refund Processing</h2>
            <p>Once a refund is approved:</p>
            <ul>
              <li>The refund will be processed through Razorpay to the original payment method (credit card, debit card, UPI, net banking, or wallet)</li>
              <li>Refunds typically take 5–7 business days to appear in your account, depending on your bank or payment provider</li>
              <li>You will receive an email confirmation once the refund has been initiated, including a refund reference ID</li>
              <li>For UPI payments, refunds are usually processed within 24–48 hours</li>
              <li>For credit/debit card payments, refunds may take up to 7–10 business days due to bank processing times</li>
            </ul>
          </section>

          <section>
            <h2>9. Plan Downgrades</h2>
            <p>If you wish to downgrade to a lower-tier plan:</p>
            <ul>
              <li>The downgrade will take effect at the start of your next billing cycle</li>
              <li>No refund will be issued for the difference between plans during the current billing period</li>
              <li>You will retain access to higher-tier features until the current period ends</li>
            </ul>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>We reserve the right to update this Refund & Cancellation Policy at any time. Any changes will be posted on this page with an updated "Last updated" date. We will notify registered users of significant changes via email. Continued use of the Service after changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2>11. Contact Us</h2>
            <p>If you have any questions about this Refund & Cancellation Policy, please contact us at:</p>
            <p><strong>Flomerce</strong></p>
            <p><strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>Phone:</strong> <a href="tel:+919901954610">{PHONE}</a></p>
            <p><strong>Address:</strong> Karwar, Karnataka, India — 581400</p>
            <p><strong>Website:</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
          </section>
        </div>

        <LegalFooter phone={PHONE} email={SUPPORT_EMAIL} />
      </div>
    </div>
  );
}
