import { useTranslation } from 'react-i18next';

// Self-contained banner shown at the top of every legal page (Terms, Privacy,
// Refund, Shipping). The legal page bodies themselves stay hard-coded English
// — only this banner is translated, because it is the *meta-message* that
// explains to a non-English visitor WHY the legal text below remains in
// English. Without translation it would not serve its purpose.
//
// This component is the only sanctioned `useTranslation` call that lives in
// or under a legal page. Do not add other t() calls to the legal pages — see
// replit.md "Translation Architecture" for the rule.
export default function LegalBindingBanner() {
  const { t } = useTranslation('common');
  return (
    <div
      className="legal-binding-banner"
      style={{
        background: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: 8,
        padding: '12px 16px',
        margin: '0 0 1rem',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 4, color: '#78350f' }}>
        {t('legalBindingTitle')}
      </strong>
      <span style={{ fontSize: '0.875rem', color: '#78350f' }}>
        {t('legalBindingBody')}
      </span>
    </div>
  );
}
