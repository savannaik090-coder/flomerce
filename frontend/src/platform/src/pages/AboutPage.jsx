import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { SUPPORT_EMAIL, PLATFORM_URL, PLATFORM_DOMAIN } from '../config.js';

// Contact-card values that should NEVER be translated regardless of the
// visitor's selected language: brand name, address, phone, email and the
// public website URL. These are identity / contact data, not UI labels.
const RAW_BRAND = 'Flomerce';
const RAW_ADDRESS = 'Karwar, Karnataka, India — 581400';
const RAW_PHONE = '+91 9901954610';

export default function AboutPage() {
  const { t } = useTranslation('landing');

  // Bullet/numbered list items for the body sections. Each item's `label` and
  // `desc` keys are looked up under about.{whatItems|howItems|valuesItems}.
  const whatItemKeys = [
    'storeBuilder', 'productMgmt', 'orderProcessing', 'securePayments',
    'customerMgmt', 'analytics', 'seoTools', 'pushNotif', 'customDomains',
  ];
  const howItemKeys = ['signUp', 'buildStore', 'setupPayments', 'goLive'];
  const valuesItemKeys = ['simplicity', 'transparency', 'security', 'support'];

  return (
    <div className="legal-page">
      <Navbar />
      <div className="container">
        <div className="legal-content">
          <h1>{t('about.title')}</h1>
          <p className="legal-updated">{t('about.tagline')}</p>

          <section>
            <h2>{t('about.whoTitle')}</h2>
            <p>{t('about.whoP1')}</p>
            <p>{t('about.whoP2')}</p>
          </section>

          <section>
            <h2>{t('about.whatTitle')}</h2>
            <p>{t('about.whatIntro', { domain: PLATFORM_DOMAIN })}</p>
            <ul>
              {whatItemKeys.map((k) => (
                <li key={k}>
                  <strong>{t(`about.whatItems.${k}.label`)}:</strong>{' '}
                  {t(`about.whatItems.${k}.desc`)}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>{t('about.missionTitle')}</h2>
            <p>{t('about.missionP1')}</p>
            <p>{t('about.missionP2')}</p>
          </section>

          <section>
            <h2>{t('about.howTitle')}</h2>
            <ol>
              {howItemKeys.map((k) => (
                <li key={k}>
                  <strong>{t(`about.howItems.${k}.label`)}:</strong>{' '}
                  {t(`about.howItems.${k}.desc`)}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2>{t('about.valuesTitle')}</h2>
            <ul>
              {valuesItemKeys.map((k) => (
                <li key={k}>
                  <strong>{t(`about.valuesItems.${k}.label`)}:</strong>{' '}
                  {t(`about.valuesItems.${k}.desc`)}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>{t('about.contactTitle')}</h2>
            <p>{t('about.contactIntro')}</p>
            <p><strong>{RAW_BRAND}</strong></p>
            <p><strong>{t('about.emailLabel')}:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>{t('about.phoneLabel')}:</strong> <a href={`tel:${RAW_PHONE.replace(/\s+/g, '')}`}>{RAW_PHONE}</a></p>
            <p><strong>{t('about.addressLabel')}:</strong> {RAW_ADDRESS}</p>
            <p><strong>{t('about.websiteLabel')}:</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
          </section>
        </div>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            <Link to="/about">{t('footerAbout')}</Link>
            <Link to="/terms">{t('footerTerms')}</Link>
            <Link to="/privacy-policy">{t('footerPrivacy')}</Link>
            <Link to="/refund-policy">{t('footerRefund')}</Link>
            <Link to="/shipping-policy">{t('footerShipping')}</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} {RAW_BRAND}. {t('rightsReserved')}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {t('footerAddress')} | {RAW_PHONE} | {SUPPORT_EMAIL}
          </p>
        </footer>
      </div>
    </div>
  );
}
