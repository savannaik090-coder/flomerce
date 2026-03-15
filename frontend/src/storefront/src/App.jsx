import React, { useContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSiteConfig } from './hooks/useSiteConfig.js';
import { PanelContext } from './context/PanelContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import MobileBottomNav from './components/layout/MobileBottomNav.jsx';
import SearchOverlay from './components/layout/SearchOverlay.jsx';
import CartPanel from './components/cart/CartPanel.jsx';
import WishlistPanel from './components/wishlist/WishlistPanel.jsx';
import WhatsAppButton from './components/ui/WhatsAppButton.jsx';
import './styles/variables.css';
import './styles/navbar.css';
import './styles/footer.css';
import './styles/cart-panel.css';
import './styles/search.css';
import './styles/whatsapp.css';
import './styles/currency.css';

const HomePage = React.lazy(() => import('./pages/HomePage.jsx'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage.jsx'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage.jsx'));
const CartPage = React.lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage.jsx'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.jsx'));
const LoginPage = React.lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = React.lazy(() => import('./pages/SignupPage.jsx'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage.jsx'));
const AboutPage = React.lazy(() => import('./pages/AboutPage.jsx'));
const ContactPage = React.lazy(() => import('./pages/ContactPage.jsx'));
const BookAppointmentPage = React.lazy(() => import('./pages/BookAppointmentPage.jsx'));
const OrderTrackPage = React.lazy(() => import('./pages/OrderTrackPage.jsx'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel.jsx'));
const ProductsAdminPage = React.lazy(() => import('./pages/ProductsAdminPage.jsx'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage.jsx'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage.jsx'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage.jsx'));
const TermsPage = React.lazy(() => import('./pages/TermsPage.jsx'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SiteLoadingScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #eee', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
        <p style={{ fontSize: 18, color: '#333' }}>Loading store...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SiteErrorScreen({ error }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 12, color: '#ef4444' }}>Store Not Found</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>{error || 'The store you are looking for could not be found.'}</p>
        <a href="https://fluxe.in" style={{ background: '#000', color: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>Go to Fluxe</a>
      </div>
    </div>
  );
}

export default function App() {
  const { siteConfig, loading, error } = useSiteConfig();
  const { cartOpen, openCart, closeCart, wishlistOpen, openWishlist, closeWishlist, searchOpen, openSearch, closeSearch } = useContext(PanelContext);
  const location = useLocation();

  if (loading) return <SiteLoadingScreen />;
  if (error) return <SiteErrorScreen error={error} />;

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/products" element={<ProductsAdminPage />} />
        </Routes>
      </React.Suspense>
    );
  }

  return (
    <>
      <Navbar
        onSearchOpen={openSearch}
        onCartOpen={openCart}
        onWishlistOpen={openWishlist}
      />

      <main>
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/book-appointment" element={<BookAppointmentPage />} />
            <Route path="/order-track" element={<OrderTrackPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </React.Suspense>
      </main>

      <Footer />
      <MobileBottomNav onCartOpen={openCart} />
      <WhatsAppButton />
      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
      <CartPanel isOpen={cartOpen} onClose={closeCart} />
      <WishlistPanel isOpen={wishlistOpen} onClose={closeWishlist} />
    </>
  );
}
