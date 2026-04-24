import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { signup as signupService, resendVerification, googleAuth } from '../services/authService.js';
import '../styles/landing.css';
import { useToast } from '../../../shared/ui/Toast.jsx';
export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const agreedTermsRef = useRef(false);
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    agreedTermsRef.current = agreedTerms;
  }, [agreedTerms]);

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
    if (!agreedTermsRef.current) {
      setError("Please agree to the Terms & Conditions, Privacy Policy, and Refund Policy before signing up.");
      return;
    }
    try {
      const res = await googleAuth(response.credential);
      if (res.token) {
        login(res.token, res.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupService(name, email, password);
      if (result.success || result.message?.includes('verify') || result.message?.includes('Verification')) {
        setRegisteredEmail(email);
        setShowSuccess(true);
      } else {
        throw new Error(result.error || "Signup failed");
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await resendVerification(registeredEmail);
      toast.success("Verification email resent!");
    } catch (err) {
      toast.error(err.message || "Failed to resend");
    }
  }

  if (loading) return null;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Create an account</h2>
        <p>Start your 60-second website journey today.</p>

        {!showSuccess ? (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="terms-agree-group">
                <input type="checkbox" id="agree-terms" required checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
                <label htmlFor="agree-terms">
                  I agree to the <Link to="/terms" target="_blank">Terms & Conditions</Link>, <Link to="/privacy-policy" target="_blank">Privacy Policy</Link>, and <Link to="/refund-policy" target="_blank">Refund & Cancellation Policy</Link>.
                </label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? "Creating Account..." : "Create account"}
              </button>
              <div id="google-signin-btn" className="google-btn-wrapper"></div>
              {error && <div className="error-msg">{error}</div>}
            </form>
            <p className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </>
        ) : (
          <div className="success-box">
            <h3>Verification Required</h3>
            <p>Please check your email to verify your account. If you didn't receive it, check your spam folder.</p>
            <button className="btn btn-outline" onClick={handleResend}>Resend Email</button>
            <p className="auth-footer" style={{ marginTop: '1rem' }}>
              <Link to="/login">Back to Login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
