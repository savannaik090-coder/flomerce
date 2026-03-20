import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../context/SiteContext.jsx';
import { trackOrder } from '../services/orderService.js';

const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};
const STATUS_ICONS = {
  pending: 'fa-receipt',
  confirmed: 'fa-check-circle',
  packed: 'fa-box',
  shipped: 'fa-truck',
  delivered: 'fa-check-double',
};
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#2196f3',
  packed: '#7c3aed',
  shipped: '#2563eb',
  delivered: '#22c55e',
};

export default function OrderTrackPage() {
  const { siteConfig } = useContext(SiteContext);
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trackUrl = siteConfig?.settings?.orderTrackUrl;
    if (trackUrl) {
      const params = new URLSearchParams(window.location.search);
      const orderParam = params.get('order');
      if (orderParam) {
        const sep = trackUrl.includes('?') ? '&' : '?';
        window.location.href = `${trackUrl}${sep}order=${orderParam}`;
      } else {
        window.location.href = trackUrl;
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    if (orderParam && siteConfig?.id) {
      setOrderNumber(orderParam);
      fetchOrder(orderParam);
    }
  }, [siteConfig]);

  async function fetchOrder(num) {
    const searchNum = num || orderNumber.trim();
    if (!searchNum) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await trackOrder(searchNum, siteConfig?.id);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setOrder(null);
        setError('Order not found. Please check your order number and try again.');
      }
    } catch (err) {
      setOrder(null);
      setError('Order not found. Please check your order number and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    fetchOrder();
  }

  const trackUrl = siteConfig?.settings?.orderTrackUrl;
  if (trackUrl) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #1e293b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b' }}>Redirecting to order tracking...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const currentStatusIdx = order ? STATUSES.indexOf((order.status || '').toLowerCase()) : -1;
  const isCancelled = order && (order.status || '').toLowerCase() === 'cancelled';

  return (
    <div style={{ minHeight: '60vh', padding: '40px 20px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-truck" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Track Your Order</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Enter your order number to see the latest status</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="Enter your order number (e.g., ORD-XXXXXX)"
            style={{
              flex: 1, padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
              fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: '0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#0f172a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            type="submit"
            disabled={loading || !orderNumber.trim()}
            style={{
              padding: '14px 28px', background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading || !orderNumber.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !orderNumber.trim() ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <div style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {order && !isCancelled && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Order #{order.order_number}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span style={{
                  display: 'inline-block',
                  background: STATUS_COLORS[(order.status || '').toLowerCase()] || '#757575',
                  color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700,
                }}>
                  {STATUS_LABELS[(order.status || '').toLowerCase()] || order.status}
                </span>
              </div>
            </div>

            <div style={{ padding: '28px 28px 32px' }}>
              <div style={{ position: 'relative' }}>
                {STATUSES.map((status, idx) => {
                  const isActive = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  const isLast = idx === STATUSES.length - 1;
                  const color = isActive ? (STATUS_COLORS[status] || '#22c55e') : '#e2e8f0';

                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: isLast ? 0 : 32 }}>
                      {!isLast && (
                        <div style={{
                          position: 'absolute', left: 17, top: 36, width: 2, bottom: 0,
                          background: isActive && idx < currentStatusIdx ? STATUS_COLORS[STATUSES[idx + 1]] || '#22c55e' : '#e2e8f0',
                        }} />
                      )}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? color : '#f1f5f9', flexShrink: 0, zIndex: 1,
                        boxShadow: isCurrent ? `0 0 0 4px ${color}33` : 'none',
                        transition: '0.3s',
                      }}>
                        <i className={`fas ${STATUS_ICONS[status]}`} style={{ fontSize: 14, color: isActive ? '#fff' : '#cbd5e1' }} />
                      </div>
                      <div style={{ marginLeft: 16, paddingTop: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: isActive ? '#0f172a' : '#94a3b8' }}>
                          {STATUS_LABELS[status]}
                        </div>
                        {isActive && getTimestamp(order, status) && (
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                            {formatTimestamp(getTimestamp(order, status))}
                          </div>
                        )}
                        {status === 'shipped' && isActive && (order.tracking_number || order.carrier) && (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                            {order.carrier && (
                              <div style={{ fontSize: 13, color: '#1e40af', marginBottom: 4 }}>
                                <strong>Carrier:</strong> {order.carrier}
                              </div>
                            )}
                            {order.tracking_number && (
                              <div style={{ fontSize: 13, color: '#1e40af' }}>
                                <strong>Tracking:</strong> {order.tracking_number}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {order && isCancelled && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #fecaca', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '24px 28px', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Order #{order.order_number}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ display: 'inline-block', background: '#e53935', color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700 }}>
                  Cancelled
                </span>
              </div>
            </div>
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u274C'}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#0f172a' }}>This order has been cancelled</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                If you have any questions about this cancellation, please contact the store.
              </p>
            </div>
          </div>
        )}

        {searched && !order && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{'\uD83D\uDD0D'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#0f172a' }}>No order found</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>Please check your order number and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimestamp(order, status) {
  switch (status) {
    case 'pending': return order.created_at;
    case 'confirmed': return order.confirmed_at || (order.status !== 'pending' ? order.updated_at : null);
    case 'packed': return order.packed_at;
    case 'shipped': return order.shipped_at;
    case 'delivered': return order.delivered_at;
    default: return null;
  }
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
