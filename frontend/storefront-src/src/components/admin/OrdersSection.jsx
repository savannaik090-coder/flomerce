import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders, updateOrderStatus } from '../../services/orderService.js';

export default function OrdersSection() {
  const { siteConfig } = useContext(SiteContext);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadOrders();
  }, [siteConfig?.id]);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await getOrders(siteConfig.id);
      const data = res.data || res.orders || [];
      setOrders(data.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)));
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  const statuses = ['all', 'new', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  const filtered = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter;
    const matchesSearch = !searchTerm ||
      (o.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name || o.name || o.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search orders by ID or customer..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-outline" onClick={loadOrders}>
          <i className="fas fa-sync-alt" /> Refresh
        </button>
      </div>

      <div className="tabs">
        {statuses.map(s => {
          const count = s === 'all' ? orders.length : orders.filter(o => (o.status || '').toLowerCase() === s).length;
          return (
            <button key={s} className={`tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-shopping-bag" />
          <h3>No orders found</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'No orders match the selected filter.'}</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-content" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>#{(order.id || '').toString().slice(-6)}</td>
                      <td>{order.customer_name || order.name || 'Guest'}</td>
                      <td>{order.email || order.customer_email || '—'}</td>
                      <td>{(order.items || []).length || '—'}</td>
                      <td>₹{parseFloat(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td>{order.payment_method || order.paymentMethod || '—'}</td>
                      <td>
                        <span className={`status-badge status-${(order.status || 'new').toLowerCase()}`}>
                          {order.status || 'New'}
                        </span>
                      </td>
                      <td>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(order.status || '').toLowerCase() !== 'confirmed' && (order.status || '').toLowerCase() !== 'delivered' && (
                            <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(order.id, 'confirmed')}>
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {(order.status || '').toLowerCase() !== 'cancelled' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                              <i className="fas fa-times" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
