import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { translateApiError } from '../services/errorMessages.js';
import * as authService from '../services/authService.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

export default function ForgotPasswordPage() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useContext(SiteContext);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError(tx("Please enter your email address")); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.requestPasswordReset(email, siteConfig?.id);
      setSuccess(tx("Password reset link has been sent to your email. Please check your inbox and spam folder."));
    } catch (err) {
      setError(translateApiError(err, tx, tx("Failed to send reset email. Please try again.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh' }}>
      <section style={{ maxWidth: 500, margin: '40px auto 60px', backgroundColor: '#fff', padding: 40, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 10, color: '#333' }}><TranslatedText text="Forgot Password" /></h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#777' }}><TranslatedText text="Enter your email to receive a password reset link" /></p>
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #e74c3c', borderRadius: 6, backgroundColor: 'rgba(231,76,60,0.1)', fontWeight: 500 }}><TranslatedText text={error} /></div>}
        {success && <div style={{ color: '#2ecc71', fontSize: 15, margin: '15px 0', padding: 12, textAlign: 'center', border: '1px solid #2ecc71', backgroundColor: 'rgba(46,204,113,0.1)', borderRadius: 6, fontWeight: 500 }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#333', fontWeight: 600 }}><TranslatedText text="Email Address" /></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={tx("Enter your email")} required style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ backgroundColor: loading ? '#e0d5c5' : '#c8a97e', color: '#fff', border: 'none', padding: 15, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <TranslatedText text="Sending..." /> : <TranslatedText text="Send Reset Link" />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#777' }}>
          <TranslatedText text="Remember your password?" /> <Link to="/login" style={{ color: '#c8a97e', textDecoration: 'none' }}><TranslatedText text="Log in" /></Link>
        </div>
      </section>
    </div>
  );
}
