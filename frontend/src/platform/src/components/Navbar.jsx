import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ showMenu = false }) {
  const { isAuthenticated, logout } = useAuth();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="nav">
      <Link to="/" className="logo">
        <img src="/assets/images/fluxe-logo.png" alt="Fluxe" className="logo-img" />
      </Link>
      <div className="nav-links">
        {showMenu && !isAuthenticated && (
          <>
            <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#pricing" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>Pricing</a>
            <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Contact</a>
          </>
        )}
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <button onClick={logout} className="btn btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
