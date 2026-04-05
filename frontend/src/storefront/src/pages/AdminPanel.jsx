import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import DashboardSection from '../components/admin/DashboardSection.jsx';
import ProductsSection from '../components/admin/ProductsSection.jsx';
import InventorySection from '../components/admin/InventorySection.jsx';
import OrdersSection from '../components/admin/OrdersSection.jsx';
import CustomersSection from '../components/admin/CustomersSection.jsx';
import AnalyticsSection from '../components/admin/AnalyticsSection.jsx';
import RevenueSection from '../components/admin/RevenueSection.jsx';
import PushNotificationsSection from '../components/admin/PushNotificationsSection.jsx';
import WebsiteContentSection from '../components/admin/WebsiteContentSection.jsx';
import SettingsSection from '../components/admin/SettingsSection.jsx';
import SEOSection from '../components/admin/SEOSection.jsx';
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
  const [permissions, setPermissions] = useState(() => {
    try {
      const stored = sessionStorage.getItem('site_admin_permissions');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [isOwner, setIsOwner] = useState(() => {
    return sessionStorage.getItem('site_admin_is_owner') === 'true';
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (isOwner) return 'dashboard';
    if (permissions && permissions.length > 0) return permissions[0];
    return 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);

  useEffect(() => {
    const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Store';
    document.title = `Admin Panel | ${brandName}`;
  }, [siteConfig]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam && siteConfig?.id && !verified) {
      handleAutoLogin(tokenParam);
    } else if (verified && siteConfig?.id && adminToken) {
      (async () => {
        try {
          const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
          const response = await fetch(`${API_BASE}/api/site-admin/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: adminToken, siteId: siteConfig.id }),
          });
          const result = await response.json();
          if (result.success) {
            const data = result.data || result;
            const newPerms = data.permissions || null;
            const newIsOwner = data.isOwner !== false;
            if (newPerms) {
              sessionStorage.setItem('site_admin_permissions', JSON.stringify(newPerms));
            } else {
              sessionStorage.removeItem('site_admin_permissions');
            }
            sessionStorage.setItem('site_admin_is_owner', String(newIsOwner));
            setPermissions(newPerms);
            setIsOwner(newIsOwner);
            if (!newIsOwner && newPerms) {
              setActiveSection(prev => {
                if (!newPerms.includes(prev)) return newPerms[0] || prev;
                return prev;
              });
            }
          } else {
            sessionStorage.removeItem('site_admin_token');
            sessionStorage.removeItem('site_admin_site_id');
            sessionStorage.removeItem('site_admin_permissions');
            sessionStorage.removeItem('site_admin_is_owner');
            setVerified(false);
            setAdminToken('');
            setPermissions(null);
            setIsOwner(false);
          }
        } catch (e) {
          console.warn('Permission refresh failed:', e);
        }
      })();
    }
  }, [siteConfig?.id]);

  function hasPermission(section) {
    if (isOwner) return true;
    if (!permissions) return false;
    return permissions.includes(section);
  }

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
        const data = result.data || result;
        sessionStorage.setItem('site_admin_token', token);
        sessionStorage.setItem('site_admin_site_id', siteConfig?.id);
        sessionStorage.setItem('site_admin_is_owner', String(data.isOwner !== false));
        if (data.permissions) {
          sessionStorage.setItem('site_admin_permissions', JSON.stringify(data.permissions));
          setPermissions(data.permissions);
        } else {
          sessionStorage.removeItem('site_admin_permissions');
          setPermissions(null);
        }
        setIsOwner(data.isOwner !== false);
        setAdminToken(token);
        setVerified(true);
        if (data.isOwner === false && data.permissions && data.permissions.length > 0) {
          setActiveSection(data.permissions[0]);
        }
        const url = new URL(window.location);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname);
      } else {
        setLoginError('Auto-login token is invalid or expired. Please log in.');
        const url = new URL(window.location);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname);
      }
    } catch (err) {
      setLoginError('Auto-login failed. Please log in.');
      const url = new URL(window.location);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname);
    } finally {
      setAutoLoginLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
      const response = await fetch(`${API_BASE}/api/site-admin/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteConfig?.id,
          subdomain: siteConfig?.subdomain,
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });
      const result = await response.json();
      if (result.success && (result.data?.token || result.token)) {
        const data = result.data || result;
        const token = data.token;
        sessionStorage.setItem('site_admin_token', token);
        sessionStorage.setItem('site_admin_site_id', siteConfig?.id);
        const perms = data.permissions || null;
        if (perms) {
          sessionStorage.setItem('site_admin_permissions', JSON.stringify(perms));
        } else {
          sessionStorage.removeItem('site_admin_permissions');
        }
        sessionStorage.setItem('site_admin_is_owner', 'false');
        setPermissions(perms);
        setIsOwner(false);
        setAdminToken(token);
        setVerified(true);
        if (perms && perms.length > 0) {
          setActiveSection(perms[0]);
        }
      } else {
        setLoginError(result.error || result.message || 'Invalid email or password');
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    const token = sessionStorage.getItem('site_admin_token');
    if (token) {
      try {
        const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';
        await fetch(`${API_BASE}/api/site-admin/staff-logout`, {
          method: 'POST',
          headers: { 'Authorization': `SiteAdmin ${token}` },
        });
      } catch (e) {
        console.warn('Server-side logout failed:', e);
      }
    }
    sessionStorage.removeItem('site_admin_token');
    sessionStorage.removeItem('site_admin_site_id');
    sessionStorage.removeItem('site_admin_permissions');
    sessionStorage.removeItem('site_admin_is_owner');
    setAdminToken('');
    setVerified(false);
    setPermissions(null);
    setIsOwner(false);
    setEmailInput('');
    setPasswordInput('');
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
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Staff Login</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Enter your email and password to access the admin panel.</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setLoginError(''); }}
              style={{ width: '100%', padding: '12px 16px', border: `1px solid ${loginError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setLoginError(''); }}
              style={{ width: '100%', padding: '12px 16px', border: `1px solid ${loginError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 8, fontSize: 15, marginBottom: 8, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
            />
            {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loginLoading ? 'not-allowed' : 'pointer', marginTop: 8, fontFamily: 'inherit' }}>
              {loginLoading ? 'Logging in...' : 'Log In'}
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
    revenue: 'Revenue',
    analytics: 'Analytics',
    website: 'Edit Website',
    seo: 'SEO',
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
        permissions={permissions}
        isOwner={isOwner}
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
        </header>

        <div className="admin-content">
          {activeSection === 'dashboard' && hasPermission('dashboard') && <DashboardSection />}
          {activeSection === 'products' && hasPermission('products') && (
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
          {activeSection === 'inventory' && hasPermission('inventory') && <InventorySection />}
          {activeSection === 'orders' && hasPermission('orders') && <OrdersSection />}
          {activeSection === 'customers' && hasPermission('customers') && <CustomersSection />}
          {activeSection === 'revenue' && (hasPermission('analytics') || hasPermission('orders')) && <RevenueSection />}
          {activeSection === 'analytics' && hasPermission('analytics') && <AnalyticsSection />}
          {activeSection === 'website' && hasPermission('website') && <WebsiteContentSection />}
          {activeSection === 'seo' && hasPermission('seo') && <SEOSection />}
          {activeSection === 'notifications' && hasPermission('notifications') && <PushNotificationsSection />}
          {activeSection === 'settings' && hasPermission('settings') && <SettingsSection />}
        </div>
      </div>
    </div>
  );
}
