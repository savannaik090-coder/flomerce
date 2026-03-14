import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders, updateOrderStatus } from '../../services/orderService.js';

export default function OrdersSection() {
  const { siteConfig } = useContext(SiteContext);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

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

  function toggleExpand(orderId) {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  }

  const statuses = ['all', 'new', 'pending', 'pending_payment', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  const filtered = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter;
    const matchesSearch = !searchTerm ||
      (o.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.order_number || o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name || o.name || o.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_email || o.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function getStatusColor(status) {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'confirmed' || s === 'delivered') return '#25ab00';
    if (s === 'shipped') return '#2196f3';
    if (s === 'cancelled') return '#e53935';
    if (s === 'pending_payment' || s === 'pending') return '#ff9800';
    return '#757575';
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by order ID, number, customer name, email or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-outline" onClick={loadOrders}>
          <i className="fas fa-sync-alt" /> Refresh
        </button>
      </div>

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {statuses.map(s => {
          const count = s === 'all' ? orders.length : orders.filter(o => (o.status || '').toLowerCase() === s).length;
          if (s !== 'all' && count === 0) return null;
          return (
            <button key={s} className={`tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'pending_payment' ? 'Pending Payment' : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
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
                    <th style={{ width: 32 }}></th>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const address = order.shipping_address || {};
                    const isExpanded = expandedOrderId === order.id;
                    const orderNum = order.order_number || order.orderNumber || order.id?.slice(-6);

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          onClick={() => toggleExpand(order.id)}
                          style={{ cursor: 'pointer', background: isExpanded ? '#fafafa' : undefined }}
                        >
                          <td style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
                            {isExpanded ? '▲' : '▼'}
                          </td>
                          <td style={{ fontWeight: 600 }}>#{orderNum}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{order.customer_name || order.name || 'Guest'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{order.customer_email || order.email || '—'}</div>
                          </td>
                          <td>{order.customer_phone || '—'}</td>
                          <td>{items.length > 0 ? items.length : '—'}</td>
                          <td style={{ fontWeight: 600 }}>₹{parseFloat(order.total || order.total_amount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textTransform: 'capitalize' }}>{order.payment_method || order.paymentMethod || '—'}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              background: getStatusColor(order.status),
                              color: '#fff',
                              borderRadius: 12,
                              padding: '2px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              whiteSpace: 'nowrap',
                            }}>
                              {(order.status || 'new').replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {!['confirmed', 'delivered', 'paid'].includes((order.status || '').toLowerCase()) && (
                                <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(order.id, 'confirmed')} title="Confirm">
                                  <i className="fas fa-check" />
                                </button>
                              )}
                              {(order.status || '').toLowerCase() !== 'shipped' && !['delivered', 'cancelled'].includes((order.status || '').toLowerCase()) && (
                                <button className="btn btn-sm btn-outline" onClick={() => handleStatusUpdate(order.id, 'shipped')} title="Mark Shipped" style={{ fontSize: 11 }}>
                                  Ship
                                </button>
                              )}
                              {(order.status || '').toLowerCase() !== 'cancelled' && (
                                <button className="btn btn-sm btn-danger" onClick={() => handleStatusUpdate(order.id, 'cancelled')} title="Cancel">
                                  <i className="fas fa-times" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: '#f9f9f9' }}>
                            <td colSpan={10} style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
                              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

                                <div style={{ flex: 1, minWidth: 220 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Items</div>
                                  {items.length > 0 ? items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                                      {(item.thumbnail || item.image) && (
                                        <img src={item.thumbnail || item.image} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} />
                                      )}
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                                        {item.variant && <div style={{ fontSize: 11, color: '#888' }}>{item.variant}</div>}
                                        <div style={{ fontSize: 12, color: '#555' }}>
                                          ₹{parseFloat(item.price || 0).toLocaleString('en-IN')} × {item.quantity}
                                          <span style={{ fontWeight: 600, marginLeft: 6 }}>= ₹{parseFloat((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )) : <div style={{ color: '#999', fontSize: 13 }}>No item details available</div>}
                                  <div style={{ fontWeight: 700, textAlign: 'right', paddingTop: 6, borderTop: '2px solid #eee', fontSize: 14 }}>
                                    Total: ₹{parseFloat(order.total || 0).toLocaleString('en-IN')}
                                  </div>
                                </div>

                                <div style={{ minWidth: 200 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shipping Address</div>
                                  {address && Object.keys(address).length > 0 ? (
                                    <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                                      <div style={{ fontWeight: 600 }}>{address.name || order.customer_name}</div>
                                      {address.phone && <div>📞 {address.phone}</div>}
                                      {address.address && <div>{address.address}</div>}
                                      {(address.city || address.state) && <div>{[address.city, address.state].filter(Boolean).join(', ')}{address.pinCode ? ' - ' + address.pinCode : ''}</div>}
                                    </div>
                                  ) : (
                                    <div style={{ color: '#999', fontSize: 13 }}>No address on file</div>
                                  )}
                                </div>

                                <div style={{ minWidth: 180 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</div>
                                  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                                    <div><span style={{ color: '#888' }}>Method:</span> {order.payment_method || '—'}</div>
                                    <div><span style={{ color: '#888' }}>Status:</span> {order.payment_status || order.status || '—'}</div>
                                    {order.razorpay_payment_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Payment ID:</span> {order.razorpay_payment_id}</div>}
                                    {order.razorpay_order_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Razorpay Order:</span> {order.razorpay_order_id}</div>}
                                    {order.notes && <div><span style={{ color: '#888' }}>Notes:</span> {order.notes}</div>}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
