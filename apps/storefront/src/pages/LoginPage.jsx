import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import * as authService from '../services/authService.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await authService.login(email, password);
      if (result.requiresVerification || result.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(email);
        setShowVerificationNotice(true);
        setLoading(false);
        return;
      }
      const userData = result.user || result.data;
      const token = result.token;
      login(userData, token);
      setSuccess('Login successful!');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(email);
        setShowVerificationNotice(true);
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { setResetError('Please enter your email address'); return; }
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      await authService.requestPasswordReset(resetEmail);
      setResetSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      setResetError(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess('');
    try {
      await authService.resendVerification(verificationEmail);
      setResendSuccess('Verification email sent! Check your inbox.');
    } catch {
      setResendSuccess('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('Google Sign-In is not yet configured for this store.');
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      <section style={{ maxWidth: 600, margin: '160px auto 60px', backgroundColor: '#fff', padding: 30, borderRadius: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 10, color: '#333' }}>Login to Your Account</h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#777' }}>Welcome back, please enter your details</p>
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #e74c3c', borderRadius: 6, backgroundColor: 'rgba(231,76,60,0.1)', fontWeight: 500 }}>{error}</div>}
        {success && <div style={{ color: '#2ecc71', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #2ecc71', backgroundColor: 'rgba(46,204,113,0.1)', borderRadius: 6, fontWeight: 500 }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button type="button" onClick={() => { setShowForgotModal(true); setResetEmail(email); }} style={{ background: 'none', border: 'none', color: '#c8a97e', fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}>Forgot Password?</button>
          </div>
          <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#e0d5c5' : '#c8a97e', color: '#fff', border: 'none', padding: 15, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.3s ease' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#777', fontFamily: "'Lato', sans-serif" }}>
          <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
          <span style={{ padding: '0 10px' }}>Or continue with</span>
          <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <button onClick={handleGoogleLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 12, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#333', cursor: 'pointer', transition: 'background-color 0.3s ease' }}>
            <img src="https://cdn-icons-png.flaticon.com/128/300/300221.png" alt="Google" style={{ width: 20, marginRight: 10 }} />
            Sign in with Google
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#777' }}>
          Don't have an account? <Link to="/signup" style={{ color: '#c8a97e', textDecoration: 'none' }}>Sign up</Link>
        </div>
      </section>

      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 12, maxWidth: 400, width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>Reset Password</h3>
              <button onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            <p style={{ color: '#666', marginBottom: 16 }}>Enter your email address and we'll send you a link to reset your password.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Email Address</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Enter your email" style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {resetError && <div style={{ color: '#e74c3c', fontSize: 14, marginBottom: 12, padding: 10, background: '#ffebee', borderRadius: 4 }}>{resetError}</div>}
            {resetSuccess && <div style={{ color: '#2ecc71', fontSize: 14, marginBottom: 12, padding: 10, background: '#e8f5e9', borderRadius: 4 }}>{resetSuccess}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleForgotPassword} disabled={resetLoading} style={{ flex: 1, backgroundColor: '#c8a97e', color: '#fff', border: 'none', padding: 12, borderRadius: 4, fontSize: 14, fontWeight: 'bold', cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
                {resetLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button onClick={() => setShowForgotModal(false)} style={{ padding: '12px 20px', background: '#f8f9fa', color: '#333', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showVerificationNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 12, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 48, color: '#2563eb', marginBottom: 20 }}>📧</div>
            <h3 style={{ marginBottom: 15, color: '#333' }}>Email Verification Required</h3>
            <p style={{ marginBottom: 20, color: '#666', lineHeight: 1.5 }}>Please verify your email address before logging in. Check your email inbox (and spam folder) for the verification link.</p>
            {resendSuccess && <div style={{ color: '#2ecc71', fontSize: 14, marginBottom: 12, padding: 10, background: '#e8f5e9', borderRadius: 4 }}>{resendSuccess}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleResendVerification} disabled={resendLoading} style={{ backgroundColor: '#c8a97e', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 4, cursor: resendLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button onClick={() => setShowVerificationNotice(false)} style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 4, cursor: 'pointer' }}>Close</button>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginTop: 15 }}><strong>Tip:</strong> If you don't receive the email, check your spam folder or contact support.</p>
          </div>
        </div>
      )}
    </div>
  );
}
