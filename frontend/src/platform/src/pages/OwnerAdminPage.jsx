import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import '../styles/dashboard.css';

export default function OwnerAdminPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferMsg, setTransferMsg] = useState(null);
  const [transferring, setTransferring] = useState(false);

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
      setError('Error loading admin data. Please ensure you are logged in as admin.');
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

  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (!transferEmail.trim()) return;
    if (!window.confirm(`Are you sure you want to transfer ownership to ${transferEmail}? You will lose admin access.`)) return;
    setTransferring(true);
    setTransferMsg(null);
    try {
      await apiRequest('/api/admin/transfer-ownership', {
        method: 'POST',
        body: JSON.stringify({ newOwnerEmail: transferEmail.trim() }),
      });
      setTransferMsg({ type: 'success', text: `Ownership transferred to ${transferEmail}. You will be logged out.` });
      setTransferEmail('');
      setTimeout(() => { window.location.href = '/login'; }, 3000);
    } catch (e) {
      setTransferMsg({ type: 'error', text: e.message || 'Failed to transfer ownership' });
    } finally {
      setTransferring(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-admin-container">
        <h1>Owner Admin Panel</h1>
        <div className="card">
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  const users = adminData?.users || [];
  const allSites = adminData?.sites || [];
  const currentOwner = adminData?.currentOwner;

  return (
    <div className="owner-admin-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Owner Admin Panel</h1>
        <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>System Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{allSites.length}</div>
            <div className="stat-label">Total Websites</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ownership</h2>
        {currentOwner && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Current owner: <strong>{currentOwner.name}</strong> ({currentOwner.email})
          </p>
        )}
        <form onSubmit={handleTransferOwnership} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={transferEmail}
            onChange={e => setTransferEmail(e.target.value)}
            placeholder="New owner email..."
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
          />
          <button type="submit" className="btn btn-primary" disabled={transferring} style={{ whiteSpace: 'nowrap' }}>
            {transferring ? 'Transferring...' : 'Transfer Ownership'}
          </button>
        </form>
        {transferMsg && (
          <p style={{ marginTop: 8, fontSize: 13, color: transferMsg.type === 'success' ? '#16a34a' : '#ef4444' }}>
            {transferMsg.text}
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recent Users</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id || u.email}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: u.role === 'owner' ? '#dbeafe' : '#f1f5f9', color: u.role === 'owner' ? '#1d4ed8' : '#64748b', fontWeight: 600 }}>{u.role || 'user'}</span></td>
                  <td>{u.plan || 'free'}</td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                  <td>
                    {u.role !== 'owner' && (
                      <button className="btn-block" onClick={() => handleBlockUser(u.id)}>Block</button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Created Websites</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Site Name</th>
                <th>Subdomain</th>
                <th>User</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allSites.map(s => (
                <tr key={s.id || s.subdomain}>
                  <td>{s.brand_name || s.brandName || s.subdomain}</td>
                  <td>{s.subdomain}.fluxe.in</td>
                  <td>{s.user_id}</td>
                  <td><span className="status-badge status-active">Active</span></td>
                </tr>
              ))}
              {allSites.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No websites found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
