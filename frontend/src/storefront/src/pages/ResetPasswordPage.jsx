import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as authService from '../services/authService.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const tk = searchParams.get('token');
    const e = searchParams.get('email');
    if (!tk || !e) {
      setError(t('auth.reset.invalidLink', 'Invalid reset link. Please request a new password reset.'));
    } else {
      setToken(tk);
      setEmail(e);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.reset.passwordMin', 'Password must be at least 8 characters')); return; }
    if (password !== confirmPassword) { setError(t('auth.reset.passwordMismatch', 'Passwords do not match')); return; }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(token, email, password);
      setSuccess(t('auth.reset.success', 'Password reset successfully! Redirecting to login...'));
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || t('auth.reset.failed', 'Failed to reset password. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      <section style={{ maxWidth: 500, margin: '40px auto 60px', backgroundColor: '#fff', padding: 40, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 10, color: '#333' }}>{t('auth.reset.title', 'Reset Password')}</h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#777' }}>{t('auth.reset.subtitle', 'Enter your new password below')}</p>
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #e74c3c', borderRadius: 6, backgroundColor: 'rgba(231,76,60,0.1)', fontWeight: 500 }}>{error}</div>}
        {success && <div style={{ color: '#2ecc71', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #2ecc71', backgroundColor: 'rgba(46,204,113,0.1)', borderRadius: 6, fontWeight: 500 }}>{success}</div>}

        {token && !success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333', fontWeight: 600 }}>{t('auth.reset.newPassword', 'New Password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 12, paddingInlineEnd: 45, border: '1px solid #ddd', borderRadius: 4, fontSize: 16, boxSizing: 'border-box' }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#999', fontSize: 14 }}>{showPassword ? t('auth.common.hide', 'Hide') : t('auth.common.show', 'Show')}</span>
              </div>
              <small style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }}>{t('auth.reset.minChars', 'Minimum 8 characters')}</small>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333', fontWeight: 600 }}>{t('auth.reset.confirmPassword', 'Confirm Password')}</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#e0d5c5' : '#c8a97e', color: '#fff', border: 'none', padding: 15, borderRadius: 4, fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('auth.reset.resetting', 'Resetting...') : t('auth.reset.resetButton', 'Reset Password')}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#777' }}>
          <Link to="/login" style={{ color: '#c8a97e', textDecoration: 'none' }}>{t('auth.reset.backToLogin', 'Back to Login')}</Link>
        </div>
      </section>
    </div>
  );
}
