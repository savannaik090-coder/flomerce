import React, { useContext, useEffect } from 'react';
import { PLATFORM_URL } from './config.js';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSiteConfig } from './hooks/useSiteConfig.js';
import { PanelContext } from './context/PanelContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import usePageTracker from './hooks/usePageTracker.js';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import NavbarModern from './components/templates/modern/NavbarModern.jsx';
import FooterModern from './components/templates/modern/FooterModern.jsx';
import SchemeScope from './components/theme/SchemeScope.jsx';
import MobileBottomNav from './components/layout/MobileBottomNav.jsx';
import SearchOverlay from './components/layout/SearchOverlay.jsx';
import CartPanel from './components/cart/CartPanel.jsx';
import WishlistPanel from './components/wishlist/WishlistPanel.jsx';
import WhatsAppButton from './components/ui/WhatsAppButton.jsx';
import PageLoadingBar from './components/ui/PageLoadingBar.jsx';
import PushPrompt from './components/ui/PushPrompt.jsx';
import { ToastProvider } from '../../shared/ui/Toast.jsx';
import { ConfirmProvider } from '../../shared/ui/ConfirmDialog.jsx';
import usePushNotifications from './hooks/usePushNotifications.js';
import './styles/variables.css';
import './styles/navbar.css';
import './styles/footer.css';
import './styles/cart-panel.css';
import './styles/search.css';
import './styles/whatsapp.css';
import './styles/currency.css';
import TranslatedText from './components/TranslatedText';

const HomePage = React.lazy(() => import('./pages/HomePage.jsx'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage.jsx'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage.jsx'));
const CartPage = React.lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPageModern = React.lazy(() => import('./components/templates/modern/CheckoutPageModern.jsx'));
const CheckoutPageClassic = React.lazy(() => import('./components/templates/classic/CheckoutPageClassic.jsx'));
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
const ReturnPage = React.lazy(() => import('./pages/ReturnPage.jsx'));
const CancelPage = React.lazy(() => import('./pages/CancelPage.jsx'));
const OrderHelpPage = React.lazy(() => import('./pages/OrderHelpPage.jsx'));
const ReviewPage = React.lazy(() => import('./pages/ReviewPage.jsx'));
const ReviewPageModern = React.lazy(() => import('./components/templates/modern/ReviewPageModern.jsx'));
const FaqPage = React.lazy(() => import('./pages/FaqPage.jsx'));
const BlogListPage = React.lazy(() => import('./pages/BlogListPage.jsx'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage.jsx'));
const InvoicePage = React.lazy(() => import('./pages/InvoicePage.jsx'));
const OverageInvoicePage = React.lazy(() => import('./pages/OverageInvoicePage.jsx'));

function removePreloader() {
  const el = document.getElementById('flomerce-preloader');
  if (el) el.remove();
}

function PageLoading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <PageLoadingBar />
    </div>
  );
}

function SiteLoadingScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #eee', borderTop: '3px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
        <p style={{ fontSize: 18, color: '#333' }}><TranslatedText text="Loading store..." /></p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SiteErrorScreen({ error }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 12, color: '#ef4444' }}><TranslatedText text="Store Not Found" /></h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>{error ? <TranslatedText text={error} /> : <TranslatedText text="The store you are looking for could not be found." />}</p>
        <a href={PLATFORM_URL} style={{ background: '#000', color: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}><TranslatedText text="Go to Flomerce" /></a>
      </div>
    </div>
  );
}

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Admin panel error:', error, info);
  }
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
          <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>The admin panel encountered an error. This is usually temporary.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={this.handleRetry} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again
              </button>
              <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Phase 3: when the shopper picks a new language we need every in-flight
  // page to refetch its API data with the new ?lang= param. The simplest
  // robust mechanism is a hard reload — cart/wishlist live in localStorage,
  // so nothing meaningful is lost. A future phase can replace this with a
  // SPA-level cache invalidation if reload becomes a UX concern.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onLangChange = () => {
      try { window.location.reload(); } catch (e) {}
    };
    window.addEventListener('flomerce_lang_change', onLangChange);
    return () => window.removeEventListener('flomerce_lang_change', onLangChange);
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRoutes />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AppRoutes() {
  const { siteConfig, loading, error, subdomain } = useSiteConfig();
  const location = useLocation();

  useEffect(() => {
    if (!loading) removePreloader();
  }, [loading]);

  // Inject (or refresh) a translated PWA manifest link tag whenever the
  // resolved subdomain or active language changes. The backend serves a
  // per-site, per-lang manifest at /api/manifest. Browsers re-read the
  // manifest when href changes, so PWA install prompts pick up the
  // translated name/short_name/description.
  useEffect(() => {
    if (typeof document === 'undefined' || !subdomain) return;
    const lang = (() => {
      try { return localStorage.getItem('flomerce_lang') || ''; } catch { return ''; }
    })();
    const params = new URLSearchParams({ subdomain });
    if (lang) params.set('lang', lang);
    const href = `/api/manifest?${params.toString()}`;
    // Use a dedicated managed tag so we never overwrite (or fight with) any
    // pre-existing static `<link rel="manifest">` shipped in the HTML shell.
    let link = document.querySelector('link[rel="manifest"][data-flomerce-manifest="1"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.setAttribute('data-flomerce-manifest', '1');
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }, [subdomain, siteConfig]);

  if (loading) return <SiteLoadingScreen />;
  if (error) return <SiteErrorScreen error={error} />;

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isInvoiceRoute = location.pathname === '/invoice';
  const isOverageInvoiceRoute = location.pathname === '/billing/invoice';

  if (isAdminRoute) {
    return (
      <AdminErrorBoundary>
        <React.Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/products" element={<ProductsAdminPage />} />
          </Routes>
        </React.Suspense>
      </AdminErrorBoundary>
    );
  }

  if (isInvoiceRoute) {
    return (
      <React.Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/invoice" element={<InvoicePage />} />
        </Routes>
      </React.Suspense>
    );
  }

  if (isOverageInvoiceRoute) {
    return (
      <React.Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/billing/invoice" element={<OverageInvoicePage />} />
        </Routes>
      </React.Suspense>
    );
  }

  return <StorefrontShell />;
}

function StorefrontShell() {
  const { cartOpen, openCart, closeCart, wishlistOpen, openWishlist, closeWishlist, searchOpen, openSearch, closeSearch } = useContext(PanelContext);
  const { showPrompt, subscribe, dismissPrompt } = usePushNotifications();
  const theme = useTheme();

  usePageTracker();

  const isModern = theme.id === 'modern';
  const ActiveNavbar = isModern ? NavbarModern : Navbar;
  const ActiveFooter = isModern ? FooterModern : Footer;
  const ActiveCheckout = isModern ? CheckoutPageModern : CheckoutPageClassic;
  const ActiveReview = isModern ? ReviewPageModern : ReviewPage;

  return (
    <>
      <SchemeScope sectionId="navbar" as="div">
        <ActiveNavbar
          onSearchOpen={openSearch}
          onCartOpen={openCart}
          onWishlistOpen={openWishlist}
        />
      </SchemeScope>

      <main>
        <React.Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/product/:id" element={<SchemeScope sectionId="product-page"><ProductDetailPage /></SchemeScope>} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<SchemeScope sectionId="checkout"><ActiveCheckout /></SchemeScope>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/about" element={<SchemeScope sectionId="about-us"><AboutPage /></SchemeScope>} />
            <Route path="/contact" element={<SchemeScope sectionId="contact-us"><ContactPage /></SchemeScope>} />
            <Route path="/book-appointment" element={<SchemeScope sectionId="book-appointment"><BookAppointmentPage /></SchemeScope>} />
            <Route path="/order-track" element={<OrderTrackPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/privacy-policy" element={<SchemeScope sectionId="privacy"><PrivacyPolicyPage /></SchemeScope>} />
            <Route path="/terms" element={<SchemeScope sectionId="terms"><TermsPage /></SchemeScope>} />
            <Route path="/return" element={<ReturnPage />} />
            <Route path="/return/:orderId" element={<ReturnPage />} />
            <Route path="/cancel" element={<CancelPage />} />
            <Route path="/cancel/:orderId" element={<CancelPage />} />
            <Route path="/order-help" element={<OrderHelpPage />} />
            <Route path="/order-help/:orderId" element={<OrderHelpPage />} />
            <Route path="/review/:orderId" element={<ActiveReview />} />
            <Route path="/faq" element={<SchemeScope sectionId="faq"><FaqPage /></SchemeScope>} />
            <Route path="/blog" element={<SchemeScope sectionId="blog"><BlogListPage /></SchemeScope>} />
            <Route path="/blog/:slug" element={<SchemeScope sectionId="blog"><BlogPostPage /></SchemeScope>} />
          </Routes>
        </React.Suspense>
      </main>

      <SchemeScope sectionId="footer" as="div">
        <ActiveFooter />
      </SchemeScope>
      <MobileBottomNav onCartOpen={openCart} />
      <WhatsAppButton />
      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
      <CartPanel isOpen={cartOpen} onClose={closeCart} />
      <WishlistPanel isOpen={wishlistOpen} onClose={closeWishlist} />
      {showPrompt && <PushPrompt onAllow={subscribe} onDismiss={dismissPrompt} />}
    </>
  );
}
