import React, { useState, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { login as loginService } from '../services/authService.js';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import DashboardSection from '../components/admin/DashboardSection.jsx';
import ProductsSection from '../components/admin/ProductsSection.jsx';
import InventorySection from '../components/admin/InventorySection.jsx';
import OrdersSection from '../components/admin/OrdersSection.jsx';
import CustomersSection from '../components/admin/CustomersSection.jsx';
import AnalyticsSection from '../components/admin/AnalyticsSection.jsx';
import PushNotificationsSection from '../components/admin/PushNotificationsSection.jsx';
import WatchBuySection from '../components/admin/WatchBuySection.jsx';
import ProductForm from '../components/admin/ProductForm.jsx';
import '../styles/admin.css';

const VERIFY_CODE = 'admin2024';

export default function AdminPanel() {
  const { siteConfig } = useContext(SiteContext);
  const { user, isAuthenticated, login, logout, loading: authLoading } = useContext(AuthContext);
  const [verified, setVerified] = useState(() => sessionStorage.getItem('admin_verified') === 'true');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  function handleVerify(e) {
    e.preventDefault();
    if (codeInput === VERIFY_CODE || codeInput === (siteConfig?.settings?.adminCode)) {
      sessionStorage.setItem('admin_verified', 'true');
      setVerified(true);
    } else {
      setCodeError('Incorrect verification code. Please try again.');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginSubmitting(true);
    try {
      const result = await loginService(loginEmail, loginPassword);
      if (result.token) {
        login(result.user || result.data, result.token);
      } else {
        setLoginError(result.error || 'Login failed');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginSubmitting(false);
    }
  }

  if (!verified) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-lock" style={{ color: '#2563eb', fontSize: 22 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Admin Panel</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Enter your verification code to access the admin panel.</p>
          </div>
          <form onSubmit={handleVerify}>
            <input
              type="password"
              placeholder="Verification code"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(''); }}
              style={{ width: '100%', padding: '12px 16px', border: `1px solid ${codeError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 15, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }}
              autoFocus
            />
            {codeError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{codeError}</p>}
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-user-shield" style={{ color: '#2563eb', fontSize: 22 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sign In Required</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Log in with the account you used to create this site on Fluxe.</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              required
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
            <button type="submit" disabled={loginSubmitting} style={{ width: '100%', padding: '12px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {loginSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function handleSectionChange(section) {
    setActiveSection(section);
    setAddingProduct(false);
    setEditingProduct(null);
  }

  const showProductForm = addingProduct || editingProduct;

  return (
    <div className="admin-layout">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        brandName={siteConfig?.brand_name || siteConfig?.brandName}
      />

      <div className="admin-main">
        <header className="admin-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars" />
          </button>
          <div className="admin-header-title">
            <h1>{
              activeSection === 'dashboard' ? 'Dashboard' :
              activeSection === 'products' ? (showProductForm ? (editingProduct ? 'Edit Product' : 'Add Product') : 'Products') :
              activeSection === 'inventory' ? 'Inventory' :
              activeSection === 'orders' ? 'Orders' :
              activeSection === 'customers' ? 'Customers' :
              activeSection === 'analytics' ? 'Analytics' :
              activeSection === 'notifications' ? 'Push Notifications' :
              activeSection === 'watchbuy' ? 'Watch & Buy' : 'Admin'
            }</h1>
            <span className="admin-brand">{siteConfig?.brand_name || siteConfig?.brandName || 'Store'}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{user?.email}</span>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => { sessionStorage.removeItem('admin_verified'); logout(); setVerified(false); }}
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: 6 }} />Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          {activeSection === 'dashboard' && <DashboardSection />}
          {activeSection === 'products' && (
            showProductForm ? (
              <ProductForm
                product={editingProduct}
                onSave={() => { setAddingProduct(false); setEditingProduct(null); }}
                onCancel={() => { setAddingProduct(false); setEditingProduct(null); }}
              />
            ) : (
              <ProductsSection
                onAddProduct={() => setAddingProduct(true)}
                onEditProduct={p => setEditingProduct(p)}
              />
            )
          )}
          {activeSection === 'inventory' && <InventorySection />}
          {activeSection === 'orders' && <OrdersSection />}
          {activeSection === 'customers' && <CustomersSection />}
          {activeSection === 'analytics' && <AnalyticsSection />}
          {activeSection === 'notifications' && <PushNotificationsSection />}
          {activeSection === 'watchbuy' && <WatchBuySection />}
        </div>
      </div>
    </div>
  );
}
