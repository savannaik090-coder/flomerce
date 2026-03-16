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
    </div>
  );
}
