import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';

export default function OrdersSection({ site }) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (site?.id) loadOrders();
  }, [site?.id]);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/orders?siteId=${site.id}`);
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
      await apiRequest(`/api/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
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

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div className="sa-search-bar">
        <input
          type="text"
          placeholder="Search orders by ID or customer..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-outline" onClick={loadOrders}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      <div className="sa-tabs">
        {statuses.map(s => {
          const count = s === 'all' ? orders.length : orders.filter(o => (o.status || '').toLowerCase() === s).length;
          return (
            <button key={s} className={`sa-tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="sa-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          <h3>No orders found</h3>
          <p>{searchTerm ? 'Try a different search term.' : 'No orders match the selected filter.'}</p>
        </div>
      ) : (
        <div className="sa-card">
          <div className="sa-card-content" style={{ padding: 0 }}>
            <div className="sa-table-wrap">
              <table className="sa-table">
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
                      <td>{order.email || order.customer_email || '\u2014'}</td>
                      <td>{(order.items || []).length || '\u2014'}</td>
                      <td>{'\u20B9'}{parseFloat(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td>{order.payment_method || order.paymentMethod || '\u2014'}</td>
                      <td>
                        <span className={`sa-status-badge sa-status-${(order.status || 'new').toLowerCase()}`}>
                          {order.status || 'New'}
                        </span>
                      </td>
                      <td>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(order.status || '').toLowerCase() !== 'confirmed' && (order.status || '').toLowerCase() !== 'delivered' && (
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleStatusUpdate(order.id, 'confirmed')}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                          )}
                          {(order.status || '').toLowerCase() !== 'cancelled' && (
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
