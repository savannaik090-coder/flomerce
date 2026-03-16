import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSites, deleteSite } from '../services/siteService.js';
import { getUserProfile } from '../services/paymentService.js';
import SiteCard from '../components/SiteCard.jsx';
import SiteCreationWizard from '../components/SiteCreationWizard.jsx';
import PlanSelector from '../components/PlanSelector.jsx';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import '../styles/dashboard.css';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [managedSite, setManagedSite] = useState(null);
  const [managedAdminUrl, setManagedAdminUrl] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [billingSiteId, setBillingSiteId] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showTrialOverlay, setShowTrialOverlay] = useState(false);
  const [siteUsage, setSiteUsage] = useState({});

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const result = await getUserSites();
      setSites(result.data || result.sites || []);
    } catch (e) {
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const result = await getUserProfile();
      const data = result.user || result.data || result;
      setProfileData(data);
      setUser(prev => ({ ...prev, ...data }));
    } catch (e) {}
  }, [setUser]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([loadSites(), loadProfile()]).then(() => {
        setDataLoaded(true);
      });
    }
  }, [isAuthenticated, loadSites, loadProfile]);

  const handleDeleteSite = async (siteId) => {
    try {
      const result = await deleteSite(siteId);
      if (result.success) {
        await loadSites();
      } else {
        alert('Failed to delete site: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to delete site: ' + e.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleManageSite = async (site) => {
    setActivePage('admin');
    setManagedSite(site);
    setAdminLoading(true);
    setManagedAdminUrl(null);
    try {
      const siteUrl = `https://${site.subdomain}.fluxe.in`;
      const result = await apiRequest('/api/site-admin/auto-login', {
        method: 'POST',
        body: JSON.stringify({ siteId: site.id }),
      });
      const token = result.token || result.data?.token;
      const adminUrl = token
        ? `${siteUrl}/admin?token=${encodeURIComponent(token)}`
        : `${siteUrl}/admin`;
      setManagedAdminUrl(adminUrl);
    } catch (e) {
      const siteUrl = `https://${site.subdomain}.fluxe.in`;
      setManagedAdminUrl(`${siteUrl}/admin`);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadSiteUsage = useCallback(async (siteId) => {
    try {
      const result = await apiRequest(`/api/usage?siteId=${siteId}`);
      const data = result.data || result;
      setSiteUsage(prev => ({ ...prev, [siteId]: data }));
    } catch (e) {
      console.error('Failed to load usage for site', siteId, e);
    }
  }, []);

  const toggleOverage = useCallback(async (siteId, enabled) => {
    try {
      await apiRequest(`/api/usage?siteId=${siteId}`, {
        method: 'POST',
        body: JSON.stringify({ overageEnabled: enabled }),
      });
      await loadSiteUsage(siteId);
    } catch (e) {
      console.error('Failed to toggle overage for site', siteId, e);
      alert('Failed to update overage setting. Please try again.');
    }
  }, [loadSiteUsage]);

  const handleBillingSite = (siteId) => {
    setBillingSiteId(siteId);
    setActivePage('billing');
    loadSiteUsage(siteId);
  };

  const handleSiteCreated = () => {
    loadSites();
    loadProfile();
  };

  const handleTrialStarted = () => {
    setShowTrialOverlay(false);
    loadProfile();
    loadSites();
  };

  const handleCreateSiteClick = () => {
    const accountStatus = getAccountSubscriptionStatus();
    if (accountStatus.isTrialActive) {
      setShowWizard(true);
    } else if (!accountStatus.hadSubscription) {
      setShowTrialOverlay(true);
    } else {
      setShowWizard(true);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const getAccountSubscriptionStatus = () => {
    const plan = profileData?.plan || null;
    const status = profileData?.status || 'none';
    const hadSubscription = profileData?.hadSubscription || false;
    const trialEndDate = profileData?.trialEndDate || null;
    const isTrialActive = plan === 'trial' && status === 'active';
    const isTrialExpired = hadSubscription && (status === 'expired' || status === 'none');
    const isPaidActive = plan && plan !== 'trial' && status === 'active';
    return { plan, status, hadSubscription, trialEndDate, isTrialActive, isTrialExpired, isPaidActive };
  };

  const getSiteSubscriptionInfo = (site) => {
    const sub = site.subscription || {};
    const plan = sub.plan || site.subscription_plan || null;
    const rawStatus = sub.status || 'none';
    const periodEnd = sub.periodEnd || site.subscription_expires_at || null;

    const accountStatus = getAccountSubscriptionStatus();
    if (accountStatus.isTrialActive) {
      return { plan: 'trial', status: 'active', periodEnd: accountStatus.trialEndDate, isActive: true, isExpired: false };
    }

    if (plan && rawStatus === 'active' && periodEnd && new Date(periodEnd) > new Date()) {
      return { plan, status: 'active', periodEnd, isActive: true, isExpired: false };
    }

    const isExpired = rawStatus === 'expired' || rawStatus === 'cancelled' || rawStatus === 'paused' || (rawStatus === 'active' && periodEnd && new Date(periodEnd) < new Date());
    const isActive = rawStatus === 'active' && !isExpired;
    const displayStatus = isExpired ? 'expired' : rawStatus;
    return { plan, status: displayStatus, periodEnd, isActive, isExpired };
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderUsageBars = (siteId) => {
    const usage = siteUsage[siteId];
    if (!usage) return null;

    const d1Pct = Math.min(100, usage.d1?.percentage || 0);
    const r2Pct = Math.min(100, usage.r2?.percentage || 0);
    const d1Color = d1Pct > 90 ? '#ef4444' : d1Pct > 70 ? '#f59e0b' : '#10b981';
    const r2Color = r2Pct > 90 ? '#ef4444' : r2Pct > 70 ? '#f59e0b' : '#10b981';

    return (
      <div className="site-card" style={{ display: 'block', marginTop: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          Storage Usage
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Database (D1)</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatBytes(usage.d1?.used || 0)} / {formatBytes(usage.d1?.limit || 0)}</span>
          </div>
          <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${d1Pct}%`, background: d1Color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{d1Pct.toFixed(1)}% used</p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Media Storage (R2)</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatBytes(usage.r2?.used || 0)} / {formatBytes(usage.r2?.limit || 0)}</span>
          </div>
          <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r2Pct}%`, background: r2Color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{r2Pct.toFixed(1)}% used</p>
        </div>

        {usage.allowOverage && (
          <div style={{ padding: '0.75rem', background: usage.overageEnabled ? '#f0fdf4' : '#f8fafc', borderRadius: '0.5rem', border: `1px solid ${usage.overageEnabled ? '#86efac' : '#e2e8f0'}`, marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: usage.overageEnabled ? '#166534' : '#334155' }}>
                  Allow Overage Charges
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                  {usage.overageEnabled
                    ? 'Your site will continue working beyond plan limits. You will be billed for extra usage.'
                    : 'Your site will be disabled if storage limits are exceeded. Enable to allow extra usage with billing.'}
                </p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={usage.overageEnabled || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (window.confirm('Enable overage charges? You will be billed at \u20B90.75/GB for database and \u20B90.015/GB for media storage beyond your plan limits.')) {
                        toggleOverage(siteId, true);
                      } else {
                        e.target.checked = false;
                      }
                    } else {
                      toggleOverage(siteId, false);
                    }
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  background: usage.overageEnabled ? '#10b981' : '#cbd5e1',
                  borderRadius: '12px', transition: 'background 0.3s',
                }} />
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px',
                  left: usage.overageEnabled ? '23px' : '3px', bottom: '3px',
                  background: 'white', borderRadius: '50%', transition: 'left 0.3s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </label>
            </div>
            {usage.overageEnabled && (
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.5rem 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                Rates: {'\u20B9'}0.75/GB (Database) &middot; {'\u20B9'}0.015/GB (Media)
              </p>
            )}
          </div>
        )}

        {usage.allowOverage && usage.overageEnabled && usage.overageCostINR > 0 && (
          <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fbbf24', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>Overage Charges</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0 }}>
              You have exceeded your plan limits. Current overage: <strong>{'\u20B9'}{usage.overageCostINR.toFixed(2)}</strong>
            </p>
          </div>
        )}

        {usage.allowOverage && !usage.overageEnabled && (d1Pct >= 100 || r2Pct >= 100) && (
          <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991b1b' }}>Site Disabled — Storage Limit Reached</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: 0 }}>
              Your site has been blocked because storage limits are exceeded. Enable overage charges above or upgrade your plan to restore access.
            </p>
          </div>
        )}

        {usage.allowOverage && !usage.overageEnabled && (d1Pct >= 90 && d1Pct < 100 || r2Pct >= 90 && r2Pct < 100) && d1Pct < 100 && r2Pct < 100 && (
          <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fbbf24' }}>
            <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, fontWeight: 600 }}>
              Approaching storage limit. Enable overage charges or upgrade your plan to avoid disruption.
            </p>
          </div>
        )}

        {!usage.allowOverage && (d1Pct >= 90 || r2Pct >= 90) && (
          <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
            <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: 0, fontWeight: 600 }}>
              You are approaching your storage limit. Upgrade your plan for more storage.
            </p>
          </div>
        )}
      </div>
    );
  };

  const accountStatus = getAccountSubscriptionStatus();

  const renderTrialBanner = () => {
    if (!dataLoaded) return null;
    if (accountStatus.isTrialActive && accountStatus.trialEndDate) {
      const daysLeft = Math.max(0, Math.ceil((new Date(accountStatus.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)));
      return (
        <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem', borderColor: '#10b981', borderWidth: '2px', background: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#166534', margin: 0 }}>
                Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
              </p>
              <p style={{ fontSize: '0.875rem', color: '#15803d', margin: '0.25rem 0 0 0' }}>
                Create unlimited websites during your trial. Ends {new Date(accountStatus.trialEndDate).toLocaleDateString()}.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setActivePage('billing')} style={{ whiteSpace: 'nowrap', background: '#10b981', borderColor: '#10b981' }}>
              Upgrade Now
            </button>
          </div>
        </div>
      );
    }

    if (accountStatus.isTrialExpired && sites.length > 0) {
      return (
        <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem', borderColor: '#ef4444', borderWidth: '2px', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#dc2626', margin: 0 }}>
                Your trial has expired
              </p>
              <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: '0.25rem 0 0 0' }}>
                Your websites are currently disabled. Subscribe to a plan for each site to restore access.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setActivePage('billing')} style={{ whiteSpace: 'nowrap' }}>
              Subscribe Now
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderAdminContent = () => {
    if (managedSite && managedAdminUrl) {
      const siteInfo = getSiteSubscriptionInfo(managedSite);
      return (
        <div className="manage-content">
          <div className="manage-header">
            <button className="btn btn-outline" onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('dashboard'); }} style={{ gap: '0.375rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back
            </button>
            <span className="manage-site-name" style={{ marginLeft: 'auto' }}>{managedSite.brand_name || managedSite.brandName || managedSite.subdomain}</span>
            {siteInfo.plan && (
              <span className={`plan-status-pill ${siteInfo.isActive ? 'status-active' : 'status-expired'}`} style={{ marginLeft: '0.5rem' }}>
                {siteInfo.plan === 'trial' ? 'Trial' : siteInfo.plan} - {siteInfo.isActive ? 'Active' : 'Expired'}
              </span>
            )}
          </div>
          {siteInfo.isExpired ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <h2 style={{ margin: 0, color: '#dc2626' }}>Subscription Expired</h2>
              <p style={{ color: '#64748b', textAlign: 'center', maxWidth: '400px' }}>This site's subscription has expired and its admin panel is disabled. Please subscribe to a plan to restore access.</p>
              <button className="btn btn-primary" onClick={() => handleBillingSite(managedSite.id)}>Subscribe Now</button>
            </div>
          ) : (
            <iframe
              src={managedAdminUrl}
              className="manage-iframe"
              title={`Admin - ${managedSite.brand_name || managedSite.subdomain}`}
              allow="clipboard-write"
            />
          )}
        </div>
      );
    }

    if (adminLoading) {
      return (
        <main className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading admin panel...</p>
          </div>
        </main>
      );
    }

    if (sitesLoading) {
      return (
        <main className="main-content">
          <div className="header"><h1>Admin Panel</h1></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading sites...</p>
        </main>
      );
    }

    if (sites.length === 0) {
      return (
        <main className="main-content">
          <div className="header"><h1>Admin Panel</h1></div>
          <div className="empty-state">
            <p>You don't have any websites yet. Create one first.</p>
            <button className="btn btn-primary" onClick={() => { setActivePage('dashboard'); setShowWizard(true); }}>Create a Website</button>
          </div>
        </main>
      );
    }

    if (sites.length === 1) {
      const site = sites[0];
      if (!managedSite) {
        handleManageSite(site);
      }
      return (
        <main className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading admin panel...</p>
          </div>
        </main>
      );
    }

    return (
      <main className="main-content">
        <div className="header"><h1>Select a Site to Manage</h1></div>
        <div className="sites-grid">
          {sites.map(site => {
            const subInfo = getSiteSubscriptionInfo(site);
            return (
              <div key={site.id} className="site-card" style={{ cursor: 'pointer' }} onClick={() => handleManageSite(site)}>
                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.125rem', fontWeight: 700 }}>{site.brand_name || site.subdomain}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>https://{site.subdomain}.fluxe.in</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`plan-status-pill ${subInfo.isActive ? 'status-active' : 'status-expired'}`}>
                    {subInfo.plan ? (subInfo.plan === 'trial' ? 'Trial' : subInfo.plan) : 'No Plan'} - {subInfo.isActive ? 'Active' : subInfo.status === 'expired' ? 'Expired' : 'None'}
                  </span>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    Open Admin
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2 className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          FLUXE
        </h2>
        <nav>
          <ul>
            <li>
              <button className={`nav-link${activePage === 'dashboard' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('dashboard'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Dashboard
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'admin' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('admin'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                Admin
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'billing' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('billing'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Billing
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'account' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('account'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Account
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="mobile-nav">
        <button className={`mobile-nav-item${activePage === 'dashboard' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('dashboard'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Dashboard</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'admin' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('admin'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          <span>Admin</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'billing' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('billing'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Billing</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'account' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); setActivePage('account'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Account</span>
        </button>
      </div>

      {activePage === 'admin' ? renderAdminContent() : (
        <main className="main-content">
          {activePage === 'dashboard' && (
            <div>
              <div className="header">
                <h1>My Websites</h1>
              </div>

              {renderTrialBanner()}

              {sitesLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading your websites...</p>
              ) : sites.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't created any websites yet.</p>
                  <button className="btn btn-primary" onClick={handleCreateSiteClick}>Create Your First Website</button>
                </div>
              ) : (
                <div className="sites-grid">
                  {sites.map(site => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      onDelete={handleDeleteSite}
                      onManage={() => handleManageSite(site)}
                      onBilling={() => handleBillingSite(site.id)}
                      subscriptionInfo={getSiteSubscriptionInfo(site)}
                    />
                  ))}
                </div>
              )}

              <button className="floating-create-btn" onClick={handleCreateSiteClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Create New Site</span>
              </button>
            </div>
          )}

          {activePage === 'billing' && (
            <div>
              <div className="header">
                <h1>Billing</h1>
              </div>

              {accountStatus.isTrialActive && (
                <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem', borderColor: '#10b981', background: '#f0fdf4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span style={{ fontWeight: 700, color: '#166534' }}>Free Trial Active</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#15803d', margin: 0 }}>
                    Your trial covers all websites and ends on {accountStatus.trialEndDate ? new Date(accountStatus.trialEndDate).toLocaleDateString() : 'N/A'}. Upgrade to a paid plan to continue after the trial.
                  </p>
                </div>
              )}

              {sitesLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              ) : sites.length === 0 ? (
                <div className="empty-state">
                  <p>You don't have any websites yet. Create a website to get started.</p>
                  <button className="btn btn-primary" onClick={() => { setActivePage('dashboard'); handleCreateSiteClick(); }}>Create a Website</button>
                </div>
              ) : (
                <div>
                  {billingSiteId ? (
                    <div>
                      <button className="btn btn-outline" onClick={() => setBillingSiteId(null)} style={{ marginBottom: '1.5rem', gap: '0.375rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back to All Sites
                      </button>
                      {(() => {
                        const site = sites.find(s => s.id === billingSiteId);
                        if (!site) return <p>Site not found.</p>;
                        const subInfo = getSiteSubscriptionInfo(site);
                        return (
                          <div>
                            <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{site.brand_name || site.subdomain}</h2>
                                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>https://{site.subdomain}.fluxe.in</p>
                                </div>
                                <span className={`plan-status-pill ${subInfo.isActive ? 'status-active' : 'status-expired'}`}>
                                  {subInfo.plan ? (subInfo.plan === 'trial' ? 'Trial' : subInfo.plan) : 'No Plan'} - {subInfo.isActive ? 'Active' : 'Expired'}
                                </span>
                              </div>
                              {subInfo.periodEnd && subInfo.isActive && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                                  {subInfo.plan === 'trial' ? 'Trial ends' : 'Renews'}: {new Date(subInfo.periodEnd).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {renderUsageBars(billingSiteId)}
                            <PlanSelector
                              siteId={billingSiteId}
                              currentPlan={subInfo.plan}
                              currentStatus={subInfo.isActive ? 'active' : subInfo.status}
                              onUpgraded={() => { loadSites(); loadProfile(); }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="billing-sites-list">
                      {sites.map(site => {
                        const subInfo = getSiteSubscriptionInfo(site);
                        return (
                          <div key={site.id} className="site-card" style={{ display: 'block', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                              <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{site.brand_name || site.subdomain}</h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>https://{site.subdomain}.fluxe.in</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <span className={`plan-status-pill ${subInfo.isActive ? 'status-active' : 'status-expired'}`}>
                                    {subInfo.plan ? (subInfo.plan === 'trial' ? 'Trial' : subInfo.plan) : 'No Plan'}
                                  </span>
                                  {subInfo.periodEnd && subInfo.isActive && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                                      {subInfo.plan === 'trial' ? 'Ends' : 'Renews'}: {new Date(subInfo.periodEnd).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => { setBillingSiteId(site.id); loadSiteUsage(site.id); }}>
                                  {subInfo.isExpired || !subInfo.plan ? 'Subscribe' : accountStatus.isTrialActive ? 'Upgrade' : 'Manage Plan'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activePage === 'account' && (
            <div>
              <div className="header">
                <h1>Account</h1>
                <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fecaca' }}>Logout</button>
              </div>

              <div className="site-card" style={{ display: 'block', maxWidth: '500px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Profile Details
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Name</label>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{profileData?.name || user?.name || '-'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</label>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{profileData?.email || user?.email || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {showWizard && (
        <SiteCreationWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleSiteCreated}
        />
      )}

      {showTrialOverlay && (
        <PlanSelector
          currentPlan={null}
          currentStatus="none"
          onUpgraded={handleTrialStarted}
          isOverlay={true}
        />
      )}
    </div>
  );
}
