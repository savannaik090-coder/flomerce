import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders, updateOrderStatus } from '../../services/orderService.js';

const CANCEL_REASONS = [
  'Item out of stock',
  'Customer requested cancellation',
  'Duplicate order',
  'Suspected fraud',
  'Other',
];

function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return '#27ae60';
  if (s === 'confirmed' || s === 'paid') return '#2196f3';
  if (s === 'cancelled') return '#e53935';
  if (s === 'pending_payment') return '#ff9800';
  return '#757575';
}

function getStatusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s === 'pending_payment') return 'Awaiting Payment';
  if (s === 'paid') return 'Paid';
  if (s === 'pending') return 'Pending';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'delivered') return 'Delivered';
  if (s === 'cancelled') return 'Cancelled';
  return status || 'Pending';
}

export default function OrdersSection() {
  const { siteConfig } = useContext(SiteContext);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);

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

  function openCancelModal(order) {
    setCancelModal(order);
    setCancelReason('');
    setCancelCustomReason('');
  }

  function closeCancelModal() {
    setCancelModal(null);
    setCancelReason('');
    setCancelCustomReason('');
  }

  async function confirmCancellation() {
    if (!cancelReason) {
      alert('Please select a cancellation reason.');
      return;
    }
    const finalReason = cancelReason === 'Other' ? cancelCustomReason.trim() : cancelReason;
    if (cancelReason === 'Other' && !finalReason) {
      alert('Please enter a specific cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      await updateOrderStatus(cancelModal.id, 'cancelled', { cancellationReason: finalReason });
      setOrders(prev => prev.map(o => o.id === cancelModal.id ? { ...o, status: 'cancelled', cancellation_reason: finalReason } : o));
      closeCancelModal();
    } catch (err) {
      alert('Failed to cancel order: ' + err.message);
    } finally {
      setCancelling(false);
    }
  }

  function toggleExpand(orderId) {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  }

  const statuses = ['all', 'pending', 'pending_payment', 'paid', 'confirmed', 'delivered', 'cancelled'];

  const filtered = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || (o.status || '').toLowerCase() === statusFilter;
    const matchesSearch = !searchTerm ||
      (o.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.order_number || o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name || o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_email || o.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by order number, customer name, email or phone..."
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
              {getStatusLabel(s)} ({count})
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
                    <th>Payment Method</th>
                    <th>Order Status</th>
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
                    const statusLower = (order.status || '').toLowerCase();
                    const isCancelled = statusLower === 'cancelled';
                    const isDelivered = statusLower === 'delivered';

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
                          <td style={{ textTransform: 'capitalize' }}>
                            {order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || '—')}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              background: getStatusColor(order.status),
                              color: '#fff',
                              borderRadius: 12,
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {!isCancelled && !isDelivered && statusLower !== 'confirmed' && (
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => setConfirmDialog({ orderId: order.id, orderNum, action: 'confirmed', label: 'Confirm this order?' })}
                                  title="Confirm Order"
                                >
                                  <i className="fas fa-check" />
                                </button>
                              )}
                              {statusLower === 'confirmed' && (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                                  onClick={() => setConfirmDialog({ orderId: order.id, orderNum, action: 'delivered', label: 'Mark this order as delivered?' })}
                                  title="Mark as Delivered"
                                >
                                  Delivered
                                </button>
                              )}
                              {!isCancelled && !isDelivered && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => openCancelModal(order)}
                                  title="Cancel Order"
                                >
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
                                      {(address.city || address.state) && <div>{[address.city, address.state].filter(Boolean).join(', ')}{address.pinCode ? ' – ' + address.pinCode : ''}</div>}
                                    </div>
                                  ) : (
                                    <div style={{ color: '#999', fontSize: 13 }}>No address on file</div>
                                  )}
                                </div>

                                <div style={{ minWidth: 180 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</div>
                                  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                                    <div><span style={{ color: '#888' }}>Method:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || '—')}</div>
                                    {order.razorpay_payment_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Payment ID:</span> {order.razorpay_payment_id}</div>}
                                    {order.razorpay_order_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Razorpay Order:</span> {order.razorpay_order_id}</div>}
                                    {order.notes && <div><span style={{ color: '#888' }}>Notes:</span> {order.notes}</div>}
                                  </div>
                                  {isCancelled && order.cancellation_reason && (
                                    <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff5f5', borderLeft: '3px solid #e53935', borderRadius: 4 }}>
                                      <div style={{ fontSize: 11, color: '#e53935', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cancellation Reason</div>
                                      <div style={{ fontSize: 13, color: '#333' }}>{order.cancellation_reason}</div>
                                    </div>
                                  )}
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

      {confirmDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 380, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              {confirmDialog.action === 'delivered' ? '📦' : '✅'}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: '#1a1a1a' }}>Are you sure?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#666' }}>
              {confirmDialog.label} <strong>#{confirmDialog.orderNum}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ padding: '9px 22px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  await handleStatusUpdate(confirmDialog.orderId, confirmDialog.action);
                  setConfirmDialog(null);
                }}
                style={{ padding: '9px 22px', borderRadius: 6, border: 'none', background: confirmDialog.action === 'delivered' ? '#27ae60' : '#2196f3', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Yes, {confirmDialog.action === 'delivered' ? 'Mark Delivered' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 440, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#1a1a1a' }}>Cancel Order #{cancelModal.order_number || cancelModal.id?.slice(-6)}</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666' }}>Select a reason for cancellation. Both you and the customer will receive an email.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {CANCEL_REASONS.map(reason => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${cancelReason === reason ? '#e53935' : '#e0e0e0'}`, background: cancelReason === reason ? '#fff5f5' : '#fafafa', transition: 'all 0.15s' }}>
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={() => setCancelReason(reason)}
                    style={{ accentColor: '#e53935' }}
                  />
                  <span style={{ fontSize: 14, color: '#333', fontWeight: cancelReason === reason ? 600 : 400 }}>{reason}</span>
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <textarea
                placeholder="Please describe the reason..."
                value={cancelCustomReason}
                onChange={e => setCancelCustomReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1.5px solid #ddd', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit' }}
              />
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={closeCancelModal} disabled={cancelling} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>
                Go Back
              </button>
              <button onClick={confirmCancellation} disabled={cancelling || !cancelReason} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: cancelling || !cancelReason ? '#f5b3b3' : '#e53935', color: '#fff', cursor: cancelling || !cancelReason ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
