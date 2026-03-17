import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import * as authService from '../services/authService.js';

export default function SignupPage() {
  const navigate = useNavigate();
  const { siteConfig } = useContext(SiteContext);
  const { isAuthenticated, login } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const googleInitialized = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    setError('');
    try {
      const result = await authService.googleLogin(siteConfig?.id, response.credential);
      const userData = result.customer || result.data;
      const token = result.token;
      login(userData, token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [siteConfig, login, navigate]);

  useEffect(() => {
    const clientId = siteConfig?.googleClientId;
    if (!clientId || googleInitialized.current) return;

    function initGoogle() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        width: googleBtnRef.current.offsetWidth || 340,
      });
      googleInitialized.current = true;
    }

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [siteConfig?.googleClientId, handleGoogleCredential]);

  const validate = () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) errs.email = 'Please enter a valid email';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const result = await authService.signup(siteConfig?.id, name, email, password);
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
      setError(err.message || 'Signup failed. Please try again.');
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
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 10, color: '#333' }}>Create Your Account</h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#777' }}>Join us to explore exclusive collections</p>
        </div>

        {error && <div style={{ color: '#d32f2f', fontSize: 16, marginBottom: 20, backgroundColor: '#ffebee', padding: 15, borderRadius: 5, borderLeft: '4px solid #d32f2f', fontWeight: 500 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Full Name</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.name ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.name && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.name}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.email ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.email && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.email}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Password (8+ characters)</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.password ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.password && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.password}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333' }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); }} required style={{ width: '100%', padding: 12, border: `1px solid ${fieldErrors.confirmPassword ? '#d32f2f' : '#ddd'}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
            {fieldErrors.confirmPassword && <div style={{ color: '#d32f2f', fontSize: 14, marginTop: 5 }}>{fieldErrors.confirmPassword}</div>}
          </div>
          <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#e0d5c5' : '#c8a97e', color: '#fff', border: 'none', padding: 15, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.3s ease', position: 'relative' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {siteConfig?.googleClientId && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#777', fontFamily: "'Lato', sans-serif" }}>
              <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
              <span style={{ padding: '0 10px' }}>Or continue with</span>
              <div style={{ flex: 1, borderBottom: '1px solid #ddd' }} />
            </div>

            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', minHeight: 44, position: 'relative' }}>
              {googleLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1, borderRadius: 4 }}>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#666' }}>Signing in...</span>
                </div>
              )}
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#777' }}>
          Already have an account? <Link to="/login" style={{ color: '#c8a97e', textDecoration: 'none' }}>Log in</Link>
        </div>
      </section>

      {showVerificationPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 10, textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', width: '90%', maxWidth: 450 }}>
            <div style={{ fontSize: 60, color: '#28a745', marginBottom: 20 }}>✉</div>
            <h3 style={{ fontSize: 24, marginBottom: 15, color: '#333' }}>Account Created Successfully!</h3>
            <div style={{ fontSize: 16, color: '#555', marginBottom: 25, lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}><strong>Important:</strong> Your account has been created but you <strong style={{ color: '#d32f2f' }}>CANNOT log in</strong> until you verify your email.</p>
              <p style={{ marginBottom: 10 }}>You'll receive a verification email that you must click before accessing your account.</p>
              <p><strong>Note:</strong> Please also check your spam folder if you don't see the email in your inbox.</p>
              <p style={{ fontWeight: 'bold', color: '#007bff', marginTop: 10 }}>You will be redirected to the login page...</p>
            </div>
            <button onClick={handleVerificationOk} style={{ backgroundColor: '#007bff', color: '#fff', padding: '12px 25px', border: 'none', borderRadius: 5, fontSize: 16, cursor: 'pointer', transition: 'background-color 0.3s ease' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
