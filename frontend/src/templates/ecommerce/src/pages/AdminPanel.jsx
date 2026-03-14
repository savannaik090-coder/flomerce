import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import DashboardSection from '../components/admin/DashboardSection.jsx';
import ProductsSection from '../components/admin/ProductsSection.jsx';
import InventorySection from '../components/admin/InventorySection.jsx';
import OrdersSection from '../components/admin/OrdersSection.jsx';
import CustomersSection from '../components/admin/CustomersSection.jsx';
import AnalyticsSection from '../components/admin/AnalyticsSection.jsx';
import PushNotificationsSection from '../components/admin/PushNotificationsSection.jsx';
import WebsiteContentSection from '../components/admin/WebsiteContentSection.jsx';
import SettingsSection from '../components/admin/SettingsSection.jsx';
import ProductForm from '../components/admin/ProductForm.jsx';
import { apiRequest } from '../services/api.js';
import '../styles/admin.css';

export default function AdminPanel() {
  const { siteConfig } = useContext(SiteContext);
  const [verified, setVerified] = useState(() => {
    const token = sessionStorage.getItem('site_admin_token');
    const siteId = sessionStorage.getItem('site_admin_site_id');
    return !!token && siteId === siteConfig?.id;
  });
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('site_admin_token') || '');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam && siteConfig?.id && !verified) {
      handleAutoLogin(tokenParam);
    }
  }, [siteConfig?.id]);

  async function handleAutoLogin(token) {
    setAutoLoginLoading(true);
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${API_BASE}/api/site-admin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, siteId: siteConfig?.id }),
      });
      const result = await response.json();
      if (result.success) {
        sessionStorage.setItem('site_admin_token', token);
        sessionStorage.setItem('site_admin_site_id', siteConfig?.id);
        setAdminToken(token);
        setVerified(true);
        const url = new URL(window.location);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname);
      } else {
        setCodeError('Auto-login token is invalid or expired. Please enter your verification code.');
        const url = new URL(window.location);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname);
      }
    } catch (err) {
      setCodeError('Auto-login failed. Please enter your verification code.');
      const url = new URL(window.location);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname);
    } finally {
      setAutoLoginLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setCodeError('');
    setCodeLoading(true);
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${API_BASE}/api/site-admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteConfig?.id,
          subdomain: siteConfig?.subdomain,
          verificationCode: codeInput,
        }),
      });
      const result = await response.json();
      if (result.success && result.data?.token) {
        sessionStorage.setItem('site_admin_token', result.data.token);
        sessionStorage.setItem('site_admin_site_id', siteConfig?.id);
        setAdminToken(result.data.token);
        setVerified(true);
      } else {
        setCodeError(result.error || 'Invalid verification code');
      }
    } catch (err) {
      setCodeError('Verification failed. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('site_admin_token');
    sessionStorage.removeItem('site_admin_site_id');
    setAdminToken('');
    setVerified(false);
    setCodeInput('');
  }

  if (autoLoginLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>Authenticating...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, width: '100%', maxWidth: 400, border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-lock" style={{ color: '#2563eb', fontSize: 22 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Admin Panel</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Enter your verification code to access the admin panel.</p>
          </div>
          <form onSubmit={handleVerify}>
            <input
              type="password"
              placeholder="Verification code"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(''); }}
              style={{ width: '100%', padding: '12px 16px', border: `1px solid ${codeError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 15, marginBottom: 8, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              autoFocus
            />
            {codeError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{codeError}</p>}
            <button type="submit" disabled={codeLoading} style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: codeLoading ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
              {codeLoading ? 'Verifying...' : 'Access Admin Panel'}
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

  const sectionTitles = {
    dashboard: 'Dashboard',
    products: showProductForm ? (editingProduct ? 'Edit Product' : 'Add Product') : 'Products',
    inventory: 'Inventory',
    orders: 'Orders',
    customers: 'Customers',
    analytics: 'Analytics',
    website: 'Edit Website',
    notifications: 'Push Notifications',
    settings: 'Settings',
  };

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
            <h1>{sectionTitles[activeSection] || 'Admin'}</h1>
            <span className="admin-brand">{siteConfig?.brand_name || siteConfig?.brandName || 'Store'}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt" />Logout
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
          {activeSection === 'website' && <WebsiteContentSection />}
          {activeSection === 'notifications' && <PushNotificationsSection />}
          {activeSection === 'settings' && <SettingsSection />}
        </div>
      </div>
    </div>
  );
}
