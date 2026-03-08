import React, { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';

export default function ContactPage() {
  const { siteConfig } = useSiteConfig();
  const brandName = siteConfig?.brandName || 'Our Store';
  const phone = siteConfig?.phone || '';
  const email = siteConfig?.email || '';
  const address = siteConfig?.address || '';
  const socialLinks = siteConfig?.socialLinks || {};

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const whatsappNum = phone.replace(/[^0-9]/g, '');
      const msg = `Name: ${form.name}%0AEmail: ${form.email}%0APhone: ${form.phone}%0ASubject: ${form.subject}%0AMessage: ${form.message}`;
      window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank');
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="contact-page">
      <style>{`
        .contact-hero {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 120px 0 80px; text-align: center;
          position: relative; overflow: hidden;
        }
        .contact-hero::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }
        .contact-hero-content { position: relative; z-index: 2; }
        .contact-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: 52px; color: #5E2900; margin-bottom: 20px;
          font-weight: 700; position: relative;
        }
        .contact-hero h1::after {
          content: ''; position: absolute; bottom: -15px; left: 50%;
          transform: translateX(-50%); width: 80px; height: 3px;
          background: linear-gradient(90deg, #d4af37, #b8941f); border-radius: 2px;
        }
        .contact-hero p {
          font-family: 'Poppins', sans-serif; max-width: 700px;
          margin: 30px auto 0; font-size: 18px; color: #8a8a8a; line-height: 1.7;
        }
        .contact-section { padding: 100px 0; background-color: #fff; }
        .contact-container {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
          max-width: 1200px; margin: 0 auto; padding: 0 20px;
        }
        .contact-info {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 60px 40px; border-radius: 12px; position: relative; overflow: hidden;
        }
        .contact-info::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #d4af37, #b8941f);
        }
        .contact-info h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #5E2900; margin-bottom: 30px;
        }
        .contact-info > p {
          font-family: 'Poppins', sans-serif; font-size: 16px;
          line-height: 1.7; color: #666; margin-bottom: 40px;
        }
        .contact-details { list-style: none; padding: 0; margin: 0; }
        .contact-details li {
          display: flex; align-items: center; margin-bottom: 25px;
          font-family: 'Poppins', sans-serif;
        }
        .contact-details i { font-size: 20px; color: #d4af37; width: 30px; margin-right: 20px; }
        .contact-details span, .contact-details a {
          font-size: 16px; color: #444; text-decoration: none; transition: color 0.3s ease;
        }
        .contact-details a:hover { color: #d4af37; }
        .social-links-section {
          margin-top: 40px; padding-top: 30px;
          border-top: 1px solid rgba(212, 175, 55, 0.2);
        }
        .social-links-section h3 {
          font-family: 'Playfair Display', serif; font-size: 24px;
          color: #5E2900; margin-bottom: 20px;
        }
        .social-icons-row { display: flex; gap: 15px; }
        .social-icons-row a {
          display: flex; align-items: center; justify-content: center;
          width: 45px; height: 45px; background-color: #d4af37;
          color: #fff; border-radius: 50%; text-decoration: none;
          transition: all 0.3s ease;
        }
        .social-icons-row a:hover { background-color: #b8941f; transform: translateY(-3px); }
        .form-container {
          background-color: #fff; border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          padding: 50px 40px; position: relative; overflow: hidden;
        }
        .form-container::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #d4af37, #b8941f);
        }
        .form-container h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #5E2900; margin-bottom: 30px; text-align: center;
        }
        .form-group { margin-bottom: 25px; }
        .form-group label {
          display: block; font-family: 'Poppins', sans-serif;
          font-size: 14px; font-weight: 500; color: #444;
          margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .form-group input, .form-group textarea, .form-group select {
          width: 100%; padding: 15px 20px; border: 2px solid #e8e8e8;
          border-radius: 8px; font-family: 'Poppins', sans-serif;
          font-size: 16px; color: #444; transition: all 0.3s ease;
          background-color: #fafafa; box-sizing: border-box;
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none; border-color: #d4af37; background-color: #fff;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        .form-group textarea { resize: vertical; min-height: 120px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .contact-submit-btn {
          width: 100%; padding: 18px 30px;
          background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
          color: #fff; border: none; border-radius: 8px;
          font-family: 'Poppins', sans-serif; font-size: 16px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          cursor: pointer; transition: all 0.3s ease; margin-top: 20px;
        }
        .contact-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); }
        .contact-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .contact-status-msg {
          padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;
          font-family: 'Poppins', sans-serif; font-weight: 500;
        }
        .contact-status-msg.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .contact-status-msg.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .working-hours {
          background-color: #5E2900; color: #fff; padding: 60px 0; text-align: center;
        }
        .working-hours h2 {
          font-family: 'Playfair Display', serif; font-size: 36px;
          color: #d4af37; margin-bottom: 30px;
        }
        .hours-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px; max-width: 800px; margin: 0 auto; padding: 0 20px;
        }
        .hours-item {
          background-color: rgba(255,255,255,0.1); padding: 30px 20px;
          border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3);
        }
        .hours-item h3 {
          font-family: 'Poppins', sans-serif; font-size: 18px;
          font-weight: 600; margin-bottom: 10px; color: #d4af37;
        }
        .hours-item p { font-family: 'Poppins', sans-serif; font-size: 16px; margin: 0; }
        @media (max-width: 991px) {
          .contact-container { grid-template-columns: 1fr; gap: 50px; }
          .form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 767px) {
          .contact-hero { padding: 80px 0 60px; }
          .contact-hero h1 { font-size: 36px; }
          .contact-info, .form-container { padding: 40px 30px; }
          .contact-info h2, .form-container h2 { font-size: 28px; }
        }
      `}</style>

      <section className="contact-hero">
        <div className="container">
          <div className="contact-hero-content">
            <h1>Contact Us</h1>
            <p>Reach out to us for any inquiries. We'd love to hear from you.</p>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <div className="contact-container">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>Have questions about our collections? We're here to help you discover what you're looking for.</p>
            <ul className="contact-details">
              {address && (
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li>
                  <i className="fas fa-phone"></i>
                  <a href={`tel:${phone}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <i className="fas fa-envelope"></i>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {phone && (
                <li>
                  <i className="fab fa-whatsapp"></i>
                  <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">{phone}</a>
                </li>
              )}
            </ul>
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.twitter || socialLinks.youtube) && (
              <div className="social-links-section">
                <h3>Follow Us</h3>
                <div className="social-icons-row">
                  {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>}
                  {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>}
                  {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>}
                  {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube"></i></a>}
                </div>
              </div>
            )}
          </div>

          <div className="form-container">
            <h2>Send Us a Message</h2>
            {status === 'success' && (
              <div className="contact-status-msg success">
                <i className="fas fa-check-circle"></i> Your message has been sent successfully!
              </div>
            )}
            {status === 'error' && (
              <div className="contact-status-msg error">
                <i className="fas fa-exclamation-circle"></i> Something went wrong. Please try again.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <input type="text" name="subject" value={form.subject} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea name="message" value={form.message} onChange={handleChange} required placeholder="How can we help you?" />
              </div>
              <button type="submit" className="contact-submit-btn" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="working-hours">
        <h2>Working Hours</h2>
        <div className="hours-grid">
          <div className="hours-item">
            <h3>Monday - Saturday</h3>
            <p>10:00 AM - 7:00 PM</p>
          </div>
          <div className="hours-item">
            <h3>Sunday</h3>
            <p>11:00 AM - 6:00 PM</p>
          </div>
        </div>
      </section>
    </div>
  );
}
