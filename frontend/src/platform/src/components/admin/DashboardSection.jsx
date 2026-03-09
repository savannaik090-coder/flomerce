import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';

export default function DashboardSection({ site }) {
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState({ orders: 0, revenue: 0, customers: 0, inventory: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (site?.id) loadDashboard();
  }, [site?.id, period]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        apiRequest(`/api/orders?siteId=${site.id}`).catch(() => ({ data: [] })),
        apiRequest(`/api/products?siteId=${site.id}`).catch(() => ({ data: [] })),
      ]);

      const orders = ordersRes.data || ordersRes.orders || [];
      const products = productsRes.data || productsRes.products || [];

      const now = new Date();
      let filtered = orders;
      if (period === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = orders.filter(o => new Date(o.created_at || o.createdAt) >= start);
      } else if (period === 'week') {
        const start = new Date(now.getTime() - 7 * 86400000);
        filtered = orders.filter(o => new Date(o.created_at || o.createdAt) >= start);
      } else if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = orders.filter(o => new Date(o.created_at || o.createdAt) >= start);
      }

      const revenue = filtered.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
      const uniqueCustomers = new Set(filtered.map(o => o.email || o.customer_email || o.user_id)).size;
      const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);

      setStats({ orders: filtered.length, revenue, customers: uniqueCustomers, inventory: totalStock });
      setPendingOrders(orders.filter(o => (o.status || '').toLowerCase() === 'pending' || (o.status || '').toLowerCase() === 'new').slice(0, 5));
      setRecentOrders(orders.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 10));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div className="sa-period-selector">
        {['today', 'week', 'month', 'all'].map(p => (
          <button key={p} className={`sa-period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="sa-stats-grid">
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Orders</span>
            <div className="sa-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.orders}</div>
          <div className="sa-stat-change">{period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'Total'}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Revenue</span>
            <div className="sa-stat-icon" style={{ background: '#f0fdf4', color: '#059669' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{'\u20B9'}{stats.revenue.toLocaleString('en-IN')}</div>
          <div className="sa-stat-change">{period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'Total'}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Customers</span>
            <div className="sa-stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.customers}</div>
          <div className="sa-stat-change">Unique buyers</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-header">
            <span className="sa-stat-title">Inventory</span>
            <div className="sa-stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            </div>
          </div>
          <div className="sa-stat-value">{stats.inventory}</div>
          <div className="sa-stat-change">Total stock</div>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="sa-card">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Pending Orders</h3>
            <span className="sa-status-badge sa-status-pending">{pendingOrders.length} pending</span>
          </div>
          <div className="sa-card-content">
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(order => (
                    <tr key={order.id}>
                      <td>#{(order.id || '').toString().slice(-6)}</td>
                      <td>{order.customer_name || order.name || order.email || 'Guest'}</td>
                      <td>{'\u20B9'}{parseFloat(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                      <td><span className="sa-status-badge sa-status-pending">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="sa-card">
        <div className="sa-card-header">
          <h3 className="sa-card-title">Recent Orders</h3>
        </div>
        <div className="sa-card-content">
          {recentOrders.length === 0 ? (
            <div className="sa-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <h3>No orders yet</h3>
              <p>Orders will appear here once customers start purchasing.</p>
            </div>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id}>
                      <td>#{(order.id || '').toString().slice(-6)}</td>
                      <td>{order.customer_name || order.name || order.email || 'Guest'}</td>
                      <td>{(order.items || []).length || '\u2014'}</td>
                      <td>{'\u20B9'}{parseFloat(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`sa-status-badge sa-status-${(order.status || 'new').toLowerCase()}`}>{order.status || 'New'}</span></td>
                      <td>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
