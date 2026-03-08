import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
        setError('Please verify your email before logging in. Check your inbox.');
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
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
      setForgotMsg('If an account exists, a reset link has been sent.');
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset email');
    }
  }

  if (loading) return null;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p>Enter your details to access your account.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Logging in...' : 'Sign in'}
          </button>
          <div id="google-signin-btn" className="google-btn-wrapper"></div>
          {error && <div className="error-msg">{error}</div>}
        </form>
        <div className="auth-link">
          <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}>Forgot password?</a>
        </div>
        <p className="auth-footer">
          New to Fluxe? <Link to="/signup">Create an account</Link>
        </p>
      </div>

      {showForgotModal && (
        <div className="forgot-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="forgot-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Forgot Password</h3>
            <p>Enter your email to receive a reset link.</p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForgotModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Send Reset Link</button>
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
