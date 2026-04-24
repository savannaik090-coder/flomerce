import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState("Please wait while we verify your email.");

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token) {
      setStatus('error');
      setMessage("Verification token is missing.");
      return;
    }

    verifyEmail(token, email || '')
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage("Your email has been successfully verified. You can now log in.");
        } else {
          setStatus('error');
          setMessage(res.error || "The link may be expired or invalid.");
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || "Verification failed. The link may be expired or invalid.");
      });
  }, [searchParams, t]);

  const titles = {
    verifying: "Verifying...",
    success: "Email Verified!",
    error: "Verification Failed",
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2>{titles[status]}</h2>
        <p>{message}</p>
        {status === 'success' && (
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        )}
        {status === 'error' && (
          <Link to="/login" className="btn btn-outline" style={{ marginTop: '1rem' }}>Back to Login</Link>
        )}
      </div>
    </div>
  );
}
