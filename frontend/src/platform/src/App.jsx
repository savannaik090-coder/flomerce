import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OwnerAdminPage from './pages/OwnerAdminPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import RefundPolicyPage from './pages/RefundPolicyPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ShippingPolicyPage from './pages/ShippingPolicyPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/:page" element={<DashboardPage />} />
      <Route path="/dashboard/:page/:siteId" element={<DashboardPage />} />
      <Route path="/admin" element={<OwnerAdminPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/refund-policy" element={<RefundPolicyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
    </Routes>
  );
}
