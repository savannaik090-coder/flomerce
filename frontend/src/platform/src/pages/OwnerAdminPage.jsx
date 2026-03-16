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
    plan_name: '', billing_cycle: 'monthly', display_price: '', razorpay_plan_id: '', features: '', is_popular: false, display_order: 0
  });

  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ razorpay_key_id: '' });

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
    setPlanForm({ plan_name: '', billing_cycle: 'monthly', display_price: '', razorpay_plan_id: '', features: '', is_popular: false, display_order: 0 });
    setEditingPlan(null);
    setShowPlanForm(false);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...planForm,
        display_price: parseFloat(planForm.display_price),
        display_order: parseInt(planForm.display_order) || 0,
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
                  <span className="oa-badge">{u.plan || 'free'}</span>
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
                      <td data-label="Plan"><span className="oa-badge">{u.plan || 'free'}</span></td>
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
                    <span className="oa-badge">{u.plan || 'free'}</span>
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
                      <input type="text" value={planForm.plan_name} onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} placeholder="e.g. Basic, Premium, Pro" required />
                    </div>
                    <div className="oa-form-group">
                      <label>Billing Cycle</label>
                      <select value={planForm.billing_cycle} onChange={e => setPlanForm({ ...planForm, billing_cycle: e.target.value })}>
                        <option value="monthly">Monthly</option>
                        <option value="6months">6 Months</option>
                        <option value="yearly">Yearly</option>
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
                          <div className="oa-user-card-email">{p.billing_cycle} - ₹{p.display_price}</div>
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
