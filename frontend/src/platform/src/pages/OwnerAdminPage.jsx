import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import '../styles/owner-admin.css';

export default function OwnerAdminPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan_name: '', billing_cycle: '3months', display_price: '', razorpay_plan_id: '', features: '', is_popular: false, display_order: 0, plan_tier: 1
  });

  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ razorpay_key_id: '' });

  const [shards, setShards] = useState([]);
  const [shardsLoading, setShardsLoading] = useState(false);
  const [selectedShard, setSelectedShard] = useState(null);
  const [shardSites, setShardSites] = useState([]);
  const [shardSitesLoading, setShardSitesLoading] = useState(false);
  const [showCreateShard, setShowCreateShard] = useState(false);
  const [newShardName, setNewShardName] = useState('');
  const [creatingShardLoading, setCreatingShardLoading] = useState(false);
  const [showMoveSite, setShowMoveSite] = useState(null);
  const [moveSiteTarget, setMoveSiteTarget] = useState('');
  const [movingSite, setMovingSite] = useState(false);
  const [reconcilingShardId, setReconcilingShardId] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'plans' && isAuthenticated) loadPlans();
    if (activeTab === 'settings' && isAuthenticated) loadSettings();
    if (activeTab === 'databases' && isAuthenticated) loadShards();
  }, [activeTab, isAuthenticated]);

  const loadAdminData = async () => {
    setDataLoading(true);
    try {
      const data = await apiRequest('/api/admin/stats');
      setAdminData(data);
    } catch (e) {
      setError(e.message || 'Error loading admin data. Please ensure you are logged in as admin.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    try {
      await apiRequest(`/api/admin/users/${userId}/block`, { method: 'POST' });
      await loadAdminData();
    } catch (e) {
      alert('Failed to block user: ' + e.message);
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await apiRequest('/api/admin/plans');
      setPlans(Array.isArray(data) ? data : (data.data || data.plans || []));
    } catch (e) {
      console.error('Failed to load plans:', e);
    } finally {
      setPlansLoading(false);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({ plan_name: '', billing_cycle: '3months', display_price: '', razorpay_plan_id: '', features: '', is_popular: false, display_order: 0, plan_tier: 1 });
    setEditingPlan(null);
    setShowPlanForm(false);
  };

  const TIER_LABELS = { 1: 'Tier 1 (Basic)', 2: 'Tier 2 (Standard)', 3: 'Tier 3 (Pro)', 4: 'Tier 4 (Premium)', 5: 'Tier 5 (Enterprise)' };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...planForm,
        display_price: parseFloat(planForm.display_price),
        display_order: parseInt(planForm.display_order) || 0,
        plan_tier: parseInt(planForm.plan_tier) || 1,
        features: planForm.features ? planForm.features.split('\n').filter(f => f.trim()) : [],
      };

      if (editingPlan) {
        await apiRequest(`/api/admin/plans/${editingPlan.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiRequest('/api/admin/plans', { method: 'POST', body: JSON.stringify(body) });
      }
      resetPlanForm();
      await loadPlans();
    } catch (e) {
      alert('Failed to save plan: ' + e.message);
    }
  };

  const handleEditPlan = (plan) => {
    setPlanForm({
      plan_name: plan.plan_name,
      billing_cycle: plan.billing_cycle,
      display_price: plan.display_price,
      razorpay_plan_id: plan.razorpay_plan_id,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_popular: !!plan.is_popular,
      display_order: plan.display_order || 0,
      plan_tier: plan.plan_tier || 1,
    });
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handleTogglePlan = async (plan) => {
    try {
      await apiRequest(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      await loadPlans();
    } catch (e) {
      alert('Failed to toggle plan: ' + e.message);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.plan_name} (${plan.billing_cycle})"?`)) return;
    try {
      await apiRequest(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
      await loadPlans();
    } catch (e) {
      alert('Failed to delete plan: ' + e.message);
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await apiRequest('/api/admin/settings');
      const s = data.data || data || {};
      setSettings(s);
      setSettingsForm({ razorpay_key_id: s.razorpay_key_id || '' });
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settingsForm) });
      alert('Settings saved successfully!');
      await loadSettings();
    } catch (e) {
      alert('Failed to save settings: ' + e.message);
    }
  };

  const loadShards = async () => {
    setShardsLoading(true);
    try {
      const data = await apiRequest('/api/admin/shards');
      setShards(data.data || data || []);
    } catch (e) {
      console.error('Failed to load shards:', e);
    } finally {
      setShardsLoading(false);
    }
  };

  const loadShardSites = async (shardId) => {
    setShardSitesLoading(true);
    try {
      const data = await apiRequest(`/api/admin/shards/${shardId}/sites`);
      setShardSites(data.data?.sites || []);
    } catch (e) {
      console.error('Failed to load shard sites:', e);
      setShardSites([]);
    } finally {
      setShardSitesLoading(false);
    }
  };

  const handleCreateShard = async (e) => {
    e.preventDefault();
    if (!newShardName.trim()) return;
    setCreatingShardLoading(true);
    try {
      const data = await apiRequest('/api/admin/shards', {
        method: 'POST',
        body: JSON.stringify({ name: newShardName.trim() }),
      });
      const result = data.data || data;
      if (result.note) {
        alert(`Shard created. Note: ${result.note}`);
      } else {
        alert('Shard created successfully!');
      }
      setNewShardName('');
      setShowCreateShard(false);
      await loadShards();
    } catch (e) {
      alert('Failed to create shard: ' + e.message);
    } finally {
      setCreatingShardLoading(false);
    }
  };

  const refreshSelectedShard = async () => {
    const data = await apiRequest('/api/admin/shards');
    const list = data.data || data || [];
    setShards(list);
    if (selectedShard) {
      const updated = list.find(s => s.id === selectedShard.id);
      if (updated) {
        setSelectedShard(updated);
      } else {
        setSelectedShard(null);
        setShardSites([]);
      }
    }
  };

  const handleReconcileShard = async (shardId) => {
    setReconcilingShardId(shardId);
    try {
      await apiRequest(`/api/admin/shards/${shardId}/reconcile`, { method: 'POST' });
      alert('Shard reconciled successfully!');
      await refreshSelectedShard();
      if (selectedShard?.id === shardId) {
        await loadShardSites(shardId);
      }
    } catch (e) {
      alert('Reconciliation failed: ' + e.message);
    } finally {
      setReconcilingShardId(null);
    }
  };

  const handleSetActive = async (shardId) => {
    try {
      await apiRequest(`/api/admin/shards/${shardId}/set-active`, {
        method: 'POST',
        body: JSON.stringify({ active: true }),
      });
      await refreshSelectedShard();
    } catch (e) {
      alert('Failed to set shard active: ' + e.message);
    }
  };

  const handleMoveSite = async () => {
    if (!showMoveSite || !moveSiteTarget) return;
    setMovingSite(true);
    try {
      await apiRequest('/api/admin/shards/move-site', {
        method: 'POST',
        body: JSON.stringify({ siteId: showMoveSite.siteId, targetShardId: moveSiteTarget }),
      });
      alert('Site moved successfully!');
      setShowMoveSite(null);
      setMoveSiteTarget('');
      await refreshSelectedShard();
      if (selectedShard) {
        await loadShardSites(selectedShard.id);
      }
    } catch (e) {
      alert('Failed to move site: ' + e.message);
    } finally {
      setMovingSite(false);
    }
  };

  const handleDeleteShard = async (shardId, shardName) => {
    if (!window.confirm(`Delete shard "${shardName}"? This shard must have zero sites.`)) return;
    try {
      await apiRequest(`/api/admin/shards/${shardId}`, { method: 'DELETE' });
      alert('Shard deleted.');
      setSelectedShard(null);
      await loadShards();
    } catch (e) {
      alert('Failed to delete shard: ' + e.message);
    }
  };

  const handleViewShard = (shard) => {
    setSelectedShard(shard);
    loadShardSites(shard.id);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || dataLoading) {
    return (
      <div className="oa-loading">
        <div className="oa-spinner" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oa-page">
        <div className="oa-header">
          <h1>Owner Admin Panel</h1>
          <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>Back</button>
        </div>
        <div className="oa-card oa-error-card">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const users = adminData?.users || [];
  const allSites = adminData?.sites || [];
  const currentOwner = adminData?.currentOwner;
  const totalOrders = adminData?.totalOrders || 0;

  return (
    <div className="oa-page">
      <div className="oa-header">
        <div>
          <h1>Admin Panel</h1>
          {currentOwner && (
            <p className="oa-owner-info">Owner: {currentOwner.name || currentOwner.email}</p>
          )}
        </div>
        <button className="oa-btn oa-btn-outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>

      <div className="oa-tabs">
        <button className={`oa-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`oa-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`oa-tab ${activeTab === 'sites' ? 'active' : ''}`} onClick={() => setActiveTab('sites')}>Websites</button>
        <button className={`oa-tab ${activeTab === 'databases' ? 'active' : ''}`} onClick={() => setActiveTab('databases')}>Databases</button>
        <button className={`oa-tab ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => setActiveTab('plans')}>Plans</button>
        <button className={`oa-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
      </div>

      {activeTab === 'overview' && (
        <div className="oa-overview">
          <div className="oa-stats-grid">
            <div className="oa-stat-card">
              <div className="oa-stat-value">{users.length}</div>
              <div className="oa-stat-label">Total Users</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{allSites.length}</div>
              <div className="oa-stat-label">Total Websites</div>
            </div>
            <div className="oa-stat-card">
              <div className="oa-stat-value">{totalOrders}</div>
              <div className="oa-stat-label">Total Orders</div>
            </div>
          </div>

          <div className="oa-card">
            <h3>Recent Users</h3>
            <div className="oa-list">
              {users.slice(0, 5).map(u => (
                <div className="oa-list-item" key={u.id || u.email}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{u.name}</span>
                    <span className="oa-list-sub">{u.email}</span>
                  </div>
                  <span className="oa-badge">{u.plan || 'No Plan'}</span>
                </div>
              ))}
              {users.length === 0 && <p className="oa-empty">No users yet</p>}
            </div>
          </div>

          <div className="oa-card">
            <h3>Recent Websites</h3>
            <div className="oa-list">
              {allSites.slice(0, 5).map(s => (
                <div className="oa-list-item" key={s.id || s.subdomain}>
                  <div className="oa-list-info">
                    <span className="oa-list-name">{s.brand_name || s.subdomain}</span>
                    <span className="oa-list-sub">{s.subdomain}.fluxe.in</span>
                  </div>
                  <span className="oa-badge oa-badge-green">Active</span>
                </div>
              ))}
              {allSites.length === 0 && <p className="oa-empty">No websites yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>All Users ({users.length})</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id || u.email}>
                      <td data-label="Name">{u.name}</td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Plan"><span className="oa-badge">{u.plan || 'No Plan'}</span></td>
                      <td data-label="Joined">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                      <td data-label="Action">
                        {u.email !== currentOwner?.email && (
                          <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>Block</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="oa-empty">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="oa-card-list-mobile">
              {users.map(u => (
                <div className="oa-user-card" key={u.id || u.email}>
                  <div className="oa-user-card-header">
                    <div>
                      <div className="oa-user-card-name">{u.name}</div>
                      <div className="oa-user-card-email">{u.email}</div>
                    </div>
                    <span className="oa-badge">{u.plan || 'No Plan'}</span>
                  </div>
                  <div className="oa-user-card-footer">
                    <span className="oa-user-card-date">Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</span>
                    {u.email !== currentOwner?.email && (
                      <button className="oa-btn-sm oa-btn-danger" onClick={() => handleBlockUser(u.id)}>Block</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sites' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>All Websites ({allSites.length})</h3>
            <div className="oa-table-wrap">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Subdomain</th>
                    <th>User ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSites.map(s => (
                    <tr key={s.id || s.subdomain}>
                      <td data-label="Site">{s.brand_name || s.subdomain}</td>
                      <td data-label="Subdomain">{s.subdomain}.fluxe.in</td>
                      <td data-label="User">{s.user_id}</td>
                      <td data-label="Status"><span className="oa-badge oa-badge-green">Active</span></td>
                    </tr>
                  ))}
                  {allSites.length === 0 && (
                    <tr><td colSpan="4" className="oa-empty">No websites found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="oa-card-list-mobile">
              {allSites.map(s => (
                <div className="oa-user-card" key={s.id || s.subdomain}>
                  <div className="oa-user-card-header">
                    <div>
                      <div className="oa-user-card-name">{s.brand_name || s.subdomain}</div>
                      <div className="oa-user-card-email">{s.subdomain}.fluxe.in</div>
                    </div>
                    <span className="oa-badge oa-badge-green">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'databases' && (
        <div className="oa-section">
          {selectedShard ? (
            <div>
              <button className="oa-btn oa-btn-outline" onClick={() => { setSelectedShard(null); setShardSites([]); }} style={{ marginBottom: '1rem' }}>
                &larr; Back to All Shards
              </button>

              <div className="oa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedShard.database_name}</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      Binding: <code>{selectedShard.binding_name}</code> &middot; ID: <code style={{ fontSize: '0.65rem' }}>{selectedShard.database_id}</code>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!selectedShard.is_active && (
                      <button className="oa-btn-sm oa-btn-edit" onClick={() => handleSetActive(selectedShard.id)}>Set Active</button>
                    )}
                    <button
                      className="oa-btn-sm oa-btn-toggle"
                      disabled={reconcilingShardId === selectedShard.id}
                      onClick={() => handleReconcileShard(selectedShard.id)}
                    >
                      {reconcilingShardId === selectedShard.id ? 'Reconciling...' : 'Reconcile'}
                    </button>
                    <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeleteShard(selectedShard.id, selectedShard.database_name)}>Delete</button>
                  </div>
                </div>

                <div className="oa-db-stats-row">
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Size</span>
                    <span className="oa-db-stat-value">{selectedShard.sizeMB} MB</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Sites</span>
                    <span className="oa-db-stat-value">{selectedShard.siteCount}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Status</span>
                    <span className={`oa-badge ${selectedShard.is_active ? 'oa-badge-green' : ''}`}>{selectedShard.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="oa-db-stat">
                    <span className="oa-db-stat-label">Correction Factor</span>
                    <span className="oa-db-stat-value">{selectedShard.correction_factor?.toFixed(2) || '1.00'}</span>
                  </div>
                </div>

                {selectedShard.isNearLimit && (
                  <div className="oa-db-alert">
                    Database is approaching the 10GB D1 limit ({selectedShard.sizeAlertGB} GB). Consider creating a new shard.
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>Sites on this Shard ({shardSites.length})</h3>
                {shardSitesLoading ? (
                  <p className="oa-empty">Loading sites...</p>
                ) : shardSites.length === 0 ? (
                  <p className="oa-empty">No sites on this shard yet</p>
                ) : (
                  <>
                    <div className="oa-table-wrap">
                      <table className="oa-table">
                        <thead>
                          <tr>
                            <th>Site</th>
                            <th>D1 Usage</th>
                            <th>R2 Usage</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shardSites.map(s => (
                            <tr key={s.siteId}>
                              <td data-label="Site">
                                <div style={{ fontWeight: 600 }}>{s.brandName || s.subdomain}</div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.subdomain}.fluxe.in</div>
                              </td>
                              <td data-label="D1">{formatBytes(s.d1BytesDisplayed || 0)}</td>
                              <td data-label="R2">{formatBytes(s.r2BytesUsed || 0)}</td>
                              <td data-label="Created">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                              <td data-label="Actions">
                                <button
                                  className="oa-btn-sm oa-btn-edit"
                                  onClick={() => { setShowMoveSite(s); setMoveSiteTarget(''); }}
                                  disabled={shards.length < 2}
                                  title={shards.length < 2 ? 'Need at least 2 shards to move sites' : 'Move to another shard'}
                                >
                                  Move
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="oa-card-list-mobile">
                      {shardSites.map(s => (
                        <div className="oa-user-card" key={s.siteId}>
                          <div className="oa-user-card-header">
                            <div>
                              <div className="oa-user-card-name">{s.brandName || s.subdomain}</div>
                              <div className="oa-user-card-email">{s.subdomain}.fluxe.in</div>
                              <div className="oa-user-card-email">D1: {formatBytes(s.d1BytesDisplayed || 0)} &middot; R2: {formatBytes(s.r2BytesUsed || 0)}</div>
                            </div>
                          </div>
                          <div className="oa-user-card-footer">
                            <span className="oa-user-card-date">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</span>
                            <button
                              className="oa-btn-sm oa-btn-edit"
                              onClick={() => { setShowMoveSite(s); setMoveSiteTarget(''); }}
                              disabled={shards.length < 2}
                            >
                              Move
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="oa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>Database Shards ({shards.length})</h3>
                  <button className="oa-btn oa-btn-primary" onClick={() => setShowCreateShard(true)}>+ New Shard</button>
                </div>

                {showCreateShard && (
                  <div className="oa-plan-form-wrap" style={{ marginBottom: '1rem' }}>
                    <form onSubmit={handleCreateShard}>
                      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Create New Shard Database</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                        This will create a new Cloudflare D1 database, apply the site schema, and register it. New sites will be assigned to the active shard.
                      </p>
                      <div className="oa-form-group">
                        <label>Database Name</label>
                        <input
                          type="text"
                          value={newShardName}
                          onChange={e => setNewShardName(e.target.value)}
                          placeholder="e.g. saas-sites-db-2"
                          required
                          disabled={creatingShardLoading}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button type="submit" className="oa-btn oa-btn-primary" disabled={creatingShardLoading}>
                          {creatingShardLoading ? 'Creating...' : 'Create Shard'}
                        </button>
                        <button type="button" className="oa-btn oa-btn-outline" onClick={() => { setShowCreateShard(false); setNewShardName(''); }} disabled={creatingShardLoading}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {shardsLoading ? (
                  <p className="oa-empty">Loading shards...</p>
                ) : shards.length === 0 ? (
                  <div className="oa-empty">
                    <p>No database shards created yet.</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Create your first shard to start assigning sites to shared databases.</p>
                  </div>
                ) : (
                  <div className="oa-db-grid">
                    {shards.map(shard => (
                      <div key={shard.id} className={`oa-db-card ${shard.is_active ? 'oa-db-card-active' : ''}`} onClick={() => handleViewShard(shard)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{shard.database_name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>{shard.binding_name}</div>
                          </div>
                          {shard.is_active ? (
                            <span className="oa-badge oa-badge-green">Active</span>
                          ) : (
                            <span className="oa-badge">Inactive</span>
                          )}
                        </div>
                        <div className="oa-db-stats-row">
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Size</span>
                            <span className="oa-db-stat-value">{shard.sizeMB} MB</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Sites</span>
                            <span className="oa-db-stat-value">{shard.siteCount}</span>
                          </div>
                          <div className="oa-db-stat">
                            <span className="oa-db-stat-label">Factor</span>
                            <span className="oa-db-stat-value">{shard.correction_factor?.toFixed(2) || '1.00'}</span>
                          </div>
                        </div>
                        {shard.isNearLimit && (
                          <div className="oa-db-alert">Near 10GB limit!</div>
                        )}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {!shard.is_active && (
                            <button className="oa-btn-sm oa-btn-edit" onClick={(e) => { e.stopPropagation(); handleSetActive(shard.id); }}>Set Active</button>
                          )}
                          <button
                            className="oa-btn-sm oa-btn-toggle"
                            disabled={reconcilingShardId === shard.id}
                            onClick={(e) => { e.stopPropagation(); handleReconcileShard(shard.id); }}
                          >
                            {reconcilingShardId === shard.id ? 'Reconciling...' : 'Reconcile'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="oa-card" style={{ marginTop: '1rem' }}>
                <h3>How Shards Work</h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
                  <p><strong>Shards</strong> are shared D1 databases that store site-specific data (products, orders, categories, etc.) for multiple sites with row-level isolation.</p>
                  <p><strong>Active Shard:</strong> New sites are automatically assigned to the currently active shard. Only one shard can be active at a time.</p>
                  <p><strong>Reconcile:</strong> Compares estimated usage with actual database size and updates the correction factor for accurate billing.</p>
                  <p><strong>Move Site:</strong> Migrates a site's data from one shard to another. The site is briefly locked during migration.</p>
                  <p><strong>Capacity:</strong> Each D1 database supports up to 10GB. Create a new shard when the current one approaches this limit.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showMoveSite && (
        <div className="oa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-site-title" onClick={() => { if (!movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }} onKeyDown={e => { if (e.key === 'Escape' && !movingSite) { setShowMoveSite(null); setMoveSiteTarget(''); } }}>
          <div className="oa-modal" onClick={e => e.stopPropagation()}>
            <h3 id="move-site-title" style={{ margin: '0 0 0.75rem' }}>Move Site</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem' }}>
              Move <strong>{showMoveSite.brandName || showMoveSite.subdomain}</strong> to a different shard database.
              The site will be briefly locked during migration.
            </p>
            <div className="oa-form-group">
              <label>Target Shard</label>
              <select value={moveSiteTarget} onChange={e => setMoveSiteTarget(e.target.value)} disabled={movingSite}>
                <option value="">Select a shard...</option>
                {shards.filter(s => !selectedShard || s.id !== selectedShard.id).map(s => (
                  <option key={s.id} value={s.id}>{s.database_name} ({s.binding_name}) - {s.sizeMB} MB, {s.siteCount} sites</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="oa-btn oa-btn-outline" onClick={() => { setShowMoveSite(null); setMoveSiteTarget(''); }} disabled={movingSite}>Cancel</button>
              <button className="oa-btn oa-btn-primary" onClick={handleMoveSite} disabled={!moveSiteTarget || movingSite}>
                {movingSite ? 'Moving...' : 'Move Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="oa-section">
          <div className="oa-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Subscription Plans ({plans.length})</h3>
              <button className="oa-btn oa-btn-primary" onClick={() => { resetPlanForm(); setShowPlanForm(true); }}>
                + Add Plan
              </button>
            </div>

            {showPlanForm && (
              <div className="oa-plan-form-wrap">
                <form onSubmit={handlePlanSubmit} className="oa-plan-form">
                  <h4 style={{ margin: '0 0 1rem' }}>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h4>
                  <div className="oa-form-grid">
                    <div className="oa-form-group">
                      <label>Plan Name</label>
                      <input type="text" value={planForm.plan_name} onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} placeholder="e.g. Starter, Growth, Enterprise" required />
                    </div>
                    <div className="oa-form-group">
                      <label>Plan Tier</label>
                      <select value={planForm.plan_tier} onChange={e => setPlanForm({ ...planForm, plan_tier: parseInt(e.target.value) })}>
                        {Object.entries(TIER_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>Defines the hierarchy level. Higher tier = more features.</p>
                    </div>
                    <div className="oa-form-group">
                      <label>Billing Cycle</label>
                      <select value={planForm.billing_cycle} onChange={e => setPlanForm({ ...planForm, billing_cycle: e.target.value })}>
                        <option value="3months">3 Months</option>
                        <option value="6months">6 Months</option>
                        <option value="yearly">Yearly</option>
                        <option value="3years">3 Years</option>
                      </select>
                    </div>
                    <div className="oa-form-group">
                      <label>Display Price (₹)</label>
                      <input type="number" step="0.01" value={planForm.display_price} onChange={e => setPlanForm({ ...planForm, display_price: e.target.value })} placeholder="e.g. 99" required />
                    </div>
                    <div className="oa-form-group">
                      <label>Razorpay Plan ID</label>
                      <input type="text" value={planForm.razorpay_plan_id} onChange={e => setPlanForm({ ...planForm, razorpay_plan_id: e.target.value })} placeholder="e.g. plan_XXXXXX" required />
                    </div>
                    <div className="oa-form-group">
                      <label>Display Order</label>
                      <input type="number" value={planForm.display_order} onChange={e => setPlanForm({ ...planForm, display_order: e.target.value })} />
                    </div>
                    <div className="oa-form-group oa-form-check">
                      <label>
                        <input type="checkbox" checked={planForm.is_popular} onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })} />
                        Mark as Popular
                      </label>
                    </div>
                  </div>
                  <div className="oa-form-group" style={{ marginTop: '0.5rem' }}>
                    <label>Features (one per line)</label>
                    <textarea rows="4" value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })} placeholder={"1 Website\nStandard Templates\n24/7 Support"} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="submit" className="oa-btn oa-btn-primary">{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
                    <button type="button" className="oa-btn oa-btn-outline" onClick={resetPlanForm}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {plansLoading ? (
              <p className="oa-empty">Loading plans...</p>
            ) : plans.length === 0 ? (
              <p className="oa-empty">No plans created yet. Add your first plan above.</p>
            ) : (
              <>
                <div className="oa-table-wrap">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>Plan Name</th>
                        <th>Tier</th>
                        <th>Cycle</th>
                        <th>Price</th>
                        <th>Razorpay Plan ID</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map(p => (
                        <tr key={p.id}>
                          <td data-label="Name">
                            {p.plan_name}
                            {p.is_popular ? <span className="oa-badge oa-badge-popular" style={{ marginLeft: '0.5rem' }}>Popular</span> : ''}
                          </td>
                          <td data-label="Tier">
                            <span className="oa-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                              {TIER_LABELS[p.plan_tier] || `Tier ${p.plan_tier || 1}`}
                            </span>
                          </td>
                          <td data-label="Cycle">{p.billing_cycle}</td>
                          <td data-label="Price">₹{p.display_price}</td>
                          <td data-label="Plan ID" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.razorpay_plan_id}</td>
                          <td data-label="Status">
                            <span className={`oa-badge ${p.is_active ? 'oa-badge-green' : 'oa-badge-red'}`}>
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td data-label="Actions">
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="oa-btn-sm oa-btn-edit" onClick={() => handleEditPlan(p)}>Edit</button>
                              <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleTogglePlan(p)}>
                                {p.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeletePlan(p)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="oa-card-list-mobile">
                  {plans.map(p => (
                    <div className="oa-user-card" key={p.id}>
                      <div className="oa-user-card-header">
                        <div>
                          <div className="oa-user-card-name">
                            {p.plan_name}
                            {p.is_popular ? <span className="oa-badge oa-badge-popular" style={{ marginLeft: '0.5rem' }}>Popular</span> : ''}
                          </div>
                          <div className="oa-user-card-email">
                            <span className="oa-badge" style={{ background: '#e0e7ff', color: '#3730a3', marginRight: '0.5rem' }}>{TIER_LABELS[p.plan_tier] || `Tier ${p.plan_tier || 1}`}</span>
                            {p.billing_cycle} - ₹{p.display_price}
                          </div>
                          <div className="oa-user-card-email" style={{ fontFamily: 'monospace' }}>{p.razorpay_plan_id}</div>
                        </div>
                        <span className={`oa-badge ${p.is_active ? 'oa-badge-green' : 'oa-badge-red'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="oa-user-card-footer">
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="oa-btn-sm oa-btn-edit" onClick={() => handleEditPlan(p)}>Edit</button>
                          <button className="oa-btn-sm oa-btn-toggle" onClick={() => handleTogglePlan(p)}>
                            {p.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button className="oa-btn-sm oa-btn-danger" onClick={() => handleDeletePlan(p)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="oa-section">
          <div className="oa-card">
            <h3>Payment Settings</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Manage your Razorpay public key here. The secret key is managed securely via Cloudflare secrets.
            </p>

            {settingsLoading ? (
              <p className="oa-empty">Loading settings...</p>
            ) : (
              <form onSubmit={handleSettingsSave}>
                <div className="oa-form-group">
                  <label>Razorpay Key ID (Public Key)</label>
                  <input
                    type="text"
                    value={settingsForm.razorpay_key_id}
                    onChange={e => setSettingsForm({ ...settingsForm, razorpay_key_id: e.target.value })}
                    placeholder="e.g. rzp_live_XXXXXXXXXX"
                  />
                  <p className="oa-form-hint">This is your Razorpay public key (starts with rzp_live_ or rzp_test_). It is safe to store here as it is meant to be public.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>Razorpay Key Secret</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">The secret key is managed via Cloudflare environment secrets (RAZORPAY_KEY_SECRET). Update it in your Cloudflare Workers dashboard.</p>
                </div>
                <div className="oa-form-group" style={{ marginTop: '1rem' }}>
                  <label>Razorpay Webhook Secret</label>
                  <input type="text" disabled value="••••••••••••••••" style={{ background: '#f1f5f9' }} />
                  <p className="oa-form-hint">The webhook secret is managed via Cloudflare environment secrets (RAZORPAY_WEBHOOK_SECRET). Set up a webhook in Razorpay dashboard pointing to your /api/payments/webhook endpoint.</p>
                </div>
                <button type="submit" className="oa-btn oa-btn-primary" style={{ marginTop: '1rem' }}>Save Settings</button>
              </form>
            )}
          </div>

          <div className="oa-card" style={{ marginTop: '1rem' }}>
            <h3>Setup Instructions</h3>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.7 }}>
              <p><strong>Step 1:</strong> Go to Razorpay Dashboard → Subscriptions → Plans</p>
              <p><strong>Step 2:</strong> Create plans for each tier and billing cycle (e.g., Basic Monthly, Basic Yearly, etc.)</p>
              <p><strong>Step 3:</strong> Copy the Plan ID (e.g., plan_XXXXXX) for each plan</p>
              <p><strong>Step 4:</strong> Go to the "Plans" tab above and add each plan with its Razorpay Plan ID</p>
              <p><strong>Step 5:</strong> Enter your Razorpay public key above</p>
              <p><strong>Step 6:</strong> In Razorpay Dashboard → Settings → Webhooks, add your webhook URL: <code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>https://yourdomain.com/api/payments/webhook</code></p>
              <p><strong>Step 7:</strong> Select webhook events: subscription.activated, subscription.charged, subscription.cancelled</p>
              <p><strong>Step 8:</strong> Add the webhook secret to Cloudflare as RAZORPAY_WEBHOOK_SECRET</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
