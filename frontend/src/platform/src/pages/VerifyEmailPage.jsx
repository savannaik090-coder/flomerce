import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { verifyEmail } from '../services/authService.js';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState(t('verifyEmail.waitMessage'));

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token) {
      setStatus('error');
      setMessage(t('verifyEmail.tokenMissing'));
      return;
    }

    verifyEmail(token, email || '')
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage(t('verifyEmail.successMessage'));
        } else {
          setStatus('error');
          setMessage(res.error || t('verifyEmail.linkInvalid'));
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || t('verifyEmail.verificationFailed'));
      });
  }, [searchParams, t]);

  const titles = {
    verifying: t('verifyEmail.verifyingTitle'),
    success: t('verifyEmail.successTitle'),
    error: t('verifyEmail.errorTitle'),
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2>{titles[status]}</h2>
        <p>{message}</p>
        {status === 'success' && (
          <Link to="/login" className="btn btn-primary">{t('verifyEmail.goToLogin')}</Link>
        )}
        {status === 'error' && (
          <Link to="/login" className="btn btn-outline" style={{ marginTop: '1rem' }}>{t('verifyEmail.backToLoginBtn')}</Link>
        )}
      </div>
    </div>
  );
}
