import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders, updateOrderStatus, getReturns, updateReturn, getCancellations, updateCancellation } from '../../services/orderService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import { parseAsUTC, formatDateForAdmin, formatDateShortForAdmin } from '../../utils/dateFormatter.js';

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

function parseJsonSafe(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('https://')) return url;
  return null;
}

export default function OrdersSection() {
  const { siteConfig } = useContext(SiteContext);
  const adminCur = getAdminCurrency(siteConfig);
  const fmtOrd = (amount, order) => formatPrice(amount, order?.currency || adminCur);
  const fmtOrdAmt = (amount) => formatPrice(amount, adminCur);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [orderDetailModal, setOrderDetailModal] = useState(null);

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
  const [returnDetailModal, setReturnDetailModal] = useState(null);

  const [cancellations, setCancellations] = useState([]);
  const [cancellationsLoading, setCancellationsLoading] = useState(false);
  const [cancellationStatusFilter, setCancellationStatusFilter] = useState('all');
  const [cancellationModal, setCancellationModal] = useState(null);
  const [cancellationAction, setCancellationAction] = useState('');
  const [cancellationNote, setCancellationNote] = useState('');
  const [cancellationUpdating, setCancellationUpdating] = useState(false);
  const [cancDetailModal, setCancDetailModal] = useState(null);

  const DEFAULT_RETURN_REFUND_NOTE = 'Your return request has been approved. If any payment was made, the refund will be processed within 5–7 business days. Please pack the product securely — our delivery partner will contact you for pickup within 8–12 days.';
  const DEFAULT_RETURN_REPLACEMENT_NOTE = 'Your return request has been approved for a replacement. Please pack the product securely — our delivery partner will contact you within 8–12 days to pick up the old product and deliver the replacement at the same time.';
  const DEFAULT_CANCELLATION_NOTE = 'Your cancellation request has been approved. If any payment was made, the refund will be processed within 5–7 business days.';

  const returnsEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.returnsEnabled === true;
    } catch { return false; }
  })();

  const cancellationEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.cancellationEnabled === true;
    } catch { return false; }
  })();

  useEffect(() => {
    if (siteConfig?.id) {
      loadOrders();
      loadReturns();
      loadCancellations();
    }
  }, [siteConfig?.id]);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await getOrders(siteConfig.id);
      const data = res.data || res.orders || [];
      setOrders(data.sort((a, b) => (parseAsUTC(b.created_at || b.createdAt) || new Date(0)) - (parseAsUTC(a.created_at || a.createdAt) || new Date(0))));
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
      setReturns((res.data || []).sort((a, b) => (parseAsUTC(b.created_at) || new Date(0)) - (parseAsUTC(a.created_at) || new Date(0))));
    } catch (err) {
      console.error('Error loading returns:', err);
    } finally {
      setReturnsLoading(false);
    }
  }

  async function loadCancellations() {
    setCancellationsLoading(true);
    try {
      const res = await getCancellations(siteConfig.id);
      setCancellations((res.data || []).sort((a, b) => (parseAsUTC(b.created_at) || new Date(0)) - (parseAsUTC(a.created_at) || new Date(0))));
    } catch (err) {
      console.error('Error loading cancellations:', err);
    } finally {
      setCancellationsLoading(false);
    }
  }

  async function handleCancellationAction() {
    if (!cancellationModal || !cancellationAction) return;
    setCancellationUpdating(true);
    try {
      await updateCancellation(cancellationModal.id, {
        siteId: siteConfig.id,
        status: cancellationAction,
        adminNote: cancellationNote || undefined,
      });
      setCancellations(prev => prev.map(c => c.id === cancellationModal.id ? { ...c, status: cancellationAction, admin_note: cancellationNote } : c));
      if (cancellationAction === 'approved') {
        setOrders(prev => prev.map(o => o.id === cancellationModal.order_id ? { ...o, status: 'cancelled' } : o));
      }
      setCancellationModal(null);
      setCancellationAction('');
      setCancellationNote('');
    } catch (err) {
      alert('Failed to update cancellation: ' + err.message);
    } finally {
      setCancellationUpdating(false);
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

  function openOrderDetail(order) {
    setOrderDetailModal(order);
  }

  const statuses = ['all', 'pending', 'pending_payment', 'paid', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

  const activeReturnOrderIds = new Set(
    returns.filter(r => r.status === 'requested' || r.status === 'approved' || r.status === 'refunded' || r.status === 'replaced').map(r => r.order_id)
  );
  const activeCancelOrderIds = new Set(
    cancellations.filter(c => c.status === 'requested' || c.status === 'approved').map(c => c.order_id)
  );

  const filtered = orders.filter(o => {
    if (activeReturnOrderIds.has(o.id) || activeCancelOrderIds.has(o.id)) return false;
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
    const colors = { requested: '#ff9800', approved: '#2196f3', rejected: '#e53935', refunded: '#27ae60', replaced: '#7c3aed' };
    return colors[s] || '#757575';
  };
  const getReturnStatusLabel = (s) => {
    const labels = { requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded', replaced: 'Replaced' };
    return labels[s] || s || 'Unknown';
  };

  const getCancelStatusColor = (s) => {
    const colors = { requested: '#ff9800', approved: '#27ae60', rejected: '#e53935' };
    return colors[s] || '#757575';
  };
  const getCancelStatusLabel = (s) => {
    const labels = { requested: 'Requested', approved: 'Approved', rejected: 'Rejected' };
    return labels[s] || s || 'Unknown';
  };

  const returnStatuses = ['all', 'requested', 'approved', 'rejected', 'refunded', 'replaced'];
  const filteredReturns = returns.filter(r => returnStatusFilter === 'all' || r.status === returnStatusFilter);

  const cancellationStatuses = ['all', 'requested', 'approved', 'rejected'];
  const filteredCancellations = cancellations.filter(c => cancellationStatusFilter === 'all' || c.status === cancellationStatusFilter);

  return (
    <div>
      {(returnsEnabled || cancellationEnabled) && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          <button onClick={() => setActiveView('orders')} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeView === 'orders' ? '#0f172a' : '#f8fafc', color: activeView === 'orders' ? '#fff' : '#64748b', transition: '0.2s' }}>
            Orders
          </button>
          {cancellationEnabled && (
            <button onClick={() => setActiveView('cancellations')} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeView === 'cancellations' ? '#0f172a' : '#f8fafc', color: activeView === 'cancellations' ? '#fff' : '#64748b', transition: '0.2s' }}>
              Cancellations {cancellations.filter(c => c.status === 'requested').length > 0 ? `(${cancellations.filter(c => c.status === 'requested').length})` : ''}
            </button>
          )}
          {returnsEnabled && (
            <button onClick={() => setActiveView('returns')} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeView === 'returns' ? '#0f172a' : '#f8fafc', color: activeView === 'returns' ? '#fff' : '#64748b', transition: '0.2s' }}>
              Returns {returns.filter(r => r.status === 'requested').length > 0 ? `(${returns.filter(r => r.status === 'requested').length})` : ''}
            </button>
          )}
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
                        <tr key={ret.id} onClick={() => setReturnDetailModal(ret)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600 }}>#{ret.order_number || ret.order_id?.slice(-6)}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{ret.customer_name || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{ret.customer_email || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{ret.reason}</div>
                            {ret.reason_detail && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{ret.reason_detail}</div>}
                            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              {ret.resolution && (
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: ret.resolution === 'replacement' ? '#ede9fe' : '#dbeafe', color: ret.resolution === 'replacement' ? '#6d28d9' : '#1d4ed8', fontWeight: 600 }}>
                                  {ret.resolution === 'replacement' ? 'Replacement' : 'Refund'}
                                </span>
                              )}
                              {(() => { try { const p = typeof ret.photos === 'string' ? JSON.parse(ret.photos) : ret.photos; return p && p.length > 0 ? <span style={{ fontSize: 11, color: '#64748b' }}><i className="fas fa-camera" style={{ fontSize: 10 }} /> {p.length} photo{p.length > 1 ? 's' : ''}</span> : null; } catch { return null; } })()}
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', background: getReturnStatusColor(ret.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                              {getReturnStatusLabel(ret.status)}
                            </span>
                          </td>
                          <td>{ret.refund_amount ? fmtOrd(ret.refund_amount, ret) : '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDateShortForAdmin(ret.created_at, siteConfig?.settings?.timezone)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                              {ret.status === 'requested' && (
                                <>
                                  <button className="btn btn-sm btn-success" onClick={() => { setReturnModal(ret); setReturnAction('approved'); setReturnNote(ret.resolution === 'replacement' ? DEFAULT_RETURN_REPLACEMENT_NOTE : DEFAULT_RETURN_REFUND_NOTE); setReturnRefundAmount(''); }} title="Approve">
                                    <i className="fas fa-check" />
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => { setReturnModal(ret); setReturnAction('rejected'); setReturnNote(''); }} title="Reject">
                                    <i className="fas fa-times" />
                                  </button>
                                </>
                              )}
                              {ret.status === 'approved' && ret.resolution === 'replacement' && (
                                <button className="btn btn-sm" style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }} onClick={() => { setReturnModal(ret); setReturnAction('replaced'); setReturnNote(''); setReturnRefundAmount(''); }} title="Mark Replaced">
                                  Replace
                                </button>
                              )}
                              {ret.status === 'approved' && ret.resolution !== 'replacement' && (
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
                    {returnModal.reason}{returnModal.reason_detail ? ` — ${returnModal.reason_detail}` : ''}
                  </div>
                </div>
                {returnModal.resolution && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Preferred Resolution</label>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: returnModal.resolution === 'replacement' ? '#ede9fe' : '#dbeafe', color: returnModal.resolution === 'replacement' ? '#6d28d9' : '#1d4ed8' }}>
                      {returnModal.resolution === 'replacement' ? 'Replacement' : 'Refund'}
                    </span>
                  </div>
                )}
                {(() => {
                  let photoList = [];
                  try { photoList = typeof returnModal.photos === 'string' ? JSON.parse(returnModal.photos) : (returnModal.photos || []); } catch {}
                  if (!photoList || photoList.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Photos from customer ({photoList.length})</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {photoList.map(safeImageUrl).filter(Boolean).map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Return photo ${idx + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                  <button onClick={handleReturnAction} disabled={returnUpdating || (returnAction === 'refunded' && !returnRefundAmount)} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: returnAction === 'rejected' ? '#e53935' : returnAction === 'replaced' ? '#7c3aed' : returnAction === 'refunded' ? '#2563eb' : '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: returnUpdating ? 0.7 : 1 }}>
                    {returnUpdating ? 'Processing...' : returnAction === 'approved' ? 'Approve Return' : returnAction === 'rejected' ? 'Reject Return' : returnAction === 'replaced' ? 'Mark Replaced' : 'Mark Refunded'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {returnDetailModal && (() => {
            const order = orders.find(o => o.id === returnDetailModal.order_id) || {};
            const orderItems = Array.isArray(order.items) ? order.items : parseJsonSafe(returnDetailModal.items);
            const address = order.shipping_address || {};
            return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Return Details</h3>
                  <button onClick={() => setReturnDetailModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Order</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>#{returnDetailModal.order_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Return Status</div>
                    <span style={{ display: 'inline-block', background: getReturnStatusColor(returnDetailModal.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {getReturnStatusLabel(returnDetailModal.status)}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Customer</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{returnDetailModal.customer_name || 'N/A'}</div>
                    {returnDetailModal.customer_email && <div style={{ fontSize: 12, color: '#64748b' }}>{returnDetailModal.customer_email}</div>}
                    {returnDetailModal.customer_phone && <div style={{ fontSize: 12, color: '#64748b' }}>{returnDetailModal.customer_phone}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Requested</div>
                    <div style={{ fontSize: 14 }}>{formatDateForAdmin(returnDetailModal.created_at, siteConfig?.settings?.timezone)}</div>
                  </div>
                  {returnDetailModal.resolution && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Resolution</div>
                      <span style={{ display: 'inline-block', background: returnDetailModal.resolution === 'replacement' ? '#8b5cf6' : '#2563eb', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                        {returnDetailModal.resolution === 'replacement' ? 'Replacement' : 'Refund'}
                      </span>
                    </div>
                  )}
                  {returnDetailModal.refund_amount && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Refund Amount</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>{fmtOrd(returnDetailModal.refund_amount, order)}</div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Reason</div>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600 }}>{returnDetailModal.reason}</div>
                    {returnDetailModal.reason_detail && <div style={{ marginTop: 6, color: '#475569' }}>{returnDetailModal.reason_detail}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Items</div>
                    {orderItems.length > 0 ? orderItems.map((item, idx) => (
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
                                const priceSuffix = Number(val.price || 0) > 0 ? ` (${fmtOrdAmt(Number(val.price))})` : '';
                                parts.push(`${label}: ${val.name}${priceSuffix}`);
                              }
                            }
                            return parts.length > 0 ? <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{parts.join(' \u2022 ')}</div> : null;
                          })()}
                          <div style={{ fontSize: 12, color: '#555' }}>
                            {fmtOrdAmt(parseFloat(item.price || 0))} x {item.quantity}
                            <span style={{ fontWeight: 600, marginLeft: 6 }}>= {fmtOrdAmt(parseFloat((item.price || 0) * (item.quantity || 1)))}</span>
                          </div>
                        </div>
                      </div>
                    )) : <div style={{ color: '#999', fontSize: 13 }}>No item details available</div>}
                    {order.total && (
                      <div style={{ paddingTop: 8, borderTop: '2px solid #eee', textAlign: 'right' }}>
                        {parseFloat(order.discount || 0) > 0 && (
                          <>
                            <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                              Subtotal: {fmtOrdAmt(parseFloat(order.subtotal || order.total || 0))}
                            </div>
                            <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                              Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{fmtOrdAmt(parseFloat(order.discount || 0))}
                            </div>
                          </>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          Total: {fmtOrdAmt(parseFloat(order.total || 0))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shipping Address</div>
                    {address && Object.keys(address).length > 0 ? (
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                        <div style={{ fontWeight: 600 }}>{address.name || returnDetailModal.customer_name}</div>
                        {address.phone && <div>📞 {address.phone}</div>}
                        {address.address && <div>{address.address}</div>}
                        {(address.city || address.state) && <div>{[address.city, address.state].filter(Boolean).join(', ')}{address.pinCode ? ' – ' + address.pinCode : ''}</div>}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontSize: 13 }}>No address on file</div>
                    )}

                    <div style={{ fontWeight: 700, marginBottom: 10, marginTop: 16, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</div>
                    {order.payment_method ? (
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                        <div><span style={{ color: '#888' }}>Method:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || '—')}</div>
                        {order.razorpay_payment_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Payment ID:</span> {order.razorpay_payment_id}</div>}
                        {order.notes && <div><span style={{ color: '#888' }}>Notes:</span> {order.notes}</div>}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontSize: 13 }}>No payment info available</div>
                    )}
                  </div>
                </div>

                {(() => {
                  const photos = parseJsonSafe(returnDetailModal.photos);
                  const validPhotos = photos.map(safeImageUrl).filter(Boolean);
                  if (validPhotos.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Customer Photos ({validPhotos.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {validPhotos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Return photo ${idx + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {returnDetailModal.admin_note && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Admin Note</div>
                    <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 13, color: '#92400e', border: '1px solid #fde68a' }}>
                      {returnDetailModal.admin_note}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setReturnDetailModal(null)} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Close</button>
                  {returnDetailModal.status === 'requested' && (
                    <>
                      <button onClick={() => { setReturnDetailModal(null); setReturnModal(returnDetailModal); setReturnAction('approved'); setReturnNote(returnDetailModal.resolution === 'replacement' ? DEFAULT_RETURN_REPLACEMENT_NOTE : DEFAULT_RETURN_REFUND_NOTE); setReturnRefundAmount(''); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Approve</button>
                      <button onClick={() => { setReturnDetailModal(null); setReturnModal(returnDetailModal); setReturnAction('rejected'); setReturnNote(''); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Reject</button>
                    </>
                  )}
                  {returnDetailModal.status === 'approved' && returnDetailModal.resolution === 'replacement' && (
                    <button onClick={() => { setReturnDetailModal(null); setReturnModal(returnDetailModal); setReturnAction('replaced'); setReturnNote(''); setReturnRefundAmount(''); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Replace</button>
                  )}
                  {returnDetailModal.status === 'approved' && returnDetailModal.resolution !== 'replacement' && (
                    <button onClick={() => { setReturnDetailModal(null); setReturnModal(returnDetailModal); setReturnAction('refunded'); setReturnNote(''); setReturnRefundAmount(returnDetailModal.refund_amount || ''); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Refund</button>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      ) : activeView === 'cancellations' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="tabs" style={{ flexWrap: 'wrap', margin: 0 }}>
              {cancellationStatuses.map(s => {
                const count = s === 'all' ? cancellations.length : cancellations.filter(c => c.status === s).length;
                if (s !== 'all' && count === 0) return null;
                return (
                  <button key={s} className={`tab${cancellationStatusFilter === s ? ' active' : ''}`} onClick={() => setCancellationStatusFilter(s)}>
                    {getCancelStatusLabel(s)} ({count})
                  </button>
                );
              })}
            </div>
            <button className="btn btn-outline" onClick={loadCancellations} style={{ flexShrink: 0 }}>
              <i className="fas fa-sync-alt" /> Refresh
            </button>
          </div>

          {cancellationsLoading ? (
            <div className="loading-spinner-admin"><div className="spinner" /></div>
          ) : filteredCancellations.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-ban" />
              <h3>No cancellation requests</h3>
              <p>Cancellation requests from customers will appear here.</p>
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
                        <th style={{ minWidth: 100 }}>Date</th>
                        <th style={{ minWidth: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCancellations.map(canc => (
                        <tr key={canc.id} onClick={() => setCancDetailModal(canc)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600 }}>#{canc.order_number || canc.order_id?.slice(-6)}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{canc.customer_name || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{canc.customer_email || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{canc.reason}</div>
                            {canc.reason_detail && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{canc.reason_detail}</div>}
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', background: getCancelStatusColor(canc.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                              {getCancelStatusLabel(canc.status)}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDateShortForAdmin(canc.created_at, siteConfig?.settings?.timezone)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                              {canc.status === 'requested' && (
                                <>
                                  <button className="btn btn-sm btn-success" onClick={() => { setCancellationModal(canc); setCancellationAction('approved'); setCancellationNote(DEFAULT_CANCELLATION_NOTE); }} title="Approve">
                                    <i className="fas fa-check" />
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => { setCancellationModal(canc); setCancellationAction('rejected'); setCancellationNote(''); }} title="Reject">
                                    <i className="fas fa-times" />
                                  </button>
                                </>
                              )}
                              {canc.admin_note && (
                                <span title={canc.admin_note} style={{ cursor: 'help', fontSize: 14, color: '#94a3b8' }}>
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

          {cancellationModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 440, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#1a1a1a' }}>
                  {cancellationAction === 'approved' ? 'Approve' : 'Reject'} Cancellation
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666' }}>
                  Order <strong>#{cancellationModal.order_number}</strong> - {cancellationModal.customer_name}
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Reason from customer</label>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
                    {cancellationModal.reason}{cancellationModal.reason_detail ? ` - ${cancellationModal.reason_detail}` : ''}
                  </div>
                </div>
                {cancellationAction === 'approved' && (
                  <div style={{ padding: '10px 12px', background: '#fff7ed', borderRadius: 6, fontSize: 13, color: '#92400e', border: '1px solid #fed7aa', marginBottom: 16 }}>
                    Approving will cancel the order and restore product stock.
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Admin Note (sent to customer)</label>
                  <textarea value={cancellationNote} onChange={e => setCancellationNote(e.target.value)} rows={3} placeholder="Optional note for the customer..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setCancellationModal(null); setCancellationAction(''); }} disabled={cancellationUpdating} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  <button onClick={handleCancellationAction} disabled={cancellationUpdating} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: cancellationAction === 'rejected' ? '#e53935' : '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: cancellationUpdating ? 0.7 : 1 }}>
                    {cancellationUpdating ? 'Processing...' : cancellationAction === 'approved' ? 'Approve Cancellation' : 'Reject Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cancDetailModal && (() => {
            const order = orders.find(o => o.id === cancDetailModal.order_id) || {};
            const orderItems = Array.isArray(order.items) ? order.items : parseJsonSafe(cancDetailModal.items);
            const address = order.shipping_address || {};
            return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Cancellation Details</h3>
                  <button onClick={() => setCancDetailModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Order</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>#{cancDetailModal.order_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Cancellation Status</div>
                    <span style={{ display: 'inline-block', background: getCancelStatusColor(cancDetailModal.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {getCancelStatusLabel(cancDetailModal.status)}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Customer</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{cancDetailModal.customer_name || 'N/A'}</div>
                    {cancDetailModal.customer_email && <div style={{ fontSize: 12, color: '#64748b' }}>{cancDetailModal.customer_email}</div>}
                    {cancDetailModal.customer_phone && <div style={{ fontSize: 12, color: '#64748b' }}>{cancDetailModal.customer_phone}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Requested</div>
                    <div style={{ fontSize: 14 }}>{formatDateForAdmin(cancDetailModal.created_at, siteConfig?.settings?.timezone)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Reason</div>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600 }}>{cancDetailModal.reason}</div>
                    {cancDetailModal.reason_detail && <div style={{ marginTop: 6, color: '#475569' }}>{cancDetailModal.reason_detail}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Items</div>
                    {orderItems.length > 0 ? orderItems.map((item, idx) => (
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
                                const priceSuffix = Number(val.price || 0) > 0 ? ` (${fmtOrdAmt(Number(val.price))})` : '';
                                parts.push(`${label}: ${val.name}${priceSuffix}`);
                              }
                            }
                            return parts.length > 0 ? <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{parts.join(' \u2022 ')}</div> : null;
                          })()}
                          <div style={{ fontSize: 12, color: '#555' }}>
                            {fmtOrdAmt(parseFloat(item.price || 0))} x {item.quantity}
                            <span style={{ fontWeight: 600, marginLeft: 6 }}>= {fmtOrdAmt(parseFloat((item.price || 0) * (item.quantity || 1)))}</span>
                          </div>
                        </div>
                      </div>
                    )) : <div style={{ color: '#999', fontSize: 13 }}>No item details available</div>}
                    {order.total && (
                      <div style={{ paddingTop: 8, borderTop: '2px solid #eee', textAlign: 'right' }}>
                        {parseFloat(order.discount || 0) > 0 && (
                          <>
                            <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                              Subtotal: {fmtOrdAmt(parseFloat(order.subtotal || order.total || 0))}
                            </div>
                            <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                              Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{fmtOrdAmt(parseFloat(order.discount || 0))}
                            </div>
                          </>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          Total: {fmtOrdAmt(parseFloat(order.total || 0))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shipping Address</div>
                    {address && Object.keys(address).length > 0 ? (
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                        <div style={{ fontWeight: 600 }}>{address.name || cancDetailModal.customer_name}</div>
                        {address.phone && <div>📞 {address.phone}</div>}
                        {address.address && <div>{address.address}</div>}
                        {(address.city || address.state) && <div>{[address.city, address.state].filter(Boolean).join(', ')}{address.pinCode ? ' – ' + address.pinCode : ''}</div>}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontSize: 13 }}>No address on file</div>
                    )}

                    <div style={{ fontWeight: 700, marginBottom: 10, marginTop: 16, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</div>
                    {order.payment_method ? (
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
                        <div><span style={{ color: '#888' }}>Method:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || '—')}</div>
                        {order.razorpay_payment_id && <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#888' }}>Payment ID:</span> {order.razorpay_payment_id}</div>}
                        {order.notes && <div><span style={{ color: '#888' }}>Notes:</span> {order.notes}</div>}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontSize: 13 }}>No payment info available</div>
                    )}
                  </div>
                </div>

                {cancDetailModal.admin_note && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Admin Note</div>
                    <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 13, color: '#92400e', border: '1px solid #fde68a' }}>
                      {cancDetailModal.admin_note}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setCancDetailModal(null)} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Close</button>
                  {cancDetailModal.status === 'requested' && (
                    <>
                      <button onClick={() => { setCancDetailModal(null); setCancellationModal(cancDetailModal); setCancellationAction('approved'); setCancellationNote(DEFAULT_CANCELLATION_NOTE); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Approve</button>
                      <button onClick={() => { setCancDetailModal(null); setCancellationModal(cancDetailModal); setCancellationAction('rejected'); setCancellationNote(''); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
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
                    const orderNum = order.order_number || order.orderNumber || order.id?.slice(-6);
                    const statusLower = (order.status || '').toLowerCase();
                    const isCancelled = statusLower === 'cancelled';
                    const isDelivered = statusLower === 'delivered';

                    return (
                        <tr key={order.id} onClick={() => openOrderDetail(order)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600 }}>#{orderNum}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{order.customer_name || order.name || 'Guest'}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{order.customer_email || order.email || '—'}</div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{order.customer_phone || '—'}</td>
                          <td>{items.length > 0 ? `${items.length} item${items.length !== 1 ? 's' : ''}` : '—'}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtOrdAmt(parseFloat(order.total || order.total_amount || 0))}</td>
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
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDateShortForAdmin(order.created_at || order.createdAt, siteConfig?.settings?.timezone)}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {orderDetailModal && (() => {
        const order = orderDetailModal;
        const items = Array.isArray(order.items) ? order.items : [];
        const address = order.shipping_address || {};
        const orderNum = order.order_number || order.orderNumber || order.id?.slice(-6);
        const statusLower = (order.status || '').toLowerCase();
        const isCancelled = statusLower === 'cancelled';
        const isDelivered = statusLower === 'delivered';
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1a1a1a' }}>Order Details</h3>
              <button onClick={() => setOrderDetailModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Order</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>#{orderNum}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Order Status</div>
                <span style={{ display: 'inline-block', background: getStatusColor(order.status), color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Customer</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{order.customer_name || order.name || 'Guest'}</div>
                {(order.customer_email || order.email) && <div style={{ fontSize: 12, color: '#64748b' }}>{order.customer_email || order.email}</div>}
                {order.customer_phone && <div style={{ fontSize: 12, color: '#64748b' }}>{order.customer_phone}</div>}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Date</div>
                <div style={{ fontSize: 14 }}>{formatDateForAdmin(order.created_at || order.createdAt, siteConfig?.settings?.timezone)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
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
                            const priceSuffix = Number(val.price || 0) > 0 ? ` (${fmtOrdAmt(Number(val.price))})` : '';
                            parts.push(`${label}: ${val.name}${priceSuffix}`);
                          }
                        }
                        return parts.length > 0 ? <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{parts.join(' \u2022 ')}</div> : null;
                      })()}
                      <div style={{ fontSize: 12, color: '#555' }}>
                        {fmtOrdAmt(parseFloat(item.price || 0))} x {item.quantity}
                        <span style={{ fontWeight: 600, marginLeft: 6 }}>= {fmtOrdAmt(parseFloat((item.price || 0) * (item.quantity || 1)))}</span>
                      </div>
                    </div>
                  </div>
                )) : <div style={{ color: '#999', fontSize: 13 }}>No item details available</div>}
                <div style={{ paddingTop: 8, borderTop: '2px solid #eee', textAlign: 'right' }}>
                  {parseFloat(order.discount || 0) > 0 && (
                    <>
                      <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                        Subtotal: {fmtOrdAmt(parseFloat(order.subtotal || order.total || 0))}
                      </div>
                      <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 4 }}>
                        Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{fmtOrdAmt(parseFloat(order.discount || 0))}
                      </div>
                    </>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Total: {fmtOrdAmt(parseFloat(order.total || 0))}
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

                <div style={{ fontWeight: 700, marginBottom: 10, marginTop: 16, color: '#333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment Info</div>
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

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setOrderDetailModal(null)} style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 14 }}>Close</button>
              {!isCancelled && !isDelivered && statusLower !== 'confirmed' && statusLower !== 'packed' && statusLower !== 'shipped' && (
                <button onClick={() => { setOrderDetailModal(null); setConfirmDialog({ orderId: order.id, orderNum, action: 'confirmed', label: 'Confirm this order?' }); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Confirm</button>
              )}
              {statusLower === 'confirmed' && (
                <button onClick={() => { setOrderDetailModal(null); setConfirmDialog({ orderId: order.id, orderNum, action: 'packed', label: 'Mark this order as packed?' }); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Packed</button>
              )}
              {statusLower === 'packed' && (
                <button onClick={() => { setOrderDetailModal(null); setConfirmDialog({ orderId: order.id, orderNum, action: 'shipped', label: 'Mark this order as shipped?' }); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Shipped</button>
              )}
              {statusLower === 'shipped' && (
                <button onClick={() => { setOrderDetailModal(null); setConfirmDialog({ orderId: order.id, orderNum, action: 'delivered', label: 'Mark this order as delivered?' }); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#27ae60', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Delivered</button>
              )}
              {!isCancelled && !isDelivered && (
                <button onClick={() => { setOrderDetailModal(null); openCancelModal(order); }} style={{ padding: '9px 20px', borderRadius: 6, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel Order</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

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
