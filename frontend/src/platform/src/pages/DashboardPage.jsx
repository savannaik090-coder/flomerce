import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSites, deleteSite } from '../services/siteService.js';
import { getSubscriptionStatus } from '../services/paymentService.js';
import { getProfile } from '../services/authService.js';
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
      const result = await getProfile();
      const data = result.user || result.data || result;
      setProfileData(data);
      setUser(data);
    } catch (e) {}
  }, [setUser]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSites();
      loadSubscription();
      loadProfile();
    }
  }, [isAuthenticated, loadSites, loadSubscription, loadProfile]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const currentPlan = profileData?.plan || subscription?.plan || 'free';

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
              <button className={`nav-link${activePage === 'sites' ? ' active' : ''}`} onClick={() => setActivePage('sites')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Dashboard
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'plans' ? ' active' : ''}`} onClick={() => setActivePage('plans')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Subscriptions
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'account' ? ' active' : ''}`} onClick={() => setActivePage('account')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Settings
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="mobile-nav">
        <button className={`mobile-nav-item${activePage === 'sites' ? ' active' : ''}`} onClick={() => setActivePage('sites')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Dashboard</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'plans' ? ' active' : ''}`} onClick={() => setActivePage('plans')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Billing</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'account' ? ' active' : ''}`} onClick={() => setActivePage('account')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Settings</span>
        </button>
      </div>

      <main className="main-content">
        {activePage === 'sites' && (
          <div>
            <div className="header">
              <h1>My Websites</h1>
            </div>

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
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.125rem' }}>
                        {(currentPlan || 'Free').charAt(0).toUpperCase() + (currentPlan || 'free').slice(1)}
                      </div>
                    </div>
                    <span className="plan-status-pill status-active">Active</span>
                  </div>
                  <button className="btn btn-primary" onClick={() => setActivePage('plans')} style={{ marginTop: '0.5rem' }}>
                    Upgrade Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showWizard && (
        <SiteCreationWizard
          onClose={() => setShowWizard(false)}
          onCreated={loadSites}
        />
      )}
    </div>
  );
}
