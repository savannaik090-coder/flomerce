import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

const PHONE = '+91 9901954610';

export default function TermsPage() {
  const { t } = useTranslation('legal');
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>{t('terms.title')}</h1>
          <p className="legal-updated">{t('lastUpdated', { date: t('terms.updatedDate') })}</p>

          <div className="legal-binding-banner" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', margin: '0 0 1rem' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: '#78350f' }}>{t('bindingBanner.title')}</strong>
            <span style={{ fontSize: '0.875rem', color: '#78350f' }}>{t('bindingBanner.body')}</span>
          </div>

          <section className="legal-summary" style={{ background: '#f1f5f9', borderRadius: 8, padding: '1rem 1.25rem', margin: '0 0 1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>{t('summaryHeading')}</h2>
            <ul>
              <li>{t('terms.summary1')}</li>
              <li>{t('terms.summary2')}</li>
              <li>{t('terms.summary3')}</li>
              <li>{t('terms.summary4')}</li>
              <li>{t('terms.summary5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('terms.s1.h')}</h2>
            <p>{t('terms.s1.p', { domain: PLATFORM_DOMAIN })}</p>
          </section>

          <section>
            <h2>{t('terms.s2.h')}</h2>
            <p>{t('terms.s2.p', { domain: PLATFORM_DOMAIN })}</p>
          </section>

          <section>
            <h2>{t('terms.s3.h')}</h2>
            <p>{t('terms.s3.p', { email: SUPPORT_EMAIL })}</p>
          </section>

          <section>
            <h2>{t('terms.s4.h')}</h2>
            <p>
              {t('terms.s4.p1')}{' '}
              <a href="https://razorpay.com/pricing" target="_blank" rel="noopener noreferrer">{t('terms.s4.razorpayLink')}</a>.
            </p>
          </section>

          <section>
            <h2>{t('terms.s5.h')}</h2>
            <p>{t('terms.s5.lead')}</p>
            <ul>
              <li><strong>{t('terms.s5.items.i1Label')}</strong> {t('terms.s5.items.i1Text')}</li>
              <li><strong>{t('terms.s5.items.i2Label')}</strong> {t('terms.s5.items.i2Text')}</li>
            </ul>
            <p>{t('terms.s5.p1')}</p>
            <p>{t('terms.s5.respLead')}</p>
            <ul>
              <li>{t('terms.s5.resp.i1')}</li>
              <li>{t('terms.s5.resp.i2')}</li>
              <li>{t('terms.s5.resp.i3')}</li>
              <li>{t('terms.s5.resp.i4')}</li>
            </ul>
            <p>{t('terms.s5.p2')}</p>
            <p>{t('terms.s5.p3')}</p>
          </section>

          <section>
            <h2>{t('terms.s6.h')}</h2>
            <p>{t('terms.s6.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s7.h')}</h2>
            <p>{t('terms.s7.p', { domain: PLATFORM_DOMAIN })}</p>
          </section>

          <section>
            <h2>{t('terms.s8.h')}</h2>
            <p>{t('terms.s8.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s9.h')}</h2>
            <p>{t('terms.s9.lead')}</p>
            <ul>
              <li>{t('terms.s9.items.i1')}</li>
              <li>{t('terms.s9.items.i2')}</li>
              <li>{t('terms.s9.items.i3')}</li>
              <li>{t('terms.s9.items.i4')}</li>
              <li>{t('terms.s9.items.i5')}</li>
              <li>{t('terms.s9.items.i6')}</li>
              <li>{t('terms.s9.items.i7')}</li>
              <li>{t('terms.s9.items.i8')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('terms.s10.h')}</h2>
            <p>{t('terms.s10.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s11.h')}</h2>
            <p>{t('terms.s11.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s12.h')}</h2>
            <p>{t('terms.s12.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s13.h')}</h2>
            <p>{t('terms.s13.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s14.h')}</h2>
            <p>{t('terms.s14.p')}</p>
          </section>

          <section>
            <h2>{t('terms.s15.h')}</h2>
            <p>{t('terms.s15.p')}</p>
          </section>

          <section>
            <h2>{t('terms.contactH')}</h2>
            <p>{t('terms.contactIntro')}</p>
            <p><strong>{t('contact.brand')}</strong></p>
            <p><strong>{t('contact.labelEmail')}</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>{t('contact.labelPhone')}</strong> <a href="tel:+919901954610">{PHONE}</a></p>
            <p><strong>{t('contact.labelAddress')}</strong> {t('contact.address')}</p>
            <p><strong>{t('contact.labelWebsite')}</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
          </section>
        </div>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <Link to="/about">{t('footer.about')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/privacy-policy">{t('footer.privacy')}</Link>
            <Link to="/refund-policy">{t('footer.refund')}</Link>
            <Link to="/shipping-policy">{t('footer.shipping')}</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Flomerce. {t('footer.rightsReserved')}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t('contact.address')} | {PHONE} | {SUPPORT_EMAIL}</p>
        </footer>
      </div>
    </div>
  );
}
