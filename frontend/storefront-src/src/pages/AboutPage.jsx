import React from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig.js';

export default function AboutPage() {
  const { siteConfig } = useSiteConfig();
  const brandName = siteConfig?.brandName || 'Our Store';

  return (
    <div className="about-page">
      <style>{`
        .about-hero {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 120px 0 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .about-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }
        .about-hero-content { position: relative; z-index: 2; }
        .about-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: 52px; color: #5E2900;
          margin-bottom: 20px; font-weight: 700; position: relative;
        }
        .about-hero h1::after {
          content: ''; position: absolute;
          bottom: -15px; left: 50%; transform: translateX(-50%);
          width: 80px; height: 3px;
          background: linear-gradient(90deg, #d4af37, #b8941f);
          border-radius: 2px;
        }
        .about-hero p {
          font-family: 'Poppins', sans-serif;
          max-width: 800px; margin: 30px auto 0;
          font-size: 20px; color: #8a8a8a;
          line-height: 1.7; font-style: italic;
        }
        .founder-section {
          padding: 100px 0; background-color: #fff; position: relative;
        }
        .founder-section::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; background: linear-gradient(90deg, transparent, #d4af37, transparent);
        }
        .founder-container {
          display: flex; align-items: center; gap: 80px;
          max-width: 1200px; margin: 0 auto; padding: 0 20px;
        }
        .founder-image { flex: 1; position: relative; }
        .founder-image::before {
          content: ''; position: absolute;
          top: -20px; left: -20px; right: 20px; bottom: 20px;
          background: linear-gradient(135deg, #d4af37, #b8941f);
          border-radius: 8px; z-index: 1;
        }
        .founder-image img {
          width: 100%; max-width: 450px; border-radius: 8px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          position: relative; z-index: 2;
        }
        .founder-content { flex: 1; }
        .founder-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 42px; margin-bottom: 10px; color: #5E2900;
        }
        .founder-content .title {
          font-family: 'Poppins', sans-serif;
          font-size: 18px; font-weight: 500; color: #d4af37;
          margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;
        }
        .founder-content p {
          font-family: 'Poppins', sans-serif;
          font-size: 16px; line-height: 1.8; color: #444; margin-bottom: 20px;
        }
        .values-section {
          background: linear-gradient(135deg, #f9f5f0 0%, #ede5d8 100%);
          padding: 100px 0; position: relative;
        }
        .values-heading { text-align: center; margin-bottom: 80px; }
        .values-heading h2 {
          font-family: 'Playfair Display', serif;
          font-size: 42px; color: #5E2900; margin-bottom: 20px; position: relative;
        }
        .values-heading h2::after {
          content: ''; position: absolute;
          bottom: -10px; left: 50%; transform: translateX(-50%);
          width: 60px; height: 3px;
          background: linear-gradient(90deg, #d4af37, #b8941f);
          border-radius: 2px;
        }
        .values-heading p {
          font-family: 'Poppins', sans-serif;
          max-width: 700px; margin: 20px auto 0; color: #8a8a8a;
          font-size: 18px; line-height: 1.6;
        }
        .values-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 40px; max-width: 1200px; margin: 0 auto; padding: 0 20px;
        }
        .value-card {
          background-color: #fff; padding: 50px 40px; border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.08); text-align: center;
          transition: all 0.4s ease; position: relative; overflow: hidden;
        }
        .value-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 4px; background: linear-gradient(90deg, #d4af37, #b8941f);
          transform: translateX(-100%); transition: transform 0.4s ease;
        }
        .value-card:hover::before { transform: translateX(0); }
        .value-card:hover { transform: translateY(-15px); box-shadow: 0 25px 50px rgba(0,0,0,0.15); }
        .value-icon {
          font-size: 48px; color: #d4af37; margin-bottom: 25px; transition: all 0.3s ease;
        }
        .value-card:hover .value-icon { transform: scale(1.1); }
        .value-card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 28px; margin-bottom: 20px; color: #5E2900;
        }
        .value-card p {
          font-family: 'Poppins', sans-serif;
          font-size: 15px; line-height: 1.7; color: #666;
        }
        .mission-section {
          padding: 100px 0; background-color: #5E2900; color: #fff;
          text-align: center; position: relative;
        }
        .mission-section::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4af37' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20v20h20z'/%3E%3C/g%3E%3C/svg%3E");
        }
        .mission-content {
          max-width: 800px; margin: 0 auto; padding: 0 20px;
          position: relative; z-index: 2;
        }
        .mission-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 42px; margin-bottom: 30px; color: #d4af37;
        }
        .mission-content p {
          font-family: 'Poppins', sans-serif;
          font-size: 18px; line-height: 1.8; margin-bottom: 25px;
        }
        @media (max-width: 991px) {
          .founder-container { flex-direction: column; gap: 50px; }
          .founder-image, .founder-content { width: 100%; }
          .values-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 767px) {
          .about-hero { padding: 80px 0 60px; }
          .about-hero h1 { font-size: 36px; }
          .founder-content h2 { font-size: 32px; }
          .values-heading h2 { font-size: 32px; }
          .mission-content h2 { font-size: 32px; }
        }
      `}</style>

      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1>About {brandName}</h1>
            <p>Discover our story, heritage, and the passion behind everything we create</p>
          </div>
        </div>
      </section>

      <section className="founder-section">
        <div className="founder-container">
          <div className="founder-image">
            {siteConfig?.logoUrl ? (
              <img src={siteConfig.logoUrl} alt={brandName} />
            ) : (
              <div style={{
                width: '100%', maxWidth: 450, height: 400, borderRadius: 8,
                background: 'linear-gradient(135deg, #f9f5f0, #ede5d8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
                fontSize: 64, color: '#d4af37',
              }}>
                <i className="fas fa-store"></i>
              </div>
            )}
          </div>
          <div className="founder-content">
            <h2>{brandName}</h2>
            <div className="title">Heritage & Excellence</div>
            <p>
              Welcome to {brandName}. We are dedicated to bringing you the finest products with
              unmatched quality and craftsmanship that speaks for itself.
            </p>
            <p>
              Our commitment to authentic craftsmanship and traditional artistry has made us
              one of the most trusted names in our industry. Every piece in our collection reflects
              expertise, artistic brilliance, and timeless beauty.
            </p>
            <p>
              We believe in creating experiences, not just products. Each item is carefully curated
              and crafted to perfection for discerning customers worldwide.
            </p>
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="container">
          <div className="values-heading">
            <h2>What We Offer</h2>
            <p>Our commitment to excellence drives everything we do, from sourcing to delivery</p>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-certificate"></i>
              </div>
              <h3>Authentic & Pure</h3>
              <p>Every product is crafted with original materials and artistry. We guarantee authenticity and purity, ensuring that traditional craftsmanship is preserved and honored.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-globe-americas"></i>
              </div>
              <h3>Worldwide Shipping</h3>
              <p>We deliver happiness across borders with a smooth and timely shopping experience. Our global reach ensures that elegance reaches customers worldwide.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-gem"></i>
              </div>
              <h3>Exclusive Designs</h3>
              <p>Unique collections that bring luxury and tradition together. Each design is carefully curated to offer something special - pieces that you won't find anywhere else.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-section">
        <div className="mission-content">
          <h2>Our Mission</h2>
          <p>
            {brandName} is more than just a brand – it is a commitment to excellence,
            quality, and customer satisfaction that drives everything we do.
          </p>
          <p>
            We aim to preserve and promote the finest traditions of craftsmanship,
            creating masterpieces that blend timeless elegance with contemporary appeal.
          </p>
          <p>
            Our commitment extends beyond creating beautiful products – we are dedicated to
            supporting artisans, preserving techniques, and ensuring that this heritage
            continues to shine for generations to come.
          </p>
        </div>
      </section>
    </div>
  );
}
