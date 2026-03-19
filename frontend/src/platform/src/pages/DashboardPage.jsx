import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSites, deleteSite, createSite } from '../services/siteService.js';
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
  const [showPlanOverlay, setShowPlanOverlay] = useState(false);
  const [showPlanOverlayHideTrial, setShowPlanOverlayHideTrial] = useState(true);
  const [planOverlaySiteId, setPlanOverlaySiteId] = useState(null);
  const [pendingSiteData, setPendingSiteData] = useState(null);
  const [siteUsage, setSiteUsage] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSiteId, setStaffSiteId] = useState(null);
  const [staffForm, setStaffForm] = useState(null);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffMsg, setStaffMsg] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const openDeleteModal = (site) => {
    setDeleteModal(site);
    setDeleteConfirmText('');
    setDeleteLoading(false);
  };

  const closeDeleteModal = () => {
    setDeleteModal(null);
    setDeleteConfirmText('');
    setDeleteLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const result = await deleteSite(deleteModal.id);
      if (result.success) {
        closeDeleteModal();
        await loadSites();
      } else {
        alert('Failed to delete site: ' + (result.error || 'Unknown error'));
        setDeleteLoading(false);
      }
    } catch (e) {
      alert('Failed to delete site: ' + e.message);
      setDeleteLoading(false);
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

  const handleSiteCreated = async () => {
    await Promise.all([loadSites(), loadProfile()]);
  };

  const handleNeedsPlan = (formData) => {
    setPendingSiteData(formData);
    const hadSub = profileData?.hadSubscription || false;
    setShowPlanOverlayHideTrial(hadSub);
    setShowPlanOverlay(true);
  };

  const handleCreatePendingSite = async () => {
    if (!pendingSiteData) return null;
    try {
      const result = await createSite(pendingSiteData);
      if (result.success || result.site) {
        const newSite = result.site || result.data || result;
        return newSite.id || newSite.siteId;
      } else {
        throw new Error(result.message || result.error || 'Failed to create website');
      }
    } catch (err) {
      throw err;
    }
  };

  const handlePlanOverlayDone = async () => {
    setShowPlanOverlay(false);
    setPendingSiteData(null);
    setPlanOverlaySiteId(null);
    await Promise.all([loadSites(), loadProfile()]);
  };

  const handlePlanOverlayClose = () => {
    setShowPlanOverlay(false);
    setPendingSiteData(null);
    setPlanOverlaySiteId(null);
  };

  const handleCreateSiteClick = () => {
    setShowWizard(true);
  };

  const PERMISSION_OPTIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'orders', label: 'Orders' },
    { id: 'customers', label: 'Customers' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'website', label: 'Website' },
    { id: 'seo', label: 'SEO' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
  ];

  const loadStaff = useCallback(async (siteId) => {
    setStaffLoading(true);
    setStaffError('');
    try {
      const result = await apiRequest(`/api/sites/${siteId}/staff`);
      setStaffList(result.data || result.staff || []);
    } catch (e) {
      setStaffError('Failed to load staff: ' + e.message);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const handleStaffSite = (siteId) => {
    setStaffSiteId(siteId);
    setActivePage('staff');
    setStaffForm(null);
    setStaffMsg('');
    setStaffError('');
    loadStaff(siteId);
  };

  const handleStaffFormChange = (field, value) => {
    setStaffForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTogglePermission = (permId) => {
    setStaffForm(prev => {
      const perms = prev.permissions || [];
      if (perms.includes(permId)) {
        const newPerms = perms.filter(p => p !== permId);
        if (newPerms.length === 0) return prev;
        return { ...prev, permissions: newPerms };
      }
      return { ...prev, permissions: [...perms, permId] };
    });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm || !staffSiteId) return;
    setStaffSaving(true);
    setStaffError('');
    setStaffMsg('');
    try {
      const isEdit = !!staffForm.id;
      const body = {
        name: staffForm.name,
        email: staffForm.email,
        permissions: staffForm.permissions || [],
        is_active: staffForm.is_active !== false,
      };
      if (staffForm.password) body.password = staffForm.password;

      if (isEdit) {
        await apiRequest(`/api/sites/${staffSiteId}/staff/${staffForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setStaffMsg('Staff member updated successfully.');
      } else {
        if (!staffForm.password || staffForm.password.length < 6) {
          setStaffError('Password must be at least 6 characters.');
          setStaffSaving(false);
          return;
        }
        await apiRequest(`/api/sites/${staffSiteId}/staff`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setStaffMsg('Staff member added successfully.');
      }
      setStaffForm(null);
      await loadStaff(staffSiteId);
    } catch (e) {
      setStaffError(e.message || 'Failed to save staff member.');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await apiRequest(`/api/sites/${staffSiteId}/staff/${staffId}`, {
        method: 'DELETE',
      });
      setStaffMsg('Staff member removed.');
      await loadStaff(staffSiteId);
    } catch (e) {
      setStaffError('Failed to remove staff: ' + e.message);
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

  const formatPlanName = (plan) => {
    if (!plan) return 'Inactive';
    if (plan === 'trial') return 'Trial';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
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

        {!usage.isEnterprise && (d1Pct >= 90 || r2Pct >= 90) && (
          <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fca5a5' }}>
            <p style={{ fontSize: '0.8rem', color: '#991b1b', margin: 0, fontWeight: 600 }}>
              You are approaching your storage limit. Upgrade your plan for more storage.
            </p>
          </div>
        )}

        {usage.isEnterprise && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#f5f3ff', borderRadius: '0.5rem', border: '1px solid #c4b5fd', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6' }}>Enterprise Plan</span>
              <p style={{ fontSize: '0.75rem', color: '#6d28d9', margin: '0.25rem 0 0' }}>
                Overage is always allowed. Usage beyond included limits is billed monthly.
              </p>
            </div>

            {usage.overageCostINR > 0 && (
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fbbf24', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>Current Month Overage</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {(usage.d1?.overageCostINR || 0) > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                      Database (D1): <strong>{formatBytes(usage.d1?.overageBytes || 0)}</strong> over — <strong>{'\u20B9'}{(usage.d1?.overageCostINR || 0).toFixed(2)}</strong>
                    </div>
                  )}
                  {(usage.r2?.overageCostINR || 0) > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                      Media (R2): <strong>{formatBytes(usage.r2?.overageBytes || 0)}</strong> over — <strong>{'\u20B9'}{(usage.r2?.overageCostINR || 0).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>
                  Total: {'\u20B9'}{usage.overageCostINR.toFixed(2)}
                </div>
                {usage.overageRates && (
                  <p style={{ fontSize: '0.7rem', color: '#a16207', margin: '0.5rem 0 0', borderTop: '1px solid #fde68a', paddingTop: '0.35rem' }}>
                    Rates: {'\u20B9'}{usage.overageRates.d1PerGB}/GB (Database) &middot; {'\u20B9'}{usage.overageRates.r2PerGB}/GB (Media)
                  </p>
                )}
              </div>
            )}

            {usage.enterpriseInvoices && usage.enterpriseInvoices.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payment History</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem', color: '#64748b', fontWeight: 600 }}>Month</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: '#64748b', fontWeight: 600 }}>D1 Overage</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: '#64748b', fontWeight: 600 }}>R2 Overage</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', color: '#64748b', fontWeight: 600 }}>Total</th>
                        <th style={{ textAlign: 'center', padding: '0.5rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.enterpriseInvoices.map(inv => (
                        <tr key={inv.year_month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>{inv.year_month}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{'\u20B9'}{inv.d1_cost_inr?.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{'\u20B9'}{inv.r2_cost_inr?.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{'\u20B9'}{inv.total_cost_inr?.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                              background: inv.status === 'paid' ? '#dcfce7' : '#fef2f2',
                              color: inv.status === 'paid' ? '#166534' : '#991b1b',
                            }}>
                              {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                {formatPlanName(siteInfo.plan)} - {siteInfo.isActive ? 'Active' : 'Expired'}
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
                    {formatPlanName(subInfo.plan)} - {subInfo.isActive ? 'Active' : subInfo.plan ? 'Expired' : 'No Subscription'}
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
              <button className={`nav-link${activePage === 'billing' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); if (sites.length === 1) { setBillingSiteId(sites[0].id); loadSiteUsage(sites[0].id); } else { setBillingSiteId(null); } setActivePage('billing'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Billing
              </button>
            </li>
            <li>
              <button className={`nav-link${activePage === 'staff' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); if (sites.length === 1) { setStaffSiteId(null); setStaffForm(null); handleStaffSite(sites[0].id); } else { setStaffSiteId(null); setStaffForm(null); } setActivePage('staff'); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Staff
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
        <button className={`mobile-nav-item${activePage === 'billing' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); if (sites.length === 1) { setBillingSiteId(sites[0].id); loadSiteUsage(sites[0].id); } else { setBillingSiteId(null); } setActivePage('billing'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Billing</span>
        </button>
        <button className={`mobile-nav-item${activePage === 'staff' ? ' active' : ''}`} onClick={() => { setManagedSite(null); setManagedAdminUrl(null); if (sites.length === 1) { setStaffSiteId(null); setStaffForm(null); handleStaffSite(sites[0].id); } else { setStaffSiteId(null); setStaffForm(null); } setActivePage('staff'); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span>Staff</span>
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
                      {sites.length > 1 && (
                      <button className="btn btn-outline" onClick={() => setBillingSiteId(null)} style={{ marginBottom: '1.5rem', gap: '0.375rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back to All Sites
                      </button>
                    )}
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
                                  {formatPlanName(subInfo.plan)} - {subInfo.isActive ? 'Active' : subInfo.plan ? 'Expired' : 'No Subscription'}
                                </span>
                              </div>
                              {subInfo.periodEnd && subInfo.isActive && subInfo.plan !== 'enterprise' && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                                  {subInfo.plan === 'trial' ? 'Trial ends' : 'Renews'}: {new Date(subInfo.periodEnd).toLocaleDateString()}
                                </p>
                              )}
                              {subInfo.plan === 'enterprise' && subInfo.isActive && (
                                <p style={{ fontSize: '0.875rem', color: '#5b21b6', margin: '0 0 1rem 0', fontWeight: 500 }}>
                                  Managed enterprise plan
                                </p>
                              )}
                              {subInfo.plan !== 'enterprise' && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                <button className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }} onClick={() => { setPlanOverlaySiteId(billingSiteId); setShowPlanOverlayHideTrial(!!profileData?.hadSubscription); setShowPlanOverlay(true); }}>
                                  {subInfo.isActive && subInfo.plan !== 'trial' ? 'Change Plan' : 'Upgrade'}
                                </button>
                              </div>
                              )}
                            </div>
                            {renderUsageBars(billingSiteId)}
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
                                    {formatPlanName(subInfo.plan)}
                                  </span>
                                  {subInfo.periodEnd && subInfo.isActive && subInfo.plan !== 'enterprise' && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                                      {subInfo.plan === 'trial' ? 'Ends' : 'Renews'}: {new Date(subInfo.periodEnd).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                {subInfo.plan !== 'enterprise' && (
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => { setBillingSiteId(site.id); loadSiteUsage(site.id); }}>
                                  {subInfo.isExpired || !subInfo.plan ? 'Subscribe' : accountStatus.isTrialActive ? 'Upgrade' : 'Manage Plan'}
                                </button>
                                )}
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

          {activePage === 'staff' && (
            <div>
              <div className="header">
                <h1>Staff Management</h1>
              </div>

              {!staffSiteId ? (
                sitesLoading ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading sites...</p>
                ) : sites.length === 0 ? (
                  <div className="empty-state">
                    <p>Create a website first to manage staff.</p>
                    <button className="btn btn-primary" onClick={() => { setActivePage('dashboard'); handleCreateSiteClick(); }}>Create a Website</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Select a site to manage its staff members.</p>
                    <div className="billing-sites-list">
                      {sites.map(site => (
                        <div key={site.id} className="site-card" style={{ display: 'block', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => handleStaffSite(site.id)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{site.brand_name || site.subdomain}</h3>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>https://{site.subdomain}.fluxe.in</p>
                            </div>
                            <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}>Manage Staff</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div>
                  {sites.length > 1 && (
                    <button className="btn btn-outline" onClick={() => { setStaffSiteId(null); setStaffForm(null); }} style={{ marginBottom: '1.5rem', gap: '0.375rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                      Back to All Sites
                    </button>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                      {(() => { const s = sites.find(s => s.id === staffSiteId); return s ? (s.brand_name || s.subdomain) : ''; })()} - Staff
                    </h2>
                    {!staffForm && (
                      <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setStaffForm({ name: '', email: '', password: '', permissions: [...PERMISSION_OPTIONS.map(p => p.id)], is_active: true })}>
                        Add Staff Member
                      </button>
                    )}
                  </div>

                  {staffMsg && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: '#166534', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      {staffMsg}
                    </div>
                  )}
                  {staffError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      {staffError}
                    </div>
                  )}

                  {staffForm && (
                    <div className="site-card" style={{ display: 'block', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>{staffForm.id ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                      <form onSubmit={handleSaveStaff}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Name</label>
                            <input type="text" required value={staffForm.name || ''} onChange={e => handleStaffFormChange('name', e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Email</label>
                            <input type="email" required value={staffForm.email || ''} onChange={e => handleStaffFormChange('email', e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase' }}>{staffForm.id ? 'New Password (leave empty to keep current)' : 'Password'}</label>
                          <input type="password" value={staffForm.password || ''} onChange={e => handleStaffFormChange('password', e.target.value)} required={!staffForm.id} minLength={6} placeholder={staffForm.id ? 'Leave empty to keep current' : 'Min 6 characters'} style={{ width: '100%', maxWidth: '320px', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Permissions</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {PERMISSION_OPTIONS.map(perm => {
                              const checked = (staffForm.permissions || []).includes(perm.id);
                              const isLast = checked && (staffForm.permissions || []).length === 1;
                              return (
                                <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', border: `1px solid ${checked ? '#2563eb' : '#e2e8f0'}`, borderRadius: '0.375rem', cursor: isLast ? 'not-allowed' : 'pointer', background: checked ? '#eff6ff' : '#fff', fontSize: '0.8125rem', fontWeight: 500, transition: 'all 0.15s', userSelect: 'none', opacity: isLast ? 0.7 : 1 }}>
                                  <input type="checkbox" checked={checked} onChange={() => handleTogglePermission(perm.id)} style={{ accentColor: '#2563eb' }} disabled={isLast} />
                                  {perm.label}
                                </label>
                              );
                            })}
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.375rem', marginBottom: 0 }}>At least one permission is required.</p>
                        </div>
                        {staffForm.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                              <input type="checkbox" checked={staffForm.is_active !== false} onChange={e => handleStaffFormChange('is_active', e.target.checked)} style={{ accentColor: '#10b981' }} />
                              Active
                            </label>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="submit" className="btn btn-primary" disabled={staffSaving}>{staffSaving ? 'Saving...' : staffForm.id ? 'Update' : 'Add Staff'}</button>
                          <button type="button" className="btn btn-outline" onClick={() => setStaffForm(null)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {staffLoading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading staff...</p>
                  ) : staffList.length === 0 && !staffForm ? (
                    <div className="empty-state">
                      <p>No staff members yet. Add your first staff member to let others help manage your store.</p>
                    </div>
                  ) : (
                    <div>
                      {staffList.map(staff => (
                        <div key={staff.id} className="site-card" style={{ display: 'block', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{staff.name}</h3>
                                <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontWeight: 600, background: (staff.is_active !== false && staff.is_active !== 0) ? '#dcfce7' : '#fee2e2', color: (staff.is_active !== false && staff.is_active !== 0) ? '#166534' : '#991b1b' }}>
                                  {(staff.is_active !== false && staff.is_active !== 0) ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{staff.email}</p>
                              {staff.permissions && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                                  {(typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions).map(p => (
                                    <span key={p} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '0.25rem', fontWeight: 500 }}>{p}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem' }} onClick={() => {
                                const perms = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : (staff.permissions || []);
                                setStaffForm({ id: staff.id, name: staff.name, email: staff.email, password: '', permissions: perms, is_active: staff.is_active !== false && staff.is_active !== 0 });
                                setStaffMsg('');
                                setStaffError('');
                              }}>Edit</button>
                              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem', color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDeleteStaff(staff.id)}>Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
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

              {sites.length > 0 && (
                <div className="site-card" style={{ display: 'block', maxWidth: '500px', marginTop: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Your Websites
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {sites.map(site => (
                      <div key={site.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.brand_name || site.brandName || site.subdomain}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{site.subdomain}.fluxe.in</div>
                        </div>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', color: '#ef4444', borderColor: '#fecaca', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={() => openDeleteModal(site)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {showWizard && (
        <SiteCreationWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleSiteCreated}
          onNeedsPlan={handleNeedsPlan}
          isTrialActive={getAccountSubscriptionStatus().isTrialActive}
        />
      )}

      {showPlanOverlay && (
        <PlanSelector
          siteId={planOverlaySiteId}
          currentPlan={planOverlaySiteId ? (getSiteSubscriptionInfo(sites.find(s => s.id === planOverlaySiteId) || {}).plan || null) : null}
          currentStatus={planOverlaySiteId ? (getSiteSubscriptionInfo(sites.find(s => s.id === planOverlaySiteId) || {}).isActive ? 'active' : 'none') : 'none'}
          onUpgraded={handlePlanOverlayDone}
          isOverlay={true}
          hideTrial={showPlanOverlayHideTrial}
          isFirstTime={!profileData?.hadSubscription}
          onClose={handlePlanOverlayClose}
          onCreateSite={pendingSiteData ? handleCreatePendingSite : null}
        />
      )}

      {deleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </div>
            <h2 className="delete-modal-title">Delete Website</h2>
            <p className="delete-modal-desc">
              This will permanently delete <strong>{deleteModal.brand_name || deleteModal.brandName || deleteModal.subdomain}</strong> and all its data including products, orders, and customers. This action cannot be undone.
            </p>
            <div className="delete-modal-field">
              <label>Type <strong>{deleteModal.subdomain}.fluxe.in</strong> to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={`${deleteModal.subdomain}.fluxe.in`}
                autoFocus
              />
            </div>
            <div className="delete-modal-actions">
              <button className="btn btn-outline" onClick={closeDeleteModal} disabled={deleteLoading}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={deleteConfirmText.trim() !== `${deleteModal.subdomain}.fluxe.in` || deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
