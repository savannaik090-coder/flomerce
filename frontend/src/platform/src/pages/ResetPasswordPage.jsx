import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../services/authService.js';

export default function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common']);
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError(t('passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsNoMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(token, email, password);
      if (res.success) {
        setSuccess(t('resetPassword.successMsg'));
        setTimeout(() => navigate('/login'), 2000);
      } else {
        throw new Error(res.error || t('resetPassword.resetGenericFailed'));
      }
    } catch (err) {
      setError(err.message || t('resetPassword.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) return null;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{t('resetPassword.title')}</h2>
        <p>{t('resetPassword.intro')}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('resetPassword.newPassword')}</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder={t("common:passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('resetPassword.confirmPasswordLabel')}</label>
            <input
              type="password"
              required
              placeholder={t("common:passwordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </button>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
        </form>
        <p className="auth-footer">
          <Link to="/login">{t('backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
