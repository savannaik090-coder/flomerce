import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSites, deleteSite } from '../services/siteService.js';
import { getSubscriptionStatus, getUserProfile } from '../services/paymentService.js';
import SiteCard from '../components/SiteCard.jsx';
import SiteCreationWizard from '../components/SiteCreationWizard.jsx';
import PlanSelector from '../components/PlanSelector.jsx';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('sites');
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [managedSite, setManagedSite] = useState(null);
  const [showPlanOverlay, setShowPlanOverlay] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  const loadSubscription = useCallback(async () => {
    try {
      const result = await getSubscriptionStatus();
      if (result.success) {
        setSubscription(result.subscription || result.data || result);
      }
    } catch (e) {}
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
      Promise.all([loadSites(), loadSubscription(), loadProfile()]).then(() => {
        setDataLoaded(true);
      });
    }
  }, [isAuthenticated, loadSites, loadSubscription, loadProfile]);

  useEffect(() => {
    if (!dataLoaded) return;
    const plan = profileData?.plan;
    const status = profileData?.status;
    const hasActivePlan = plan && status === 'active';
    if (!hasActivePlan) {
      setShowPlanOverlay(true);
    }
  }, [dataLoaded, profileData, subscription]);

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

  const handleManageSite = ({ site, adminUrl }) => {
    setManagedSite({ site, adminUrl });
    setActivePage('manage');
  };

  const handleBackToDashboard = () => {
    setManagedSite(null);
    setActivePage('sites');
  };

  const handlePlanUpgraded = () => {
    setShowPlanOverlay(false);
    loadSubscription();
    loadProfile();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentPlan = profileData?.plan || subscription?.plan || null;
  const currentStatus = profileData?.status || subscription?.status || 'none';
  const hadSubscription = profileData?.hadSubscription || false;
  const isExpired = currentStatus === 'expired';
  const hasNoPlan = !currentPlan || currentStatus === 'none' || currentStatus === 'expired';

  const getPlanDisplayName = () => {
    if (!currentPlan || currentStatus === 'none') return 'No Plan';
    if (currentStatus === 'expired') return `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} (Expired)`;
    return currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  };

  const getStatusPill = () => {
    if (currentStatus === 'active') return { text: 'Active', className: 'status-active' };
    if (currentStatus === 'expired') return { text: 'Expired', className: 'status-expired' };
    return { text: 'No Plan', className: 'status-expired' };
  };

  const statusPill = getStatusPill();

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
              <button className={`nav-link${activePage === 'sites' || activePage === 'manage' ? ' active' : ''}`} onClick={() => { if (managedSite) handleBackToDashboard(); else setActivePage('sites'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Dashboard
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'plans' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setActivePage('plans'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Subscriptions
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'account' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setActivePage('account'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Settings
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="mobile-nav">
        <button className={`mobile-nav-item${activePage === 'sites' || activePage === 'manage' ? ' active' : ''}`} onClick={() => { if (managedSite) handleBackToDashboard(); else setActivePage('sites'); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Dashboard</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'plans' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setActivePage('plans'); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Billing</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'account' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setActivePage('account'); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Settings</span>
        </button>
      </div>

      {activePage === 'manage' && managedSite ? (
        <div className="manage-content">
          <div className="manage-header">
            <button className="btn btn-outline" onClick={handleBackToDashboard} style={{ gap: '0.375rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back to Dashboard
            </button>
            <span className="manage-site-name" style={{ marginLeft: 'auto' }}>{managedSite.site.brand_name || managedSite.site.brandName || managedSite.site.subdomain}</span>
          </div>
          <iframe
            src={managedSite.adminUrl}
            className="manage-iframe"
            title={`Admin - ${managedSite.site.brand_name || managedSite.site.subdomain}`}
            allow="clipboard-write"
          />
        </div>
      ) : (
        <main className="main-content">
          {activePage === 'sites' && (
            <div>
              <div className="header">
                <h1>My Websites</h1>
              </div>

              {hasNoPlan && (
                <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem', borderColor: '#ef4444', borderWidth: '2px', background: '#fef2f2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div>
                      <p style={{ fontWeight: 700, color: '#dc2626', margin: 0 }}>
                        {isExpired ? 'Your subscription has expired' : 'No active subscription'}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: '0.25rem 0 0 0' }}>
                        {isExpired
                          ? 'Your websites are currently disabled. Subscribe to a plan to restore access.'
                          : 'You need an active subscription to keep your websites running.'}
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setActivePage('plans')} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                      {isExpired ? 'Renew Plan' : 'Subscribe Now'}
                    </button>
                  </div>
                </div>
              )}

              {sitesLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading your websites...</p>
              ) : sites.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't created any websites yet.</p>
                  <button className="btn btn-primary" onClick={() => setShowWizard(true)}>Create Your First Website</button>
                </div>
              ) : (
                <div className="sites-grid">
                  {sites.map(site => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      onDelete={handleDeleteSite}
                      onManage={handleManageSite}
                    />
                  ))}
                </div>
              )}

              <button className="floating-create-btn" onClick={() => setShowWizard(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Create New Site</span>
              </button>
            </div>
          )}

          {activePage === 'plans' && (
            <div>
              <div className="header">
                <h1>Subscription Plans</h1>
              </div>
              <PlanSelector
                currentPlan={currentPlan}
                currentStatus={currentStatus}
                hadSubscription={hadSubscription}
                onUpgraded={() => { loadSubscription(); loadProfile(); }}
              />
            </div>
          )}

          {activePage === 'account' && (
            <div>
              <div className="header">
                <h1>Account Settings</h1>
                <button className="btn btn-outline" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fecaca' }}>Logout</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="site-card" style={{ display: 'block' }}>
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

                <div className="site-card" style={{ display: 'block' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Subscription Details
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Plan</label>
                        <div style={{ fontWeight: 700, color: isExpired || hasNoPlan ? '#ef4444' : '#2563eb', fontSize: '1.125rem' }}>
                          {getPlanDisplayName()}
                        </div>
                      </div>
                      <span className={`plan-status-pill ${statusPill.className}`}>{statusPill.text}</span>
                    </div>
                    {profileData?.trialEndDate && currentPlan === 'trial' && currentStatus === 'active' && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Trial Ends</label>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{new Date(profileData.trialEndDate).toLocaleDateString()}</div>
                      </div>
                    )}
                    {profileData?.trialEndDate && currentPlan !== 'trial' && currentStatus === 'active' && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Renews On</label>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{new Date(profileData.trialEndDate).toLocaleDateString()}</div>
                      </div>
                    )}
                    <button className="btn btn-primary" onClick={() => setActivePage('plans')} style={{ marginTop: '0.5rem' }}>
                      {hasNoPlan ? 'Subscribe Now' : 'Manage Subscription'}
                    </button>
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
          onCreated={loadSites}
        />
      )}

      {showPlanOverlay && (
        <PlanSelector
          currentPlan={currentPlan}
          currentStatus={currentStatus}
          hadSubscription={hadSubscription}
          onUpgraded={handlePlanUpgraded}
          isOverlay={true}
        />
      )}
    </div>
  );
}
