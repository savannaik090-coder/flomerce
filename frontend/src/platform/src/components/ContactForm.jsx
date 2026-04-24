import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORT_EMAIL } from '../config.js';

export default function ContactForm() {
  const { t } = useTranslation('landing');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(formData.subject || t('contact.mailtoSubject'))}&body=${encodeURIComponent(`${t('contact.mailBodyName')}: ${formData.name}\n${t('contact.mailBodyEmail')}: ${formData.email}\n\n${formData.message}`)}`;
    window.location.href = mailtoLink;
    setStatus('sent');
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="contact-section">
      <div className="contact-wrapper">
        <div className="contact-info-side">
          <h2>{t('contact.title')}</h2>
          <p>{t('contact.subtitle')}</p>
          <div className="contact-details">
            <div className="contact-detail-item">
              <div className="contact-detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div>
                <span className="contact-detail-label">{t('contact.labelEmail')}</span>
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
            </div>
            <div className="contact-detail-item">
              <div className="contact-detail-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <span className="contact-detail-label">{t('contact.labelPhone')}</span>
                <a href="tel:+919901954610">+91 9901954610</a>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form-side">
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form-row">
              <div className="contact-form-group">
                <label htmlFor="cf-name">{t('contact.yourName')}</label>
                <input type="text" id="cf-name" name="name" placeholder={t('contact.namePlaceholder')} required value={formData.name} onChange={handleChange} />
              </div>
              <div className="contact-form-group">
                <label htmlFor="cf-email">{t('contact.emailAddress')}</label>
                <input type="email" id="cf-email" name="email" placeholder={t('contact.emailPlaceholder')} required value={formData.email} onChange={handleChange} />
              </div>
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-subject">{t('contact.subject')}</label>
              <input type="text" id="cf-subject" name="subject" placeholder={t('contact.subjectPlaceholder')} value={formData.subject} onChange={handleChange} />
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-message">{t('contact.message')}</label>
              <textarea id="cf-message" name="message" placeholder={t('contact.messagePlaceholder')} rows="5" required value={formData.message} onChange={handleChange}></textarea>
            </div>
            <button type="submit" className="btn contact-submit-btn">
              {t('contact.send')}
            </button>
            {status === 'sent' && (
              <p className="contact-success-msg">{t('contact.successMsg', { email: SUPPORT_EMAIL })}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
