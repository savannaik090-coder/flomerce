import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

export default function LandingPage() {
  const [showPwa, setShowPwa] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setTimeout(() => setShowPwa(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    setShowPwa(false);
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
  };

  return (
    <>
      <div className="container">
        <Navbar />
        <section className="hero">
          <span className="hero-tag">Coming Soon</span>
          <h1>Launch Your Website<br />in minutes.</h1>
          <p>A fully automated website platform that builds, manages, and scales websites without manual work.</p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">Start Building</Link>
            <a href="#learn-more" className="btn btn-outline">View Demo</a>
          </div>
        </section>
      </div>

      <div className={`pwa-install-bar${showPwa ? ' show' : ''}`}>
        <div className="pwa-info">
          <img src="/assets/images/logo.webp" alt="Logo" className="pwa-logo" />
          <div className="pwa-text">
            <h4>Install Fluxe</h4>
            <p>Add to home screen for better experience</p>
          </div>
        </div>
        <div className="pwa-actions">
          <button className="btn-install" onClick={handleInstall}>Install</button>
          <button className="btn-close-pwa" onClick={() => setShowPwa(false)}>&times;</button>
        </div>
      </div>
    </>
  );
}
