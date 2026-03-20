import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { trackOrder } from '../services/orderService.js';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'fa-shopping-bag', color: '#64748b' },
  { key: 'confirmed', label: 'Confirmed', icon: 'fa-check-circle', color: '#2563eb' },
  { key: 'packed', label: 'Packed', icon: 'fa-box', color: '#7c3aed' },
  { key: 'shipped', label: 'Shipped', icon: 'fa-truck', color: '#0284c7' },
  { key: 'delivered', label: 'Delivered', icon: 'fa-check-double', color: '#16a34a' },
];

function getStepIndex(status) {
  const s = (status || '').toLowerCase();
  if (s === 'cancelled') return -1;
  const idx = STATUS_STEPS.findIndex(step => step.key === s);
  return idx >= 0 ? idx : 0;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderTrackPage() {
  const { siteConfig } = useContext(SiteContext);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    if (id && siteConfig?.id) {
      setOrderIdInput(id);
      fetchOrder(id);
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    const externalUrl = siteConfig?.settings?.orderTrackUrl;
    if (externalUrl) {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('orderId');
      if (!id) {
        window.location.href = externalUrl;
      }
    }
  }, [siteConfig]);

  async function fetchOrder(id) {
    const searchId = (id || orderIdInput).trim();
    if (!searchId) {
      setError('Please enter an order number or order ID');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
    try {
      const res = await trackOrder(searchId, siteConfig?.id);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.error || 'Order not found. Please check your order number and try again.');
      }
    } catch (err) {
      setError('Order not found. Please check your order number and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    fetchOrder();
  }

  const currentStep = order ? getStepIndex(order.status) : -1;
  const isCancelled = order && (order.status || '').toLowerCase() === 'cancelled';

  return (
    <div style={{ minHeight: '60vh', padding: '40px 16px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className="fas fa-truck" style={{ fontSize: 24, color: '#475569' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Track Your Order</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Enter your order number to see the current status</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          type="text"
          value={orderIdInput}
          onChange={e => setOrderIdInput(e.target.value)}
          placeholder="Enter order number (e.g. ORD-XXXX)"
          style={{
            flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8,
            fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {order && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Order Number</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>#{order.order_number}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Order Date</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{formatDate(order.created_at)}</div>
            </div>
          </div>

          {isCancelled ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-times-circle" style={{ fontSize: 28, color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Order Cancelled</h3>
              <p style={{ color: '#64748b', fontSize: 14 }}>This order has been cancelled.</p>
            </div>
          ) : (
            <div style={{ padding: '32px 24px' }}>
              <div style={{ position: 'relative', paddingLeft: 36 }}>
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  const isLast = idx === STATUS_STEPS.length - 1;

                  let timestamp = '';
                  if (idx === 0 && order.created_at) timestamp = formatDate(order.created_at);
                  if (idx === 1 && order.confirmed_at) timestamp = formatDate(order.confirmed_at);
                  if (idx === 2 && order.packed_at) timestamp = formatDate(order.packed_at);
                  if (idx === 3 && order.shipped_at) timestamp = formatDate(order.shipped_at);
                  if (idx === 4 && order.delivered_at) timestamp = formatDate(order.delivered_at);

                  return (
                    <div key={step.key} style={{ position: 'relative', paddingBottom: isLast ? 0 : 32, minHeight: isLast ? 'auto' : 40 }}>
                      {!isLast && (
                        <div style={{
                          position: 'absolute', left: -24, top: 28, width: 2, bottom: 0,
                          background: isCompleted && idx < currentStep ? step.color : '#e2e8f0',
                        }} />
                      )}
                      <div style={{ position: 'absolute', left: -36, top: 0, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isCompleted ? step.color : '#f1f5f9', transition: '0.3s' }}>
                        <i className={`fas ${isCompleted ? step.icon : 'fa-circle'}`} style={{ fontSize: isCompleted ? 12 : 8, color: isCompleted ? '#fff' : '#cbd5e1' }} />
                      </div>
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: isCurrent ? 700 : 500, color: isCompleted ? '#0f172a' : '#94a3b8' }}>
                          {step.label}
                          {isCurrent && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: step.color, color: '#fff' }}>Current</span>
                          )}
                        </div>
                        {timestamp && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{timestamp}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(order.tracking_number || order.carrier) && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Shipping Details</div>
              {order.carrier && <div style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}><strong>Carrier:</strong> {order.carrier}</div>}
              {order.tracking_number && <div style={{ fontSize: 14, color: '#334155' }}><strong>Tracking Number:</strong> {order.tracking_number}</div>}
            </div>
          )}

          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Link
              to={`/order-help/${order.order_number}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, textDecoration: 'none', color: '#334155', fontSize: 14, fontWeight: 500 }}
            >
              <i className="fas fa-headset" style={{ color: '#64748b' }} />
              Need help with this order?
            </Link>
          </div>
        </div>
      )}

      {searched && !order && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          <i className="fas fa-search" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
          <p>No order found with that number.</p>
        </div>
      )}
    </div>
  );
}
