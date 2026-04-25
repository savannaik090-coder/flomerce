import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext.jsx';
import { trackOrder } from '../services/orderService.js';
import { parseAsUTC } from '../utils/dateFormatter.js';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

export default function OrderHelpPage() {
  const { translate: tx } = useShopperTranslation();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const cancelToken = searchParams.get('cancelToken');
  const returnToken = searchParams.get('returnToken');
  const navigate = useNavigate();
  const { siteConfig } = useContext(SiteContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lookupOrderId, setLookupOrderId] = useState('');
  const [looked, setLooked] = useState(false);

  let settings = {};
  try {
    const s = siteConfig?.settings;
    settings = typeof s === 'string' ? JSON.parse(s) : (s || {});
  } catch {}

  const cancellationEnabled = settings.cancellationEnabled === true;
  const returnsEnabled = settings.returnsEnabled === true;
  const returnWindowDays = settings.returnWindowDays || 7;
  const ownerEmail = settings.email || settings.ownerEmail || siteConfig?.email;

  useEffect(() => {
    if (orderId && siteConfig?.id) {
      loadOrder(orderId);
    }
  }, [orderId, siteConfig?.id]);

  async function loadOrder(id) {
    setLoading(true);
    setError('');
    try {
      const res = await trackOrder(id, siteConfig?.id);
      if (res.success && res.data) {
        setOrder(res.data);
        setLooked(true);
      } else {
        setError(tx("Order not found. Please check your order number."));
        setLooked(true);
      }
    } catch {
      setError(tx("Could not load order details."));
      setLooked(true);
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(e) {
    e.preventDefault();
    if (lookupOrderId.trim()) {
      navigate(`/order-help/${lookupOrderId.trim()}`);
    }
  }

  function isWithinReturnWindow(o) {
    const deliveredAt = o.delivered_at || o.updated_at || o.created_at;
    if (!deliveredAt) return false;
    const days = (new Date() - (parseAsUTC(deliveredAt) || new Date())) / (1000 * 60 * 60 * 24);
    return days <= returnWindowDays;
  }

  const status = (order?.status || '').toLowerCase();
  const canCancel = cancellationEnabled && ['pending', 'confirmed'].includes(status);
  const canReturn = returnsEnabled && status === 'delivered' && isWithinReturnWindow(order || {});

  const cancelHref = cancelToken
    ? `/cancel/${order?.order_number || orderId}?token=${cancelToken}`
    : `/cancel`;
  const returnHref = returnToken
    ? `/return/${order?.order_number || orderId}?token=${returnToken}`
    : `/return`;

  return (
    <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 16px' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-headset" style={{ fontSize: 26, color: '#475569' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', color: '#0f172a', fontFamily: "'Playfair Display', serif" }}><TranslatedText text="Order Help" /></h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {orderId ? <TranslatedText text="How can we help with your order?" /> : <TranslatedText text="Enter your order number to see your options" />}
          </p>
        </div>

        {!orderId && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', padding: 32 }}>
            <form onSubmit={handleLookup}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14, color: '#334155' }}><TranslatedText text="Order Number" /></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={lookupOrderId}
                  onChange={e => setLookupOrderId(e.target.value)}
                  placeholder={tx("e.g. ORD-XXXX")}
                  style={{ flex: 1, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                  required
                />
                <button type="submit" style={{ padding: '12px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <TranslatedText text="Find Order" />
                </button>
              </div>
            </form>
          </div>
        )}

        {orderId && loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b' }}><TranslatedText text="Loading order details..." /></p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {orderId && !loading && error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: 24, color: '#ef4444', marginBottom: 12 }} />
            <p style={{ color: '#dc2626', margin: '8px 0 16px', fontSize: 14 }}><TranslatedText text={error} /></p>
            <Link to="/order-track" style={{ color: '#0f172a', fontWeight: 600, fontSize: 14 }}><TranslatedText text="Try Order Tracking instead →" /></Link>
          </div>
        )}

        {orderId && !loading && order && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}><TranslatedText text="Order" /></div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>#{order.order_number}</div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: status === 'delivered' ? '#dcfce7' : status === 'cancelled' ? '#fef2f2' : '#f0f9ff',
                  color: status === 'delivered' ? '#166534' : status === 'cancelled' ? '#991b1b' : '#0369a1',
                }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to={`/order-track?orderId=${order.order_number}`} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', textDecoration: 'none', transition: 'box-shadow 0.2s', color: 'inherit' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-truck" style={{ fontSize: 18, color: '#0369a1' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}><TranslatedText text="Track This Order" /></div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}><TranslatedText text="See the current status and shipping updates" /></div>
                </div>
                <i className="fas fa-chevron-right" style={{ marginInlineStart: 'auto', color: '#cbd5e1' }} />
              </Link>

              {canCancel && (
                <Link to={cancelHref} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '18px 20px', textDecoration: 'none', transition: 'box-shadow 0.2s', color: 'inherit' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-times-circle" style={{ fontSize: 18, color: '#e53935' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}><TranslatedText text="Cancel Order" /></div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}><TranslatedText text="Request a cancellation for this order" /></div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ marginInlineStart: 'auto', color: '#cbd5e1' }} />
                </Link>
              )}

              {canReturn && (
                <Link to={returnHref} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', textDecoration: 'none', transition: 'box-shadow 0.2s', color: 'inherit' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-undo" style={{ fontSize: 18, color: '#d97706' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}><TranslatedText text="Return / Refund" /></div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}><TranslatedText text="Request a return or refund for this order" /></div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ marginInlineStart: 'auto', color: '#cbd5e1' }} />
                </Link>
              )}

              {status === 'cancelled' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-ban" style={{ fontSize: 18, color: '#e53935' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#dc2626' }}><TranslatedText text="Order Cancelled" /></div>
                    <div style={{ fontSize: 13, color: '#991b1b', marginTop: 2 }}><TranslatedText text="This order has already been cancelled" /></div>
                  </div>
                </div>
              )}

              {ownerEmail && (
                <a href={`mailto:${ownerEmail}?subject=${encodeURIComponent(`Help with Order #${order.order_number}`)}`} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', textDecoration: 'none', transition: 'box-shadow 0.2s', color: 'inherit' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-envelope" style={{ fontSize: 18, color: '#16a34a' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}><TranslatedText text="Contact the Store" /></div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}><TranslatedText text="Send an email to" /> {ownerEmail}</div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ marginInlineStart: 'auto', color: '#cbd5e1' }} />
                </a>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link to="/order-track" style={{ fontSize: 13, color: '#64748b', textDecoration: 'underline' }}><TranslatedText text="Track a different order" /></Link>
        </div>
      </div>
    </div>
  );
}
