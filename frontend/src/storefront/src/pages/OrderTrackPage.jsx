import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { trackOrder, getReturnStatus, getCancelStatus, getPublicShipmentTracking } from '../services/orderService.js';
import { formatDateForCustomer } from '../utils/dateFormatter.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

const STATUS_STEPS = [
  { key: 'pending', icon: 'fa-shopping-bag', color: '#64748b' },
  { key: 'confirmed', icon: 'fa-check-circle', color: '#2563eb' },
  { key: 'packed', icon: 'fa-box', color: '#7c3aed' },
  { key: 'shipped', icon: 'fa-truck', color: '#0284c7' },
  { key: 'delivered', icon: 'fa-check-double', color: '#16a34a' },
];

function getStepIndex(status) {
  const s = (status || '').toLowerCase();
  if (s === 'cancelled') return -1;
  const idx = STATUS_STEPS.findIndex(step => step.key === s);
  return idx >= 0 ? idx : 0;
}

function formatDate(dateStr) {
  return formatDateForCustomer(dateStr);
}

export default function OrderTrackPage() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useContext(SiteContext);
  const stepLabels = {
    pending: tx("Order Placed"),
    confirmed: tx("Confirmed"),
    packed: tx("Packed"),
    shipped: tx("Shipped"),
    delivered: tx("Delivered"),
  };
  const statusLabels = {
    requested: tx("Requested"),
    approved: tx("Approved"),
    rejected: tx("Rejected"),
    refunded: tx("Refunded"),
    replaced: tx("Replaced"),
  };
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [returnInfo, setReturnInfo] = useState(null);
  const [cancelInfo, setCancelInfo] = useState(null);
  const [shipmentInfo, setShipmentInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    // `t` is the per-order track token customer emails embed; passing it
    // to the public-track endpoint unlocks live Shiprocket scan history.
    // Absent → user typed the order number manually, so the page falls
    // back to the basic timeline only (no scan section).
    const t = params.get('t') || params.get('token');
    if (id && siteConfig?.id) {
      setOrderIdInput(id);
      fetchOrder(id, t);
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

  async function fetchOrder(id, trackToken) {
    const searchId = (id || orderIdInput).trim();
    if (!searchId) {
      setError(tx("Please enter an order number or order ID"));
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    setReturnInfo(null);
    setCancelInfo(null);
    setShipmentInfo(null);
    setSearched(true);
    try {
      const res = await trackOrder(searchId, siteConfig?.id);
      if (res.success && res.data) {
        setOrder(res.data);
        const orderId = res.data.id || res.data.order_id || searchId;
        try {
          const retRes = await getReturnStatus(orderId, siteConfig?.id);
          if (retRes.success && retRes.data) setReturnInfo(retRes.data);
        } catch {}
        try {
          const canRes = await getCancelStatus(orderId, siteConfig?.id);
          if (canRes.success && canRes.data) setCancelInfo(canRes.data);
        } catch {}
        // Live Shiprocket scan history. Server requires the per-order
        // track_token (only present for customers who arrived via an
        // emailed tracking link); without it the call returns
        // `hasShipment:false` and the scan section just hides itself.
        try {
          const shipRes = await getPublicShipmentTracking(orderId, siteConfig?.id, trackToken);
          const shipData = shipRes?.data || shipRes;
          if (shipData && shipData.hasShipment) setShipmentInfo(shipData);
        } catch {}
      } else {
        setError(res.error || tx("Order not found. Please check your order number and try again."));
      }
    } catch (err) {
      setError(tx("Order not found. Please check your order number and try again."));
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}><TranslatedText text="Track Your Order" /></h1>
        <p style={{ color: '#64748b', fontSize: 14 }}><TranslatedText text="Enter your order number to see the current status" /></p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          type="text"
          value={orderIdInput}
          onChange={e => setOrderIdInput(e.target.value)}
          placeholder={tx("Enter order number (e.g. ORD-XXXX)")}
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
          {loading ? <TranslatedText text="Searching..." /> : <TranslatedText text="Track" />}
        </button>
      </form>

      {error && (
        <div style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          <i className="fas fa-exclamation-circle" style={{ marginInlineEnd: 8 }} />
          <TranslatedText text={error} />
        </div>
      )}

      {order && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}><TranslatedText text="Order Number" /></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>#{order.order_number}</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}><TranslatedText text="Order Date" /></div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{formatDate(order.created_at)}</div>
            </div>
          </div>

          {isCancelled ? (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-times-circle" style={{ fontSize: 28, color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}><TranslatedText text="Order Cancelled" /></h3>
              <p style={{ color: '#64748b', fontSize: 14 }}><TranslatedText text="This order has been cancelled." /></p>
            </div>
          ) : (
            <div style={{ padding: '32px 24px' }}>
              <div style={{ position: 'relative', paddingInlineStart: 36 }}>
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
                      <div style={{ paddingInlineStart: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: isCurrent ? 700 : 500, color: isCompleted ? '#0f172a' : '#94a3b8' }}>
                          {stepLabels[step.key] || tx("In Progress")}
                          {isCurrent && (
                            <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: step.color, color: '#fff' }}><TranslatedText text="Current" /></span>
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

          {!isCancelled && (order.tracking_number || order.carrier) && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}><TranslatedText text="Shipping Details" /></div>
              {order.carrier && <div style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}><strong><TranslatedText text="Carrier:" /></strong> {order.carrier}</div>}
              {order.tracking_number && <div style={{ fontSize: 14, color: '#334155' }}><strong><TranslatedText text="Tracking Number:" /></strong> {order.tracking_number}</div>}
              {shipmentInfo?.etd && (
                <div style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>
                  <strong><TranslatedText text="Estimated Delivery:" /></strong> {shipmentInfo.etd}
                </div>
              )}
            </div>
          )}

          {!isCancelled && shipmentInfo && Array.isArray(shipmentInfo.scans) && shipmentInfo.scans.length > 0 && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12 }}>
                <TranslatedText text="Tracking Updates" />
              </div>
              <div style={{ position: 'relative', paddingInlineStart: 20 }}>
                {shipmentInfo.scans.map((scan, idx) => {
                  const isLast = idx === shipmentInfo.scans.length - 1;
                  const isFirst = idx === 0;
                  return (
                    <div key={idx} style={{ position: 'relative', paddingBottom: isLast ? 0 : 16 }}>
                      {!isLast && (
                        <div style={{
                          position: 'absolute', left: -12, top: 14, width: 2, bottom: 0,
                          background: '#e2e8f0',
                        }} />
                      )}
                      <div style={{
                        position: 'absolute', left: -16, top: 4, width: 10, height: 10, borderRadius: '50%',
                        background: isFirst ? '#0284c7' : '#cbd5e1',
                      }} />
                      <div style={{ fontSize: 14, fontWeight: isFirst ? 600 : 500, color: '#0f172a' }}>
                        {scan.status || '—'}
                      </div>
                      {(scan.location || scan.timestamp) && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {scan.location ? <span>{scan.location}</span> : null}
                          {scan.location && scan.timestamp ? <span> · </span> : null}
                          {scan.timestamp ? <span>{scan.timestamp}</span> : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {returnInfo && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: '#fefce8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <i className="fas fa-undo-alt" style={{ color: '#d97706' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#92400e' }}><TranslatedText text="Return Request" /></span>
                <span style={{ marginInlineStart: 'auto', display: 'inline-block', background: returnInfo.status === 'requested' ? '#ff9800' : returnInfo.status === 'approved' ? '#2196f3' : returnInfo.status === 'rejected' ? '#e53935' : returnInfo.status === 'refunded' ? '#27ae60' : returnInfo.status === 'replaced' ? '#7c3aed' : '#757575', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                  {statusLabels[returnInfo.status] || returnInfo.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#78716c', marginBottom: 6 }}>
                <strong><TranslatedText text="Reason:" /></strong> {returnInfo.reason}{returnInfo.reason_detail ? ` — ${returnInfo.reason_detail}` : ''}
              </div>
              {returnInfo.resolution && (
                <div style={{ fontSize: 13, color: '#78716c', marginBottom: 6 }}>
                  <strong><TranslatedText text="Resolution:" /></strong> {returnInfo.resolution === 'replacement' ? <TranslatedText text="Replacement" /> : <TranslatedText text="Refund" />}
                </div>
              )}
              {returnInfo.refund_amount && returnInfo.resolution !== 'replacement' && (
                <div style={{ fontSize: 13, color: '#78716c', marginBottom: 6 }}>
                  <strong><TranslatedText text="Refund Amount:" /></strong> {returnInfo.refund_amount}
                </div>
              )}
              {returnInfo.admin_note && (
                <div style={{ fontSize: 13, color: '#78716c', marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <strong><TranslatedText text="Admin Response:" /></strong> {returnInfo.admin_note}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 6 }}>{tx("Submitted on {{date}}").replace('{{date}}', formatDate(returnInfo.created_at))}</div>
            </div>
          )}

          {cancelInfo && (
            <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', background: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <i className="fas fa-ban" style={{ color: '#dc2626' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}><TranslatedText text="Cancellation Request" /></span>
                <span style={{ marginInlineStart: 'auto', display: 'inline-block', background: cancelInfo.status === 'requested' ? '#ff9800' : cancelInfo.status === 'approved' ? '#27ae60' : cancelInfo.status === 'rejected' ? '#e53935' : '#757575', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                  {statusLabels[cancelInfo.status] || cancelInfo.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#78716c', marginBottom: 6 }}>
                <strong><TranslatedText text="Reason:" /></strong> {cancelInfo.reason}{cancelInfo.reason_detail ? ` — ${cancelInfo.reason_detail}` : ''}
              </div>
              {cancelInfo.admin_note && (
                <div style={{ fontSize: 13, color: '#78716c', marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                  <strong><TranslatedText text="Admin Response:" /></strong> {cancelInfo.admin_note}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 6 }}>{tx("Submitted on {{date}}").replace('{{date}}', formatDate(cancelInfo.created_at))}</div>
            </div>
          )}

          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Link
              to={`/order-help/${order.order_number}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, textDecoration: 'none', color: '#334155', fontSize: 14, fontWeight: 500 }}
            >
              <i className="fas fa-headset" style={{ color: '#64748b' }} />
              <TranslatedText text="Need help with this order?" />
            </Link>
          </div>
        </div>
      )}

      {searched && !order && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          <i className="fas fa-search" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
          <p><TranslatedText text="No order found with that number." /></p>
        </div>
      )}
    </div>
  );
}
