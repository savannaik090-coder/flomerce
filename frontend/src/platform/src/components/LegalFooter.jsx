import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Self-contained footer shown at the bottom of every legal page (Terms,
// Privacy, Refund, Shipping). The legal page bodies themselves stay
// hard-coded English — only this footer (and the LegalBindingBanner at the
// top, plus the LanguageSwitcher in LegalNavbar) is translated.
//
// Uses the 'landing' namespace because it shares the same six footer keys
// (footerAbout / footerTerms / footerPrivacy / footerRefund /
// footerShipping / footerAddress) as LandingPage and AboutPage — keeping
// the strings identical across all surfaces means the translator has one
// source of truth per phrase.
//
// `phone` and `email` are intentionally raw English values passed in as
// props by each legal page (they are PHONE / SUPPORT_EMAIL constants),
// because phone numbers and email addresses are universal contact strings
// that do not translate.
//
// This component is one of three sanctioned `useTranslation` callers that
// may appear on a legal page (the others are LegalBindingBanner and the
// LanguageSwitcher embedded in LegalNavbar). Do not add any other t()
// calls to the legal page bodies — see replit.md "Translation Architecture"
// for the rule.
export default function LegalFooter({ phone, email }) {
  const { t } = useTranslation('landing');
  return (
    <footer className="legal-footer">
      <div className="legal-footer-links">
        <Link to="/about">{t('footerAbout')}</Link>
        <Link to="/terms">{t('footerTerms')}</Link>
        <Link to="/privacy-policy">{t('footerPrivacy')}</Link>
        <Link to="/refund-policy">{t('footerRefund')}</Link>
        <Link to="/shipping-policy">{t('footerShipping')}</Link>
      </div>
      <p>&copy; {new Date().getFullYear()} Flomerce. {t('rightsReserved')}</p>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
        {t('footerAddress')} | {phone} | {email}
      </p>
    </footer>
  );
}
