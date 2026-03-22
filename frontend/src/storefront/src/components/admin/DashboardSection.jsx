import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders } from '../../services/orderService.js';
import { getProducts } from '../../services/productService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import { parseAsUTC, formatDateShortForAdmin, getStartOfDayInTimezone, getStartOfMonthInTimezone } from '../../utils/dateFormatter.js';

export default function DashboardSection() {
  const { siteConfig } = useContext(SiteContext);
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState({ orders: 0, revenue: 0, customers: 0, inventory: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadDashboard();
  }, [siteConfig?.id, period]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        getOrders(siteConfig.id).catch(() => ({ data: [] })),
        getProducts(siteConfig.id).catch(() => ({ data: [] })),
      ]);

      const orders = ordersRes.data || ordersRes.orders || [];
      const products = productsRes.data || productsRes.products || [];

      const tz = siteConfig?.settings?.timezone;
      let filtered = orders;
      if (period === 'today') {
        const start = getStartOfDayInTimezone(tz);
        filtered = orders.filter(o => (parseAsUTC(o.created_at || o.createdAt) || new Date(0)) >= start);
      } else if (period === 'week') {
        const start = new Date(getStartOfDayInTimezone(tz).getTime() - 6 * 86400000);
        filtered = orders.filter(o => (parseAsUTC(o.created_at || o.createdAt) || new Date(0)) >= start);
      } else if (period === 'month') {
        const start = getStartOfMonthInTimezone(tz);
        filtered = orders.filter(o => (parseAsUTC(o.created_at || o.createdAt) || new Date(0)) >= start);
      }

      const revenue = filtered.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
      const uniqueCustomers = new Set(filtered.map(o => o.email || o.customer_email || o.user_id)).size;
      const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);

      setStats({
        orders: filtered.length,
        revenue,
        customers: uniqueCustomers,
        inventory: totalStock,
      });

      setPendingOrders(orders.filter(o => (o.status || '').toLowerCase() === 'pending' || (o.status || '').toLowerCase() === 'new').slice(0, 5));
      setRecentOrders(orders.sort((a, b) => (parseAsUTC(b.created_at || b.createdAt) || new Date(0)) - (parseAsUTC(a.created_at || a.createdAt) || new Date(0))).slice(0, 10));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading-spinner-admin"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="period-selector">
        {['today', 'week', 'month', 'all'].map(p => (
          <button key={p} className={`period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-orders">
          <div className="stat-header">
            <span className="stat-title">Orders</span>
            <div className="stat-icon"><i className="fas fa-shopping-bag" /></div>
          </div>
          <div className="stat-value">{stats.orders}</div>
          <div className="stat-change">{period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'Total'}</div>
        </div>
        <div className="stat-card stat-revenue">
          <div className="stat-header">
            <span className="stat-title">Revenue</span>
            <div className="stat-icon"><i className="fas fa-rupee-sign" /></div>
          </div>
          <div className="stat-value">{formatPrice(stats.revenue, getAdminCurrency(siteConfig))}</div>
          <div className="stat-change">{period === 'today' ? 'Today' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'Total'}</div>
        </div>
        <div className="stat-card stat-customers">
          <div className="stat-header">
            <span className="stat-title">Customers</span>
            <div className="stat-icon"><i className="fas fa-users" /></div>
          </div>
          <div className="stat-value">{stats.customers}</div>
          <div className="stat-change">Unique buyers</div>
        </div>
        <div className="stat-card stat-inventory">
          <div className="stat-header">
            <span className="stat-title">Inventory</span>
            <div className="stat-icon"><i className="fas fa-boxes" /></div>
          </div>
          <div className="stat-value">{stats.inventory}</div>
          <div className="stat-change">Total stock</div>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Orders</h3>
            <span className="status-badge status-pending">{pendingOrders.length} pending</span>
          </div>
          <div className="card-content">
            <div className="table-container">
              <table>
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
                      <td>{formatPrice(parseFloat(order.total || order.total_amount || 0), order.currency || getAdminCurrency(siteConfig))}</td>
                      <td>{formatDateShortForAdmin(order.created_at || order.createdAt, siteConfig?.settings?.timezone)}</td>
                      <td><span className="status-badge status-pending">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Orders</h3>
        </div>
        <div className="card-content">
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-shopping-bag" />
              <h3>No orders yet</h3>
              <p>Orders will appear here once customers start purchasing.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
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
                      <td>{(order.items || []).length || '—'}</td>
                      <td>{formatPrice(parseFloat(order.total || order.total_amount || 0), order.currency || getAdminCurrency(siteConfig))}</td>
                      <td><span className={`status-badge status-${(order.status || 'new').toLowerCase()}`}>{order.status || 'New'}</span></td>
                      <td>{formatDateShortForAdmin(order.created_at || order.createdAt, siteConfig?.settings?.timezone)}</td>
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
