import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { login as loginService, requestPasswordReset, googleAuth } from '../services/authService.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const { isAuthenticated, login, loading } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (typeof window.google !== 'undefined' && window.google.accounts) {
      initGoogleSignIn();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSignIn;
      document.head.appendChild(script);
    }
  }, []);

  function initGoogleSignIn() {
    if (!window.google?.accounts?.id) return;
    const clientId = '1008005597417-icubq31993f3hob2fuc5em8d9ftope0c.apps.googleusercontent.com';
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
    const container = document.getElementById('google-signin-btn');
    if (container) {
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: '100%',
      });
    }
  }

  async function handleGoogleResponse(response) {
    try {
      const res = await googleAuth(response.credential);
      if (res.token) {
        login(res.token, res.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await loginService(email, password);
      if (result.token) {
        login(result.token, result.user);
        navigate('/dashboard');
      } else if (result.error?.includes('verify') || result.message?.includes('verify')) {
        setError(t('verifyEmailNotice'));
      } else {
        throw new Error(result.error || t('loginFailed'));
      }
    } catch (err) {
      setError(err.message || t('loginFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotMsg('');
    setForgotError('');
    try {
      await requestPasswordReset(forgotEmail);
      setForgotMsg(t('resetSent'));
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset email');
    }
  }

  if (loading) return null;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{t('loginTitle')}</h2>
        <p>{t('loginSubtitle')}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('common:email')}</label>
            <input
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('common:password')}</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? t('signingIn') : t('signIn')}
          </button>
          <div id="google-signin-btn" className="google-btn-wrapper"></div>
          {error && <div className="error-msg">{error}</div>}
        </form>
        <div className="auth-link">
          <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}>{t('forgotPassword')}</a>
        </div>
        <p className="auth-footer">
          {t('newToFlomerce')} <Link to="/signup">{t('createAccount')}</Link>
        </p>
      </div>

      {showForgotModal && (
        <div className="forgot-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="forgot-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('forgotTitle')}</h3>
            <p>{t('forgotDesc')}</p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>{t('common:email')}</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForgotModal(false)}>{t('common:cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('sendResetLink')}</button>
              </div>
              {forgotMsg && <div className="success-msg">{forgotMsg}</div>}
              {forgotError && <div className="error-msg">{forgotError}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
