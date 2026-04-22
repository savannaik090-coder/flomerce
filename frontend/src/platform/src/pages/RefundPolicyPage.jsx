import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

const PHONE = '+91 9901954610';

export default function RefundPolicyPage() {
  const { t } = useTranslation('legal');
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>{t('refund.title')}</h1>
          <p className="legal-updated">{t('lastUpdated', { date: t('refund.updatedDate') })}</p>

          <div className="legal-binding-banner" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', margin: '0 0 1rem' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: '#78350f' }}>{t('bindingBanner.title')}</strong>
            <span style={{ fontSize: '0.875rem', color: '#78350f' }}>{t('bindingBanner.body')}</span>
          </div>

          <section className="legal-summary" style={{ background: '#f1f5f9', borderRadius: 8, padding: '1rem 1.25rem', margin: '0 0 1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>{t('summaryHeading')}</h2>
            <ul>
              <li>{t('refund.summary1')}</li>
              <li>{t('refund.summary2')}</li>
              <li>{t('refund.summary3')}</li>
              <li>{t('refund.summary4')}</li>
              <li>{t('refund.summary5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s1.h')}</h2>
            <p>{t('refund.s1.p')}</p>
          </section>

          <section>
            <h2>{t('refund.s2.h')}</h2>
            <p>{t('refund.s2.p')}</p>
          </section>

          <section>
            <h2>{t('refund.s3.h')}</h2>
            <p>{t('refund.s3.p')}</p>
          </section>

          <section>
            <h2>{t('refund.s4.h')}</h2>
            <p>{t('refund.s4.lead')}</p>
            <ul>
              <li>{t('refund.s4.items.i1')}</li>
              <li>{t('refund.s4.items.i2')}</li>
              <li>{t('refund.s4.items.i3')}</li>
              <li>{t('refund.s4.items.i4')}</li>
              <li>{t('refund.s4.items.i5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s5.h')}</h2>
            <p>{t('refund.s5.lead')}</p>
            <ul>
              <li><strong>{t('refund.s5.items.i1Label')}</strong> {t('refund.s5.items.i1Text')}</li>
              <li><strong>{t('refund.s5.items.i2Label')}</strong> {t('refund.s5.items.i2Text')}</li>
              <li><strong>{t('refund.s5.items.i3Label')}</strong> {t('refund.s5.items.i3Text')}</li>
              <li><strong>{t('refund.s5.items.i4Label')}</strong> {t('refund.s5.items.i4Text')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s6.h')}</h2>
            <p>{t('refund.s6.lead')}</p>
            <ul>
              <li>{t('refund.s6.items.i1')}</li>
              <li>{t('refund.s6.items.i2')}</li>
              <li>{t('refund.s6.items.i3')}</li>
              <li>{t('refund.s6.items.i4')}</li>
              <li>{t('refund.s6.items.i5')}</li>
              <li>{t('refund.s6.items.i6')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s7.h')}</h2>
            <p>{t('refund.s7.lead')}</p>
            <ol>
              <li>
                {t('refund.s7.steps.i1Pre')}
                <a href={`mailto:${SUPPORT_EMAIL}`}><strong>{SUPPORT_EMAIL}</strong></a>{' '}
                {t('refund.s7.steps.i1Subject')}
              </li>
              <li>{t('refund.s7.steps.i2')}</li>
              <li>{t('refund.s7.steps.i3')}</li>
            </ol>
            <p>
              {t('refund.s7.phoneLinePre')}{' '}
              <a href="tel:+919901954610"><strong>{PHONE}</strong></a>{' '}
              {t('refund.s7.phoneLinePost')}
            </p>
            <p>{t('refund.s7.ack')}</p>
          </section>

          <section>
            <h2>{t('refund.s8.h')}</h2>
            <p>{t('refund.s8.lead')}</p>
            <ul>
              <li>{t('refund.s8.items.i1')}</li>
              <li>{t('refund.s8.items.i2')}</li>
              <li>{t('refund.s8.items.i3')}</li>
              <li>{t('refund.s8.items.i4')}</li>
              <li>{t('refund.s8.items.i5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s9.h')}</h2>
            <p>{t('refund.s9.lead')}</p>
            <ul>
              <li>{t('refund.s9.items.i1')}</li>
              <li>{t('refund.s9.items.i2')}</li>
              <li>{t('refund.s9.items.i3')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('refund.s10.h')}</h2>
            <p>{t('refund.s10.p')}</p>
          </section>

          <section>
            <h2>{t('refund.contactH')}</h2>
            <p>{t('refund.contactIntro')}</p>
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
