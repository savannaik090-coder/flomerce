import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import '../styles/legal.css';
import { SUPPORT_EMAIL, PLATFORM_URL, PLATFORM_DOMAIN } from '../config.js';

export default function AboutPage() {
  const { t } = useTranslation(['landing', 'about']);
  const aboutItem = (k) => (
    <Trans i18nKey={k} ns="about" components={{ strong: <strong /> }} />
  );
  return (
    <div className="legal-page">
      <div className="container">
        <Navbar />
        <div className="legal-content">
          <h1>{t('aboutTitle')}</h1>
          <p className="legal-updated">{t('aboutTagline')}</p>

          <section>
            <h2>{t('aboutWhoTitle')}</h2>
            <p>{t('about:whoP1')}</p>
            <p>{t('about:whoP2')}</p>
          </section>

          <section>
            <h2>{t('aboutWhatTitle')}</h2>
            <p>{t('about:whatLead', { domain: PLATFORM_DOMAIN })}</p>
            <ul>
              <li>{aboutItem('whatItems.builder')}</li>
              <li>{aboutItem('whatItems.products')}</li>
              <li>{aboutItem('whatItems.orders')}</li>
              <li>{aboutItem('whatItems.payments')}</li>
              <li>{aboutItem('whatItems.customers')}</li>
              <li>{aboutItem('whatItems.analytics')}</li>
              <li>{aboutItem('whatItems.seo')}</li>
              <li>{aboutItem('whatItems.push')}</li>
              <li>{aboutItem('whatItems.domains')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('aboutMissionTitle')}</h2>
            <p>{t('about:missionP1')}</p>
            <p>{t('about:missionP2')}</p>
          </section>

          <section>
            <h2>{t('aboutHowTitle')}</h2>
            <ol>
              <li>{aboutItem('howItems.signup')}</li>
              <li>{aboutItem('howItems.build')}</li>
              <li>{aboutItem('howItems.payments')}</li>
              <li>{aboutItem('howItems.live')}</li>
            </ol>
          </section>

          <section>
            <h2>{t('aboutValuesTitle')}</h2>
            <ul>
              <li>{aboutItem('valuesItems.simplicity')}</li>
              <li>{aboutItem('valuesItems.transparency')}</li>
              <li>{aboutItem('valuesItems.security')}</li>
              <li>{aboutItem('valuesItems.support')}</li>
            </ul>
          </section>

          <section>
            <h2>{t('aboutContactTitle')}</h2>
            <p>{t('about:contactIntro')}</p>
            <p><strong>{t('about:contactBrand')}</strong></p>
            <p><strong>{t('about:labelEmail')}</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
            <p><strong>{t('about:labelPhone')}</strong> <a href="tel:+919901954610">+91 9901954610</a></p>
            <p><strong>{t('about:labelAddress')}</strong> {t('about:address')}</p>
            <p><strong>{t('about:labelWebsite')}</strong> <a href={PLATFORM_URL}>{PLATFORM_URL}</a></p>
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
          <p>&copy; {new Date().getFullYear()} Flomerce. {t('rightsReserved')}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t('about:address')} | +91 9901954610 | {SUPPORT_EMAIL}</p>
        </footer>
      </div>
    </div>
  );
}
