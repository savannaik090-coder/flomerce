import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { SiteContext } from '../context/SiteContext.jsx';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import * as authService from '../services/authService.js';
import * as orderService from '../services/orderService.js';
import { formatDateShortForCustomer } from '../utils/dateFormatter.js';

function getApiBase() {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in')) return '';
  return 'https://fluxe.in';
}

const RETURN_REASONS = [
  'Received wrong item',
  'Item damaged or defective',
  'Item does not match description',
  'Size/fit issue',
  'Changed my mind',
  'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir',
  'Ladakh','Chandigarh','Puducherry','Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useContext(AuthContext);
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount } = useContext(CurrencyContext);

  const [activeTab, setActiveTab] = useState('account');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressForm, setAddressForm] = useState({ label: 'Home', firstName: '', lastName: '', phone: '', houseNumber: '', roadName: '', city: '', state: '', pinCode: '', isDefault: false });
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [pinValidating, setPinValidating] = useState(false);

  const [openHelpOrderId, setOpenHelpOrderId] = useState(null);

  const [returnModal, setReturnModal] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnDetail, setReturnDetail] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [uploadingReturnPhotos, setUploadingReturnPhotos] = useState(false);
  const [returnResolution, setReturnResolution] = useState('refund');
  const [returningOrder, setReturningOrder] = useState(false);
  const [returnStatuses, setReturnStatuses] = useState({});
  const returnFileRef = useRef(null);

  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelStatuses, setCancelStatuses] = useState({});

  const CANCEL_REASONS = [
    'Changed my mind',
    'Found a better price elsewhere',
    'Ordered by mistake',
    'Shipping is taking too long',
    'Item no longer needed',
    'Other',
  ];

  const cancellationEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.cancellationEnabled === true;
    } catch { return false; }
  })();

  const returnsEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.returnsEnabled === true;
    } catch { return false; }
  })();

  const returnWindowDays = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.returnWindowDays || 7;
    } catch { return 7; }
  })();

  const replacementEnabled = (() => {
    try {
      const s = siteConfig?.settings;
      const parsed = typeof s === 'string' ? JSON.parse(s) : (s || {});
      return parsed.replacementEnabled === true;
    } catch { return false; }
  })();

  const imageRequiredReasons = ['Received wrong item', 'Item damaged or defective'];

  const isWithinReturnWindow = useCallback((order) => {
    const deliveredAt = order.delivered_at || order.updated_at || order.created_at;
    if (!deliveredAt) return false;
    const days = (new Date() - new Date(deliveredAt)) / (1000 * 60 * 60 * 24);
    return days <= returnWindowDays;
  }, [returnWindowDays]);

  useEffect(() => {
    if (activeTab === 'orders' && orders.length > 0 && returnsEnabled && siteConfig?.id) {
      orders.filter(o => (o.status || '').toLowerCase() === 'delivered').forEach(async (order) => {
        try {
          const res = await orderService.getReturnStatus(order.id || order.order_number, siteConfig.id);
          if (res.data) {
            setReturnStatuses(prev => ({ ...prev, [order.id]: res.data }));
          }
        } catch {}
      });
    }
  }, [activeTab, orders, returnsEnabled, siteConfig?.id]);

  useEffect(() => {
    if (activeTab === 'orders' && orders.length > 0 && cancellationEnabled && siteConfig?.id) {
      orders.filter(o => ['pending', 'confirmed'].includes((o.status || '').toLowerCase())).forEach(async (order) => {
        try {
          const res = await orderService.getCancelStatus(order.id || order.order_number, siteConfig.id);
          if (res.data) {
            setCancelStatuses(prev => ({ ...prev, [order.id]: res.data }));
          }
        } catch {}
      });
    }
  }, [activeTab, orders, cancellationEnabled, siteConfig?.id]);

  const isReturnFormValid = () => {
    if (!returnReason || !returnDetail.trim()) return false;
    if (imageRequiredReasons.includes(returnReason) && returnPhotos.length === 0) return false;
    return true;
  };

  const handleReturnPhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (returnPhotos.length + files.length > 5) { alert('You can upload a maximum of 5 photos.'); return; }
    setUploadingReturnPhotos(true);
    try {
      const API_BASE = getApiBase();
      const newPhotos = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('photo', file);
        const resp = await fetch(`${API_BASE}/api/upload/return-photo?siteId=${siteConfig.id}`, { method: 'POST', body: formData });
        const result = await resp.json();
        if (result.success && result.data?.url) newPhotos.push(result.data.url);
      }
      setReturnPhotos(prev => [...prev, ...newPhotos]);
    } catch { alert('Failed to upload one or more images.'); }
    finally {
      setUploadingReturnPhotos(false);
      if (returnFileRef.current) returnFileRef.current.value = '';
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnModal || !isReturnFormValid()) return;
    setReturningOrder(true);
    try {
      await orderService.createReturnRequest(returnModal.id || returnModal.order_number, {
        siteId: siteConfig.id,
        reason: returnReason,
        reasonDetail: returnDetail,
        photos: returnPhotos.length > 0 ? returnPhotos : undefined,
        resolution: replacementEnabled ? returnResolution : 'refund',
      });
      setReturnStatuses(prev => ({ ...prev, [returnModal.id]: { status: 'requested', reason: returnReason } }));
      setReturnModal(null);
      setReturnReason('');
      setReturnDetail('');
      setReturnPhotos([]);
      setReturnResolution('refund');
      alert('Return request submitted successfully!');
    } catch (err) {
      alert('Failed to submit return: ' + (err.message || 'Unknown error'));
    } finally {
      setReturningOrder(false);
    }
  };

  const handleSubmitCancel = async () => {
    if (!cancelModal || !cancelReason || !cancelDetail.trim()) return;
    setCancellingOrder(true);
    try {
      await orderService.createCancelRequest(cancelModal.id || cancelModal.order_number, {
        siteId: siteConfig.id,
        reason: cancelReason,
        reasonDetail: cancelDetail,
      });
      setCancelStatuses(prev => ({ ...prev, [cancelModal.id]: { status: 'requested', reason: cancelReason } }));
      setCancelModal(null);
      setCancelReason('');
      setCancelDetail('');
      alert('Cancellation request submitted successfully!');
    } catch (err) {
      alert('Failed to submit cancellation: ' + (err.message || 'Unknown error'));
    } finally {
      setCancellingOrder(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      setNewName(user.name || '');
    }
  }, [user]);

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const result = await authService.getAddresses();
      const addrs = result.data || result || [];
      setAddresses(Array.isArray(addrs) ? addrs : []);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!siteConfig?.id) return;
    setOrdersLoading(true);
    try {
      const result = await orderService.getOrders(siteConfig.id);
      setOrders(result.data || result.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [siteConfig?.id]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab, fetchOrders, fetchAddresses]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await authService.updateProfile({ name: newName });
      setEditingName(false);
    } catch {
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const validatePinCode = useCallback(async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;
    setPinValidating(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data?.[0]?.Status === 'Success') {
        const po = data[0].PostOffice[0];
        setAddressForm(prev => ({
          ...prev,
          city: po.District || prev.city,
          state: po.State || prev.state,
        }));
        setAddressFieldErrors(prev => ({ ...prev, pinCode: undefined }));
      } else {
        setAddressFieldErrors(prev => ({ ...prev, pinCode: 'Invalid PIN code' }));
      }
    } catch {
      setAddressFieldErrors(prev => ({ ...prev, pinCode: undefined }));
    } finally {
      setPinValidating(false);
    }
  }, []);

  const handleAddressFieldChange = useCallback((field, value) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    setAddressFieldErrors(prev => ({ ...prev, [field]: undefined }));
    if (field === 'pinCode' && value.length === 6) {
      validatePinCode(value);
    }
  }, [validatePinCode]);

  const validateAddressForm = useCallback(() => {
    const errs = {};
    if (!addressForm.firstName || addressForm.firstName.trim().length < 2) errs.firstName = 'First name must be at least 2 characters';
    const phoneDigits = (addressForm.phone || '').replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) errs.phone = 'Please enter a valid 10-digit phone number';
    if (!addressForm.houseNumber || addressForm.houseNumber.trim().length < 1) errs.houseNumber = 'House/Building number is required';
    if (addressForm.roadName && addressForm.roadName.trim().length > 0 && addressForm.roadName.trim().length < 5) errs.roadName = 'Road/Area must be at least 5 characters';
    if (!addressForm.city || addressForm.city.trim().length < 2) errs.city = 'City name must be at least 2 characters';
    if (!addressForm.state || addressForm.state.trim().length < 2) errs.state = 'Please select a state';
    if (!/^\d{6}$/.test((addressForm.pinCode || '').trim())) errs.pinCode = 'Please enter a valid 6-digit PIN code';
    setAddressFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [addressForm]);

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) {
      return;
    }
    setSavingAddress(true);
    setAddressError('');
    try {
      if (editAddress !== null) {
        await authService.updateAddress(editAddress, addressForm);
      } else {
        await authService.createAddress(addressForm);
      }
      await fetchAddresses();
      setShowAddressModal(false);
      setEditAddress(null);
      setAddressForm({ label: 'Home', firstName: '', lastName: '', phone: '', houseNumber: '', roadName: '', city: '', state: '', pinCode: '', isDefault: false });
    } catch (err) {
      setAddressError(err.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await authService.deleteAddress(id);
      await fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
  };

  const openEditAddress = (addr) => {
    setEditAddress(addr.id);
    setAddressForm({
      label: addr.label || 'Home',
      firstName: addr.first_name || '',
      lastName: addr.last_name || '',
      phone: addr.phone || '',
      houseNumber: addr.house_number || '',
      roadName: addr.road_name || '',
      city: addr.city || '',
      state: addr.state || '',
      pinCode: addr.pin_code || '',
      isDefault: addr.is_default === 1,
    });
    setShowAddressModal(true);
    setAddressError('');
    setAddressFieldErrors({});
  };

  const getStatusColor = (status) => {
    const colors = { pending: '#757575', pending_payment: '#ff9800', paid: '#2196f3', confirmed: '#2196f3', shipped: '#1565c0', delivered: '#27ae60', cancelled: '#e74c3c' };
    return colors[status?.toLowerCase()] || '#757575';
  };

  const getStatusLabel = (status) => {
    const labels = { pending: 'Pending', pending_payment: 'Awaiting Payment', paid: 'Paid', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
    return labels[status?.toLowerCase()] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending');
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: '80vh' }}>
      <div style={{ maxWidth: 1000, margin: '40px auto 60px', backgroundColor: '#fff', padding: 30, borderRadius: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid #eee' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: '#c8a97e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 20, color: '#fff', fontSize: 36, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: '0 0 5px' }}>{user.name || 'User'}</h1>
            <p style={{ color: '#777', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid #eee', marginBottom: 30 }}>
          {['account', 'orders', 'addresses'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '15px 20px', fontFamily: "'Lato', sans-serif", fontWeight: 600,
              color: activeTab === tab ? '#c8a97e' : '#777', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #c8a97e' : '2px solid transparent',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {tab === 'account' ? 'Account Details' : tab === 'orders' ? 'Order History' : 'Addresses'}
            </button>
          ))}
        </div>

        {activeTab === 'account' && (
          <div>
            <div style={{ marginBottom: 25 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Full Name</label>
              {editingName ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} />
                  <button onClick={handleSaveName} disabled={savingName} style={{ padding: '10px 20px', background: '#c8a97e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditingName(false); setNewName(user.name || ''); }} style={{ padding: '10px 16px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, color: '#333' }}>{user.name || 'Not set'}</span>
                  <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', color: '#c8a97e', cursor: 'pointer', fontSize: 14 }}>Edit</button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 25 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Email</label>
              <span style={{ fontSize: 16, color: '#333' }}>{user.email}</span>
            </div>
            <button onClick={() => setShowLogoutConfirm(true)} style={{ backgroundColor: '#c8a97e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 20, transition: 'background-color 0.3s ease' }}>
              Logout
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#777' }}>Loading orders...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#777', margin: '30px 0', fontStyle: 'italic' }}>
                <p>No orders found yet.</p>
                <Link to="/" style={{ display: 'inline-block', backgroundColor: '#c8a97e', color: '#fff', padding: '10px 20px', borderRadius: 4, textDecoration: 'none', marginTop: 15 }}>Start Shopping</Link>
              </div>
            ) : (
              orders.map(order => {
                const orderItems = order.items || [];
                const orderTotal = order.total || orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                return (
                  <div key={order.id} style={{ border: '1px solid #eee', borderRadius: 5, padding: 15, marginBottom: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #eee', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>Order #{order.order_number || order.id || order.order_id}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: '#777', fontSize: 14 }}>{formatDateShortForCustomer(order.created_at)}</span>
                        <span style={{ backgroundColor: getStatusColor(order.status), color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{getStatusLabel(order.status)}</span>
                      </div>
                    </div>
                    {order.status === 'cancelled' && order.cancellation_reason && (
                      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff5f5', borderLeft: '3px solid #e74c3c', borderRadius: 4, fontSize: 13, color: '#555' }}>
                        <strong style={{ color: '#e74c3c' }}>Cancellation Reason:</strong> {order.cancellation_reason}
                      </div>
                    )}
                    {orderItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', padding: '10px 0', gap: 15 }}>
                        {item.image && <img src={item.image} alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px', fontSize: 14 }}>{item.name}</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#c8a97e', fontWeight: 'bold' }}>{formatAmount(item.price)}</span>
                            <span style={{ color: '#777', fontSize: 13, background: '#f5f5f5', padding: '2px 8px', borderRadius: 12 }}>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', paddingTop: 10, borderTop: '1px solid #eee', marginTop: 10 }}>
                      {parseFloat(order.discount || 0) > 0 && (
                        <>
                          <div style={{ fontSize: 13, color: '#777', marginBottom: 2 }}>
                            Subtotal: {formatAmount(order.subtotal || orderTotal)}
                          </div>
                          <div style={{ fontSize: 13, color: '#27ae60', marginBottom: 4 }}>
                            Coupon{order.coupon_code ? ` (${order.coupon_code})` : ''}: −{formatAmount(order.discount)}
                          </div>
                        </>
                      )}
                      <div style={{ fontWeight: 'bold' }}>Total: {formatAmount(orderTotal)}</div>
                    </div>
                    {(cancelStatuses[order.id] || returnStatuses[order.id]) && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {cancelStatuses[order.id] && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Cancellation:</span>
                            <span style={{ display: 'inline-block', background: { requested: '#ff9800', approved: '#27ae60', rejected: '#e53935' }[cancelStatuses[order.id].status] || '#757575', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                              {{ requested: 'Pending', approved: 'Approved', rejected: 'Rejected' }[cancelStatuses[order.id].status] || cancelStatuses[order.id].status}
                            </span>
                          </div>
                        )}
                        {returnStatuses[order.id] && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>Return:</span>
                            <span style={{ display: 'inline-block', background: { requested: '#ff9800', approved: '#2196f3', rejected: '#e53935', refunded: '#27ae60' }[returnStatuses[order.id].status] || '#757575', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                              {{ requested: 'Requested', approved: 'Approved', rejected: 'Rejected', refunded: 'Refunded' }[returnStatuses[order.id].status] || returnStatuses[order.id].status}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                      <button
                        onClick={() => setOpenHelpOrderId(openHelpOrderId === order.id ? null : order.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #e2e8f0', color: '#475569', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                      >
                        <i className="fas fa-headset" style={{ fontSize: 12 }} />
                        Need Help?
                        <i className={`fas fa-chevron-${openHelpOrderId === order.id ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
                      </button>
                      {openHelpOrderId === order.id && (
                        <div style={{ marginTop: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <Link
                            to={`/order-track?orderId=${order.order_number}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, textDecoration: 'none', color: '#334155', fontSize: 13, fontWeight: 500 }}
                          >
                            <i className="fas fa-truck" style={{ fontSize: 11 }} /> Track Order
                          </Link>
                          {cancellationEnabled && ['pending', 'confirmed'].includes((order.status || '').toLowerCase()) && !cancelStatuses[order.id] && (
                            <button
                              onClick={() => { setCancelModal(order); setCancelReason(''); setCancelDetail(''); setOpenHelpOrderId(null); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fff', border: '1px solid #fecaca', borderRadius: 4, color: '#e53935', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                            >
                              <i className="fas fa-times-circle" style={{ fontSize: 11 }} /> Cancel Order
                            </button>
                          )}
                          {returnsEnabled && (order.status || '').toLowerCase() === 'delivered' && !returnStatuses[order.id] && isWithinReturnWindow(order) && (
                            <button
                              onClick={() => { setReturnModal(order); setReturnReason(''); setReturnDetail(''); setReturnPhotos([]); setReturnResolution('refund'); setOpenHelpOrderId(null); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                            >
                              <i className="fas fa-undo" style={{ fontSize: 11 }} /> Return / Refund
                            </button>
                          )}
                          {returnsEnabled && (order.status || '').toLowerCase() === 'delivered' && !returnStatuses[order.id] && !isWithinReturnWindow(order) && (
                            <span style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>Return window expired</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>Saved Addresses</h3>
              <button onClick={() => { setEditAddress(null); setAddressForm({ label: 'Home', firstName: '', lastName: '', phone: '', houseNumber: '', roadName: '', city: '', state: '', pinCode: '', isDefault: false }); setAddressError(''); setAddressFieldErrors({}); setShowAddressModal(true); }} style={{ background: '#c8a97e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                + Add Address
              </button>
            </div>
            {addressesLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #c8a97e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#777' }}>Loading addresses...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : addresses.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#777', fontStyle: 'italic', padding: 30 }}>No saved addresses. Add one for faster checkout.</p>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} style={{ border: `1px solid ${addr.is_default ? '#c8a97e' : '#eee'}`, borderRadius: 8, padding: 20, marginBottom: 15, backgroundColor: addr.is_default ? '#fefcf8' : '#fff', transition: 'box-shadow 0.3s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 'bold', color: '#333' }}>{addr.label || 'Address'}</span>
                      {addr.is_default === 1 && <span style={{ backgroundColor: '#c8a97e', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>Default</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 15 }}>
                      <button onClick={() => openEditAddress(addr)} style={{ background: 'none', border: 'none', color: '#c8a97e', cursor: 'pointer', fontSize: 14 }}>Edit</button>
                      <button onClick={() => handleDeleteAddress(addr.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14 }}>Delete</button>
                    </div>
                  </div>
                  <div style={{ color: '#555', lineHeight: 1.6, fontSize: 14 }}>
                    <div>{addr.first_name} {addr.last_name}</div>
                    <div>{addr.house_number}{addr.road_name ? `, ${addr.road_name}` : ''}</div>
                    <div>{addr.city}, {addr.state} - {addr.pin_code}</div>
                    {addr.phone && <div>Phone: {addr.phone}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: 30, borderRadius: 10, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: 15, fontFamily: "'Playfair Display', serif" }}>Confirm Logout</h3>
            <p style={{ color: '#666', marginBottom: 24 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleLogout} style={{ background: '#c8a97e', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Yes, Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '10px 24px', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {returnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 30, width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Request Return</h3>
              <button onClick={() => setReturnModal(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>x</button>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Order <strong>#{returnModal.order_number || returnModal.id}</strong>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, color: '#333', fontSize: 14 }}>Reason for return *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RETURN_REASONS.map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${returnReason === reason ? '#c8a97e' : '#e0e0e0'}`, background: returnReason === reason ? '#fefcf8' : '#fafafa', transition: 'all 0.15s' }}>
                    <input type="radio" name="returnReason" value={reason} checked={returnReason === reason} onChange={() => setReturnReason(reason)} style={{ accentColor: '#c8a97e' }} />
                    <span style={{ fontSize: 14, color: '#333', fontWeight: returnReason === reason ? 600 : 400 }}>{reason}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#333', fontSize: 14 }}>Additional notes *</label>
              <textarea value={returnDetail} onChange={e => setReturnDetail(e.target.value)} rows={3} placeholder="Describe the issue in detail..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              {returnReason && !returnDetail.trim() && <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>Please provide additional details.</p>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#333', fontSize: 14 }}>
                Photos {imageRequiredReasons.includes(returnReason) ? '*' : '(optional)'} {returnPhotos.length > 0 ? `(${returnPhotos.length}/5)` : ''}
              </label>
              {imageRequiredReasons.includes(returnReason) && (
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Upload photos showing the issue (required).</p>
              )}
              {returnPhotos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {returnPhotos.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                      <button onClick={() => setReturnPhotos(p => p.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {returnPhotos.length < 5 && (
                <>
                  <input ref={returnFileRef} type="file" accept="image/*" multiple onChange={handleReturnPhotoChange} style={{ display: 'none' }} />
                  <button type="button" onClick={() => returnFileRef.current?.click()} disabled={uploadingReturnPhotos} style={{ padding: '8px 14px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', cursor: uploadingReturnPhotos ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-camera" /> {uploadingReturnPhotos ? 'Uploading...' : 'Upload Photos'}
                  </button>
                </>
              )}
              {imageRequiredReasons.includes(returnReason) && returnPhotos.length === 0 && returnReason && (
                <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>At least 1 photo is required for this return reason.</p>
              )}
            </div>
            {replacementEnabled && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333', fontSize: 14 }}>Preferred resolution *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ value: 'refund', label: 'Refund' }, { value: 'replacement', label: 'Replacement' }].map(opt => (
                    <label key={opt.value} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 6, border: `1.5px solid ${returnResolution === opt.value ? '#c8a97e' : '#e0e0e0'}`, background: returnResolution === opt.value ? '#fefcf8' : '#fafafa', textAlign: 'center', transition: 'all 0.15s' }}>
                      <input type="radio" name="returnResolution" value={opt.value} checked={returnResolution === opt.value} onChange={() => setReturnResolution(opt.value)} style={{ accentColor: '#c8a97e' }} />
                      <span style={{ fontSize: 14, color: '#333', fontWeight: returnResolution === opt.value ? 600 : 400 }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setReturnModal(null)} style={{ padding: '10px 20px', background: '#f8f9fa', color: '#333', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitReturn} disabled={returningOrder || !isReturnFormValid()} style={{ padding: '10px 20px', background: '#c8a97e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, opacity: (returningOrder || !isReturnFormValid()) ? 0.7 : 1 }}>
                {returningOrder ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 30, width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Request Cancellation</h3>
              <button onClick={() => setCancelModal(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>x</button>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Order <strong>#{cancelModal.order_number || cancelModal.id}</strong>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, color: '#333', fontSize: 14 }}>Reason for cancellation *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CANCEL_REASONS.map(reason => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: `1.5px solid ${cancelReason === reason ? '#e53935' : '#e0e0e0'}`, background: cancelReason === reason ? '#fff5f5' : '#fafafa', transition: 'all 0.15s' }}>
                    <input type="radio" name="cancelReason" value={reason} checked={cancelReason === reason} onChange={() => setCancelReason(reason)} style={{ accentColor: '#e53935' }} />
                    <span style={{ fontSize: 14, color: '#333', fontWeight: cancelReason === reason ? 600 : 400 }}>{reason}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#333', fontSize: 14 }}>Additional notes *</label>
              <textarea value={cancelDetail} onChange={e => setCancelDetail(e.target.value)} rows={3} placeholder="Please provide more details about your cancellation..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              {cancelReason && !cancelDetail.trim() && <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>Please provide additional details before submitting.</p>}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(null)} style={{ padding: '10px 20px', background: '#f8f9fa', color: '#333', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>Close</button>
              <button onClick={handleSubmitCancel} disabled={cancellingOrder || !cancelReason || !cancelDetail.trim()} style={{ padding: '10px 20px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, opacity: (cancellingOrder || !cancelReason || !cancelDetail.trim()) ? 0.7 : 1 }}>
                {cancellingOrder ? 'Submitting...' : 'Submit Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 30, width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingBottom: 15, borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>{editAddress !== null ? 'Edit Address' : 'Add Address'}</h3>
              <button onClick={() => setShowAddressModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>x</button>
            </div>
            {addressError && <div style={{ background: '#ffebee', color: '#d32f2f', padding: 10, borderRadius: 4, marginBottom: 15, fontSize: 14 }}>{addressError}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Address Label</label>
              <select value={addressForm.label} onChange={e => handleAddressFieldChange('label', e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>First Name *</label>
                <input type="text" value={addressForm.firstName} onChange={e => handleAddressFieldChange('firstName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.firstName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressFieldErrors.firstName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.firstName}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Last Name</label>
                <input type="text" value={addressForm.lastName} onChange={e => handleAddressFieldChange('lastName', e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Phone</label>
              <input type="tel" value={addressForm.phone} onChange={e => handleAddressFieldChange('phone', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.phone ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressFieldErrors.phone && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.phone}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>House/Building Number *</label>
              <input type="text" value={addressForm.houseNumber} onChange={e => handleAddressFieldChange('houseNumber', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.houseNumber ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressFieldErrors.houseNumber && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.houseNumber}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Road / Area / Colony</label>
              <input type="text" value={addressForm.roadName} onChange={e => handleAddressFieldChange('roadName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.roadName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressFieldErrors.roadName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.roadName}</div>}
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>PIN Code *</label>
                <input type="text" maxLength={6} value={addressForm.pinCode} onChange={e => handleAddressFieldChange('pinCode', e.target.value.replace(/\D/g, ''))} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.pinCode ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {pinValidating && <div style={{ color: '#c8a97e', fontSize: 12, marginTop: 4 }}>Validating PIN code...</div>}
                {addressFieldErrors.pinCode && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.pinCode}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>City *</label>
                <input type="text" value={addressForm.city} onChange={e => handleAddressFieldChange('city', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.city ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressFieldErrors.city && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.city}</div>}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>State *</label>
              <select value={addressForm.state} onChange={e => handleAddressFieldChange('state', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressFieldErrors.state ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {addressFieldErrors.state && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressFieldErrors.state}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
              <input type="checkbox" id="defaultAddr" checked={addressForm.isDefault} onChange={e => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))} style={{ width: 'auto', marginRight: 10 }} />
              <label htmlFor="defaultAddr" style={{ color: '#333', fontSize: 14 }}>Set as default address</label>
            </div>
            <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddressModal(false)} style={{ backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #ddd', padding: '10px 20px', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveAddress} disabled={savingAddress} style={{ backgroundColor: '#c8a97e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, opacity: savingAddress ? 0.7 : 1 }}>
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
