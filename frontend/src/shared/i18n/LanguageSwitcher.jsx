import { useTranslation } from 'react-i18next';
import { PRESHIPPED } from './init.js';

const LANG_LABELS = {
  en: 'English',
  hi: 'हिन्दी',
  es: 'Español',
  'zh-CN': '简体中文',
  ar: 'العربية',
};

export default function LanguageSwitcher({ className = '', compact = false }) {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language || 'en').split('-')[0] === 'zh' ? 'zh-CN' : (i18n.language || 'en');

  function handleChange(e) {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try { localStorage.setItem('flomerce_lang', lng); } catch {}
  }

  return (
    <select
      className={`flomerce-lang-switcher ${className}`}
      value={PRESHIPPED.includes(current) ? current : 'en'}
      onChange={handleChange}
      aria-label={t('language', 'Language')}
      style={{
        padding: compact ? '4px 8px' : '6px 10px',
        fontSize: compact ? 12 : 13,
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: '#fff',
        color: '#0f172a',
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      {PRESHIPPED.map((lng) => (
        <option key={lng} value={lng}>{LANG_LABELS[lng] || lng}</option>
      ))}
    </select>
  );
}
