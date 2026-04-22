import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../context/SiteContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import * as authService from '../services/authService.js';
import { setAuthToken } from '../services/api.js';
import { PLATFORM_URL } from '../config.js';
import PhoneInput from '../components/ui/PhoneInput.jsx';

export default function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { siteConfig } = useContext(SiteContext);
  const { isAuthenticated, login } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const googleToken = searchParams.get('google_auth_token');
    const googleCustomer = searchParams.get('google_auth_customer');
    if (googleToken && googleCustomer) {
      try {
        const userData = JSON.parse(googleCustomer);
        setAuthToken(googleToken);
        login(userData, googleToken);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        navigate('/');
      } catch (e) {
        setError(t('auth.signup.googleFailed', 'Google sign-up failed. Please try again.'));
      }
    }
  }, [searchParams, login, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSignup = () => {
    const returnUrl = window.location.origin + '/signup';
    const googleAuthUrl = `${PLATFORM_URL}/auth/google/start?siteId=${encodeURIComponent(siteConfig?.id || '')}&returnUrl=${encodeURIComponent(returnUrl)}&mode=signup`;
    window.location.href = googleAuthUrl;
  };

  const validate = () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = t('auth.signup.errors.nameMin', 'Name must be at least 2 characters');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) errs.email = t('auth.signup.errors.invalidEmail', 'Please enter a valid email');
    if (password.length < 8) errs.password = t('auth.signup.errors.passwordMin', 'Password must be at least 8 characters');
    if (password !== confirmPassword) errs.confirmPassword = t('auth.signup.errors.passwordMismatch', 'Passwords do not match');
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const result = await authService.signup(siteConfig?.id, name, email, password, phone);
      const userData = result.customer || result.data;
      const token = result.token;
      if (result.requiresVerification) {
        setShowVerificationPopup(true);
        return;
      }
      if (userData && token) {
        login(userData, token);
        navigate('/');
        return;
      }
      setShowVerificationPopup(true);
    } catch (err) {
      setError(err.message || t('auth.signup.errors.failed', 'Signup failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationOk = () => {
    setShowVerificationPopup(false);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      <section style={{ maxWidth: 600, margin: '40px auto 60px', backgroundColor: '#fff', padding: 30, borderRadius: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 10, color: '#333' }}>{t('auth.signup.title', 'Create Your Account')}</h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#777' }}>{t('auth.signup.subtitle', 'Join us to explore exclusive collections')}</p>
        </div>

        {error && <div style={{ color: '#d32f2f', fontSize: 16, marginBottom: 20, backgroundColor: '#ffebee', padding: 15, borderRadius: 5, borderInlineStart: '4px solid #d32f2f', fontWeight: 500 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>{t('auth.signup.fullName', 'Full Name')}</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.name ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.name && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.name}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>{t('auth.common.email', 'Email')}</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.email ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.email && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.email}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>{t('auth.signup.phoneNumber', 'Phone Number')} <span style={{ color: '#999', fontWeight: 400 }}>{t('auth.signup.optional', '(optional)')}</span></label>
            <PhoneInput
              value={phone}
              onChange={val => setPhone(val)}
              placeholder={t('auth.signup.phonePlaceholder', 'Phone number')}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>{t('auth.signup.passwordLabel', 'Password (8+ characters)')}</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.password ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.password && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.password}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>{t('auth.signup.confirmPassword', 'Confirm Password')}</label>
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.confirmPassword ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.confirmPassword && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.confirmPassword}</div>}
          </div>
          <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#e0d5c5' : '#c8a97e', color: '#fff', border: 'none', padding: 15, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.3s ease', position: 'relative' }}>
            {loading ? t('auth.signup.creating', 'Creating Account...') : t('auth.signup.createButton', 'Create Account')}
          </button>
        </form>

        {siteConfig?.googleClientId && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#777', fontFamily: "'Lato', sans-serif" }}>
              <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
              <span style={{ padding: '0 10px' }}>{t('auth.common.orContinueWith', 'Or continue with')}</span>
              <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <button onClick={handleGoogleSignup} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 12, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#333', cursor: 'pointer' }}>
                <img src="https://cdn-icons-png.flaticon.com/128/300/300221.png" alt={t('auth.common.googleAlt', 'Google')} style={{ width: 20, marginInlineEnd: 10 }} />
                {t('auth.signup.signUpWithGoogle', 'Sign up with Google')}
              </button>
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#777' }}>
          {t('auth.signup.haveAccount', 'Already have an account?')} <Link to="/login" style={{ color: '#c8a97e', textDecoration: 'none' }}>{t('auth.signup.logIn', 'Log in')}</Link>
        </div>
      </section>

      {showVerificationPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 10, textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', width: '90%', maxWidth: 450 }}>
            <div style={{ fontSize: 60, color: '#28a745', marginBottom: 20 }}>✉</div>
            <h3 style={{ fontSize: 24, marginBottom: 15, color: '#333' }}>{t('auth.signup.verifyTitle', 'Account Created Successfully!')}</h3>
            <div style={{ fontSize: 16, color: '#555', marginBottom: 25, lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}><strong>{t('auth.signup.important', 'Important:')}</strong> {t('auth.signup.verifyMessage1Pre', 'Your account has been created but you ')}<strong style={{ color: '#d32f2f' }}>{t('auth.signup.cannotLogIn', 'CANNOT log in')}</strong>{t('auth.signup.verifyMessage1Post', ' until you verify your email.')}</p>
              <p style={{ marginBottom: 10 }}>{t('auth.signup.verifyMessage2', "You'll receive a verification email that you must click before accessing your account.")}</p>
              <p><strong>{t('auth.signup.noteLabel', 'Note:')}</strong> {t('auth.signup.noteText', "Please also check your spam folder if you don't see the email in your inbox.")}</p>
              <p style={{ fontWeight: 'bold', color: '#007bff', marginTop: 10 }}>{t('auth.signup.redirecting', 'You will be redirected to the login page...')}</p>
            </div>
            <button onClick={handleVerificationOk} style={{ backgroundColor: '#007bff', color: '#fff', padding: '12px 25px', border: 'none', borderRadius: 5, fontSize: 16, cursor: 'pointer', transition: 'background-color 0.3s ease' }}>{t('auth.common.ok', 'OK')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
