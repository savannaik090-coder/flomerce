import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL } from '../config.js';

const PHONE = '+91 9901954610';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('legal');
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>{t('privacy.title')}</h1>
          <p className="legal-updated">{t('lastUpdated', { date: t('privacy.updatedDate') })}</p>

          <div className="legal-binding-banner" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '12px 16px', margin: '0 0 1rem' }}>
            <strong style={{ display: 'block', marginBottom: 4, color: '#78350f' }}>{t('bindingBanner.title')}</strong>
            <span style={{ fontSize: '0.875rem', color: '#78350f' }}>{t('bindingBanner.body')}</span>
          </div>

          <section className="legal-summary" style={{ background: '#f1f5f9', borderRadius: 8, padding: '1rem 1.25rem', margin: '0 0 1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>{t('summaryHeading')}</h2>
            <ul>
              <li>{t('privacy.summary1')}</li>
              <li>{t('privacy.summary2')}</li>
              <li>{t('privacy.summary3')}</li>
              <li>{t('privacy.summary4')}</li>
              <li>{t('privacy.summary5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('privacy.s1.h')}</h2>
            <p>{t('privacy.s1.p', { domain: PLATFORM_DOMAIN })}</p>
          </section>

          <section>
            <h2>{t('privacy.s2.h')}</h2>
            <h3>{t('privacy.s2.personalH')}</h3>
            <p>{t('privacy.s2.personalLead')}</p>
            <ul>
              <li>{t('privacy.s2.personal.i1')}</li>
              <li>{t('privacy.s2.personal.i2')}</li>
              <li>{t('privacy.s2.personal.i3')}</li>
              <li>{t('privacy.s2.personal.i4')}</li>
              <li>{t('privacy.s2.personal.i5')}</li>
            </ul>

            <h3>{t('privacy.s2.paymentH')}</h3>
            <p>{t('privacy.s2.paymentP')}</p>

            <h3>{t('privacy.s2.contentH')}</h3>
            <p>{t('privacy.s2.contentP')}</p>

            <h3>{t('privacy.s2.autoH')}</h3>
            <p>{t('privacy.s2.autoLead')}</p>
            <ul>
              <li>{t('privacy.s2.auto.i1')}</li>
              <li>{t('privacy.s2.auto.i2')}</li>
              <li>{t('privacy.s2.auto.i3')}</li>
              <li>{t('privacy.s2.auto.i4')}</li>
              <li>{t('privacy.s2.auto.i5')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('privacy.s3.h')}</h2>
            <p>{t('privacy.s3.lead')}</p>
            <ul>
              <li>{t('privacy.s3.items.i1')}</li>
              <li>{t('privacy.s3.items.i2')}</li>
              <li>{t('privacy.s3.items.i3')}</li>
              <li>{t('privacy.s3.items.i4')}</li>
              <li>{t('privacy.s3.items.i5')}</li>
              <li>{t('privacy.s3.items.i6')}</li>
              <li>{t('privacy.s3.items.i7')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('privacy.s4.h')}</h2>
            <p>{t('privacy.s4.lead')}</p>
            <ul>
              <li><strong>{t('privacy.s4.items.i1Label')}</strong> {t('privacy.s4.items.i1Text')}</li>
              <li><strong>{t('privacy.s4.items.i2Label')}</strong> {t('privacy.s4.items.i2Text')}</li>
              <li><strong>{t('privacy.s4.items.i3Label')}</strong> {t('privacy.s4.items.i3Text')}</li>
              <li><strong>{t('privacy.s4.items.i4Label')}</strong> {t('privacy.s4.items.i4Text')}</li>
              <li><strong>{t('privacy.s4.items.i5Label')}</strong> {t('privacy.s4.items.i5Text')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('privacy.s5.h')}</h2>
            <p>{t('privacy.s5.lead')}</p>
            <ul>
              <li>{t('privacy.s5.items.i1')}</li>
              <li>{t('privacy.s5.items.i2')}</li>
              <li>{t('privacy.s5.items.i3')}</li>
              <li>{t('privacy.s5.items.i4')}</li>
              <li>{t('privacy.s5.items.i5')}</li>
            </ul>
            <p>{t('privacy.s5.tail')}</p>
          </section>

          <section>
            <h2>{t('privacy.s6.h')}</h2>
            <p>{t('privacy.s6.p')}</p>
          </section>

          <section>
            <h2>{t('privacy.s7.h')}</h2>
            <p>{t('privacy.s7.lead')}</p>
            <ul>
              <li>{t('privacy.s7.items.i1')}</li>
              <li>{t('privacy.s7.items.i2')}</li>
              <li>{t('privacy.s7.items.i3')}</li>
              <li>{t('privacy.s7.items.i4')}</li>
              <li>{t('privacy.s7.items.i5')}</li>
              <li>{t('privacy.s7.items.i6')}</li>
            </ul>
            <p>
              <Trans
                i18nKey="privacy.s7.tail"
                ns="legal"
                values={{ email: SUPPORT_EMAIL, phone: PHONE }}
                components={{
                  email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>,
                  phone: <a href="tel:+919901954610">{PHONE}</a>,
                }}
              />
            </p>
          </section>

          <section>
            <h2>{t('privacy.s8.h')}</h2>
            <p>{t('privacy.s8.p')}</p>
          </section>

          <section>
            <h2>{t('privacy.s9.h')}</h2>
            <p>{t('privacy.s9.p')}</p>
          </section>

          <section>
            <h2>{t('privacy.s10.h')}</h2>
            <p>{t('privacy.s10.p')}</p>
          </section>

          <section>
            <h2>{t('privacy.s11.h')}</h2>
            <p>{t('privacy.s11.p')}</p>
          </section>

          <section>
            <h2>{t('privacy.contactH')}</h2>
            <p>{t('privacy.contactIntro')}</p>
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
