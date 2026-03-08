import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import * as authService from '../services/authService.js';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email') || '';

    if (!token) {
      setStatus('error');
      setError('Invalid verification link. Missing verification token.');
      return;
    }

    verifyEmail(token, email);
  }, [searchParams]);

  async function verifyEmail(token, email) {
    try {
      await authService.verifyEmail(token, email);
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Verification failed. The link may have expired.');
    }
  }

  return (
    <div style={{ minHeight: '80vh' }}>
      <section style={{ maxWidth: 500, margin: '160px auto 60px', backgroundColor: '#fff', padding: 40, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto' }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#333', marginBottom: 10 }}>Verifying Email...</h2>
            <p style={{ color: '#777' }}>Please wait while we verify your email address.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, color: '#28a745', marginBottom: 20 }}>✓</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#333', marginBottom: 10 }}>Email Verified!</h2>
            <p style={{ color: '#666', marginBottom: 20 }}>Your email has been verified successfully. You will be redirected to the login page.</p>
            <Link to="/login" style={{ display: 'inline-block', backgroundColor: '#c8a97e', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 'bold' }}>Go to Login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, color: '#dc3545', marginBottom: 20 }}>✗</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#333', marginBottom: 10 }}>Verification Failed</h2>
            <p style={{ color: '#666', marginBottom: 20 }}>{error}</p>
            <Link to="/login" style={{ display: 'inline-block', backgroundColor: '#c8a97e', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 'bold' }}>Go to Login</Link>
          </>
        )}
      </section>
    </div>
  );
}
