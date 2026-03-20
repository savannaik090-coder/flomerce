import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import { getOrders, updateOrderStatus, getReturns, updateReturn } from '../../services/orderService.js';

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
  if (s === 'packed') return '#7c3aed';
  if (s === 'shipped') return '#0284c7';
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
  if (s === 'packed') return 'Packed';
  if (s === 'shipped') return 'Shipped';
  if (s === 'delivered') return 'Delivered';
  if (s === 'cancelled') return 'Cancelled';
  return status || 'Pending';
}

export default function OrdersSection() {
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount } = useCurrency();
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
  const [confirming, setConfirming] = useState(false);

  const [activeView, setActiveView] = useState('orders');
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnStatusFilter, setReturnStatusFilter] = useState('all');
  const [returnModal, setReturnModal] = useState(null);
  const [returnAction, setReturnAction] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnRefundAmount, setReturnRefundAmount] = useState('');
  const [returnUpdating, setReturnUpdating] = useState(false);

  const returnsEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.returnsEnabled === true;
    } catch { return false; }
  })();

  useEffect(() => {
    if (siteConfig?.id) loadOrders();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (activeView === 'returns' && siteConfig?.id) loadReturns();
  }, [activeView, siteConfig?.id]);

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

  async function loadReturns() {
    setReturnsLoading(true);
    try {
      const res = await getReturns(siteConfig.id);
      setReturns((res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error('Error loading returns:', err);
    } finally {
      setReturnsLoading(false);
    }
  }

  async function handleReturnAction() {
    if (!returnModal || !returnAction) return;
    setReturnUpdating(true);
    try {
      await updateReturn(returnModal.id, {
        siteId: siteConfig.id,
        status: returnAction,
        adminNote: returnNote || undefined,
        refundAmount: returnRefundAmount ? parseFloat(returnRefundAmount) : undefined,
      });
      setReturns(prev => prev.map(r => r.id === returnModal.id ? { ...r, status: returnAction, admin_note: returnNote, refund_amount: returnRefundAmount ? parseFloat(returnRefundAmount) : r.refund_amount } : r));
      setReturnModal(null);
      setReturnAction('');
      setReturnNote('');
      setReturnRefundAmount('');
    } catch (err) {
      alert('Failed to update return: ' + err.message);
    } finally {
      setReturnUpdating(false);
    }
  }

  async function handleStatusUpdate(orderId, newStatus) {
    try {
      await updateOrderStatus(orderId, newStatus, siteConfig?.id);
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
      await updateOrderStatus(cancelModal.id, 'cancelled', siteConfig?.id, { cancellationReason: finalReason });
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

  const statuses = ['all', 'pending', 'pending_payment', 'paid', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

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

  if (loading && activeView === 'orders') return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const getReturnStatusColor = (s) => {
    const colors = { requested: '#ff9800', approved: '#2196f3', rejected: '#e53935', refunded: '#27ae60' };
    return colors[s] || '#757575';
  };
  const getReturnStatusLabel = (s) => {
    const labels = { requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded' };
    return labels[s] || s || 'Unknown';
  };

  const returnStatuses = ['all', 'requested', 'approved', 'rejected', 'refunded'];
  const filteredReturns = returns.filter(r => returnStatusFilter === 'all' || r.status === returnStatusFilter);

  return (
    <div>
      {returnsEnabled && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          <button onClick={() => setActiveView('orders')} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeView === 'orders' ? '#0f172a' : '#f8fafc', color: activeView === 'orders' ? '#fff' : '#64748b', transition: '0.2s' }}>
            Orders
          </button>
          <button onClick={() => setActiveView('returns')} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeView === 'returns' ? '#0f172a' : '#f8fafc', color: activeView === 'returns' ? '#fff' : '#64748b', transition: '0.2s' }}>
            Returns {returns.length > 0 ? `(${returns.length})` : ''}
          </button>
        </div>
      )}

      {activeView === 'returns' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="tabs" style={{ flexWrap: 'wrap', margin: 0 }}>
              {returnStatuses.map(s => {
                const count = s === 'all' ? returns.length : returns.filter(r => r.status === s).length;
                if (s !== 'all' && count === 0) return null;
                return (
                  <button key={s} className={`tab${returnStatusFilter === s ? ' active' : ''}`} onClick={() => setReturnStatusFilter(s)}>
                    {getReturnStatusLabel(s)} ({count})
                  </button>
                );
              })}
            </div>
            <button className="btn btn-outline" onClick={loadReturns} style={{ flexShrink: 0 }}>
              <i className="fas fa-sync-alt" /> Refresh
            </button>
          </div>

          {returnsLoading ? (
            <div className="loading-spinner-admin"><div className="spinner" /></div>
          ) : filteredReturns.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-undo-alt" />
              <h3>No return requests</h3>
              <p>Return requests from customers will appear here.</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-content" style={{ padding: 0 }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 110 }}>Order #</th>
                        <th style={{ minWidth: 150 }}>Customer</th>
                        <th style={{ minWidth: 150 }}>Reason</th>
                        <th style={{ minWidth: 100 }}>Status</th>
                        <th style={{ minWidth: 100 }}>Refund</th>
                        <th style={{ minWidth: 100 }}>Date</th>
                        <th style={{ minWidth: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReturns.map(ret => (
                        <tr key={ret.id}>
                          <td style={{ fontWeight: 600 }}>#{ret.order_number || ret.order_id?.slice(-6)}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{ret.customer_name || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{ret.customer_email || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{ret.reason}</div>
                            {ret.reason_detail && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{ret.reason_detail}</div>}
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', background: getReturnStatusColor(ret.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                              {getReturnStatusLabel(ret.status)}
                            </span>
                          </td>
                          <td>{ret.refund_amount ? formatAmount(ret.refund_amount) : '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(ret.created_at).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {ret.status === 'requested' && (
                                <>
                                  <button className="btn btn-sm btn-success" onClick={() => { setReturnModal(ret); setReturnAction('approved'); setReturnNote(''); setReturnRefundAmount(''); }} title="Approve">
                                    <i className="fas fa-check" />
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => { setReturnModal(ret); setReturnAction('rejected'); setReturnNote(''); }} title="Reject">
                                    <i className="fas fa-times" />
                                  </button>
                                </>
                              )}
                              {ret.status === 'approved' && (
                                <button className="btn btn-sm" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }} onClick={() => { setReturnModal(ret); setReturnAction('refunded'); setReturnNote(''); setReturnRefundAmount(ret.refund_amount || ''); }} title="Mark Refunded">
                                  Refund
                                </button>
                              )}
                              {ret.admin_note && (
                                <span title={ret.admin_note} style={{ cursor: 'help', fontSize: 14, color: '#94a3b8' }}>
                                  <i className="fas fa-comment-alt" />
                                </span>
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

          {returnModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 440, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#1a1a1a' }}>
                  {returnAction === 'approved' ? 'Approve' : returnAction === 'rejected' ? 'Reject' : 'Process Refund for'} Return
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666' }}>
                  Order <strong>#{returnModal.order_number}</strong> - {returnModal.customer_name}
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Reason from customer</label>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
                    {returnModal.reason}{returnModal.reason_detail ? ` - ${returnModal.reason_detail}` : ''}
                  </div>
                </div>
                {returnAction === 'refunded' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Refund Amount</label>
                    <input type="number" step="0.01" value={returnRefundAmount} onChange={e => setReturnRefundAmount(e.target.value)} placeholder="Enter refund amount" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Admin Note (sent to customer)</label>
                  <textarea value={returnNote} onChange={e => setReturnNote(e.target.value)} rows={3} placeholder="Optional note for the customer..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setReturnModal(null); setReturnAction(''); }} disabled={returnUpdating} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  <button onClick={handleReturnAction} disabled={returnUpdating || (returnAction === 'refunded' && !returnRefundAmount)} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: returnAction === 'rejected' ? '#e53935' : returnAction === 'refunded' ? '#2563eb' : '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: returnUpdating ? 0.7 : 1 }}>
                    {returnUpdating ? 'Processing...' : returnAction === 'approved' ? 'Approve Return' : returnAction === 'rejected' ? 'Reject Return' : 'Mark Refunded'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
      <>
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
                    <th style={{ width: 32, minWidth: 32 }}></th>
                    <th style={{ minWidth: 110 }}>Order #</th>
                    <th style={{ minWidth: 180 }}>Customer</th>
                    <th style={{ minWidth: 140 }}>Phone</th>
                    <th style={{ minWidth: 80 }}>Items</th>
                    <th style={{ minWidth: 100 }}>Total</th>
                    <th style={{ minWidth: 150 }}>Payment Method</th>
                    <th style={{ minWidth: 130 }}>Order Status</th>
                    <th style={{ minWidth: 100 }}>Date</th>
                    <th style={{ minWidth: 100 }}>Actions</th>
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
                          <td style={{ whiteSpace: 'nowrap' }}>{order.customer_phone || '—'}</td>
                          <td>{items.length > 0 ? `${items.length} item${items.length !== 1 ? 's' : ''}` : '—'}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatAmount(parseFloat(order.total || order.total_amount || 0))}</td>
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
                              {!isCancelled && !isDelivered && statusLower !== 'confirmed' && statusLower !== 'packed' && statusLower !== 'shipped' && (
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
                                  style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                                  onClick={() => setConfirmDialog({ orderId: order.id, orderNum, action: 'packed', label: 'Mark this order as packed?' })}
                                  title="Mark as Packed"
                                >
                                  Packed
                                </button>
                              )}
                              {statusLower === 'packed' && (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                                  onClick={() => setConfirmDialog({ orderId: order.id, orderNum, action: 'shipped', label: 'Mark this order as shipped?' })}
                                  title="Mark as Shipped"
                                >
                                  Shipped
                                </button>
                              )}
                              {statusLower === 'shipped' && (
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
                                        {item.selectedOptions && (() => {
                                          const parts = [];
                                          if (item.selectedOptions.color) parts.push(`Color: ${item.selectedOptions.color}`);
                                          if (item.selectedOptions.customOptions) {
                                            for (const [label, value] of Object.entries(item.selectedOptions.customOptions)) {
                                              parts.push(`${label}: ${value}`);
                                            }
                                          }
                                          if (item.selectedOptions.pricedOptions) {
                                            for (const [label, val] of Object.entries(item.selectedOptions.pricedOptions)) {
                                              const priceSuffix = Number(val.price || 0) > 0 ? ` (${formatAmount(Number(val.price))})` : '';
                                              parts.push(`${label}: ${val.name}${priceSuffix}`);
                                            }
                                          }
                                          return parts.length > 0 ? <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{parts.join(' \u2022 ')}</div> : null;
                                        })()}
                                        <div style={{ fontSize: 12, color: '#555' }}>
                                          {formatAmount(parseFloat(item.price || 0))} x {item.quantity}
                                          <span style={{ fontWeight: 600, marginLeft: 6 }}>= {formatAmount(parseFloat((item.price || 0) * (item.quantity || 1)))}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )) : <div style={{ color: '#999', fontSize: 13 }}>No item details available</div>}
                                  <div style={{ paddingTop: 8, borderTop: '2px solid #eee', textAlign: 'right' }}>
                                    {parseFloat(order.discount || 0) > 0 && (
                                      <>
                                        <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                                          Subtotal: {formatAmount(parseFloat(order.subtotal || order.total || 0))}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                                          Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{formatAmount(parseFloat(order.discount || 0))}
                                        </div>
                                      </>
                                    )}
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                                      Total: {formatAmount(parseFloat(order.total || 0))}
                                    </div>
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
                disabled={confirming}
                style={{ padding: '9px 22px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: confirming ? 'not-allowed' : 'pointer', fontSize: 14, opacity: confirming ? 0.6 : 1 }}
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  setConfirming(true);
                  await handleStatusUpdate(confirmDialog.orderId, confirmDialog.action);
                  setConfirming(false);
                  setConfirmDialog(null);
                }}
                disabled={confirming}
                style={{ padding: '9px 22px', borderRadius: 6, border: 'none', background: confirmDialog.action === 'delivered' ? '#27ae60' : '#2196f3', color: '#fff', cursor: confirming ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {confirming ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'admin-spin 0.7s linear infinite' }} />
                    Processing...
                  </>
                ) : (
                  `Yes, ${confirmDialog.action === 'delivered' ? 'Mark Delivered' : 'Confirm Order'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </>
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
