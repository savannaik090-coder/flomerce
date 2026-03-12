import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { SiteContext } from '../context/SiteContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import * as orderService from '../services/orderService.js';
import * as authService from '../services/authService.js';
import '../styles/checkout.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir',
  'Ladakh','Chandigarh','Puducherry','Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeItem, clearAll } = useContext(CartContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount } = useContext(CurrencyContext);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    houseNumber: '',
    roadName: '',
    city: '',
    state: '',
    pinCode: '',
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [pinValidating, setPinValidating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      setAddress(prev => ({
        ...prev,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && !addressesLoaded) {
      (async () => {
        try {
          const result = await authService.getAddresses();
          const addrs = result.data || result || [];
          const list = Array.isArray(addrs) ? addrs : [];
          setSavedAddresses(list);
          if (list.length > 0) {
            const defaultAddr = list.find(a => a.is_default === 1) || list[0];
            selectSavedAddress(defaultAddr);
          }
        } catch (err) {
          console.error('Failed to fetch saved addresses:', err);
        } finally {
          setAddressesLoaded(true);
        }
      })();
    }
  }, [isAuthenticated, addressesLoaded]);

  const validateAddress = useCallback(() => {
    const errs = {};
    if (address.firstName.trim().length < 2) errs.firstName = 'First name must be at least 2 characters';
    if (address.lastName.trim().length < 2) errs.lastName = 'Last name must be at least 2 characters';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(address.email.trim())) errs.email = 'Please enter a valid email';
    const phoneDigits = address.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) errs.phone = 'Please enter a valid 10-digit phone number';
    if (address.houseNumber.trim().length < 1) errs.houseNumber = 'House/Building number is required';
    if (address.roadName.trim().length < 5) errs.roadName = 'Road/Area must be at least 5 characters';
    if (address.city.trim().length < 2) errs.city = 'City name must be at least 2 characters';
    if (address.state.trim().length < 2) errs.state = 'Please select a state';
    if (!/^\d{6}$/.test(address.pinCode.trim())) errs.pinCode = 'Please enter a valid 6-digit PIN code';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }, [address]);

  const validatePinCode = useCallback(async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;
    setPinValidating(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data?.[0]?.Status === 'Success') {
        const po = data[0].PostOffice[0];
        setAddress(prev => ({
          ...prev,
          city: po.District || prev.city,
          state: po.State || prev.state,
        }));
        setAddressErrors(prev => ({ ...prev, pinCode: undefined }));
      } else {
        setAddressErrors(prev => ({ ...prev, pinCode: 'Invalid PIN code' }));
      }
    } catch {
      setAddressErrors(prev => ({ ...prev, pinCode: undefined }));
    } finally {
      setPinValidating(false);
    }
  }, []);

  const handleAddressChange = useCallback((field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    setAddressErrors(prev => ({ ...prev, [field]: undefined }));
    setSelectedAddressId(null);
    if (field === 'pinCode' && value.length === 6) {
      validatePinCode(value);
    }
  }, [validatePinCode]);

  const selectSavedAddress = useCallback((addr) => {
    setSelectedAddressId(addr.id);
    setAddress(prev => ({
      ...prev,
      firstName: addr.first_name || prev.firstName,
      lastName: addr.last_name || prev.lastName,
      phone: addr.phone || prev.phone,
      houseNumber: addr.house_number || '',
      roadName: addr.road_name || '',
      city: addr.city || '',
      state: addr.state || '',
      pinCode: addr.pin_code || '',
    }));
  }, []);

  const goToStep = useCallback(async (s) => {
    if (s === 2 && items.length === 0) {
      setError('Your cart is empty');
      return;
    }
    if (s === 3) {
      if (!validateAddress()) return;
      if (isAuthenticated && saveAddress && !selectedAddressId) {
        try {
          await authService.createAddress({
            label: 'Home',
            firstName: address.firstName,
            lastName: address.lastName,
            phone: address.phone,
            houseNumber: address.houseNumber,
            roadName: address.roadName,
            city: address.city,
            state: address.state,
            pinCode: address.pinCode,
            isDefault: savedAddresses.length === 0,
          });
        } catch (err) {
          console.error('Failed to save address:', err);
        }
      }
    }
    setError('');
    setStep(s);
    window.scrollTo(0, 0);
  }, [items, validateAddress, isAuthenticated, saveAddress, selectedAddressId, savedAddresses, address]);

  const placeOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!siteConfig?.id) {
        setError('Store configuration not loaded. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      const customerName = `${address.firstName} ${address.lastName}`.trim();
      const orderData = {
        siteId: siteConfig.id,
        items: items.map(item => ({
          productId: item.productId || item.product_id || item.id,
          name: item.name || item.product_name,
          price: item.price || item.product_price,
          quantity: item.quantity || 1,
          image: resolveImageUrl(item.thumbnail || item.image_url || item.product_image || ''),
        })),
        total: subtotal,
        shippingAddress: {
          name: customerName,
          email: address.email,
          phone: address.phone,
          address: `${address.houseNumber}, ${address.roadName}`,
          city: address.city,
          state: address.state,
          pinCode: address.pinCode,
        },
        customerName,
        customerEmail: address.email,
        customerPhone: address.phone,
        paymentMethod,
      };

      if (paymentMethod === 'razorpay') {
        const razorpayKeyId = siteConfig?.settings?.razorpayKeyId || siteConfig?.settings?.razorpay_key_id;
        if (!razorpayKeyId) {
          setError('Online payment is not configured for this store. Please use Cash on Delivery.');
          setLoading(false);
          return;
        }

        if (!window.Razorpay) {
          setError('Payment gateway not loaded. Please refresh and try again.');
          setLoading(false);
          return;
        }

        const dbOrder = await orderService.createOrder(orderData);
        const order = dbOrder.data || dbOrder.order || dbOrder;
        const orderId = order.id || order.orderId;
        const orderNumber = order.orderNumber || order.order_number;

        const { apiRequest } = await import('../services/api.js');
        const paymentResult = await apiRequest('/api/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({
            amount: subtotal,
            currency: 'INR',
            receipt: orderNumber || `order_${Date.now()}`,
            orderId: orderId,
            siteId: siteConfig?.id,
            notes: { orderNumber },
          }),
        });

        const paymentData = paymentResult.data || paymentResult;
        const razorpayOrderId = paymentData.orderId || paymentData.razorpay_order_id;

        if (!razorpayOrderId) {
          setError('Failed to initialize payment. Please try again.');
          setLoading(false);
          return;
        }

        const options = {
          key: paymentData.keyId || razorpayKeyId,
          amount: paymentData.amount || Math.round(subtotal * 100),
          currency: paymentData.currency || 'INR',
          name: siteConfig?.brandName || 'Store',
          description: `Order #${orderNumber || orderId || 'new'}`,
          order_id: razorpayOrderId,
          handler: async function (response) {
            try {
              await apiRequest('/api/payments/verify', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  siteId: siteConfig?.id,
                }),
              });
              setOrderRef(orderNumber || orderId || 'ORD-' + Date.now());
              setOrderPlaced(true);
              clearAll();
            } catch (verifyErr) {
              console.error('Payment verification error:', verifyErr);
              setError('Payment verification failed. If money was deducted, please contact support with your order reference.');
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
          prefill: {
            name: `${address.firstName} ${address.lastName}`,
            email: address.email,
            contact: address.phone,
          },
          theme: { color: siteConfig?.primaryColor || '#000000' },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setError(`Payment failed: ${resp.error?.description || 'Unknown error'}. Please try again.`);
          setLoading(false);
        });
        rzp.open();
        setLoading(false);
        return;
      }

      const result = await orderService.createOrder(orderData);
      const order = result.data || result.order || result;
      setOrderRef(order.orderNumber || order.order_number || order.id || order.order_id || 'ORD-' + Date.now());
      setOrderPlaced(true);
      clearAll();
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [siteConfig, items, subtotal, address, paymentMethod, clearAll]);

  if (orderPlaced) {
    return (
      <div className="checkout-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 500, padding: 40, background: '#fff', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 60, color: '#25ab00', marginBottom: 20 }}>&#10003;</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 15 }}>Order Confirmed!</h2>
          <p style={{ color: '#666', marginBottom: 10 }}>Thank you for your order.</p>
          <p style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '8px 16px', borderRadius: 4, display: 'inline-block', marginBottom: 20 }}>
            Order Reference: {orderRef}
          </p>
          <div>
            <Link to="/" style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && step === 1) {
    return (
      <div className="checkout-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 15 }}>Your cart is empty</h2>
          <p style={{ color: '#777', marginBottom: 20 }}>Add some items to your cart before checkout.</p>
          <Link to="/" style={{ background: '#000', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" style={{ maxWidth: 900, margin: '40px auto 60px', padding: '0 20px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 30, textAlign: 'center' }}>Checkout</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, gap: 0 }}>
        {[
          { num: 1, label: 'Order Summary', icon: '&#128722;' },
          { num: 2, label: 'Address', icon: '&#128205;' },
          { num: 3, label: 'Payment', icon: '&#128179;' },
        ].map((s) => (
          <div key={s.num} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px', fontSize: 20, border: '2px solid',
              backgroundColor: step >= s.num ? (step > s.num ? '#25ab00' : '#7a4012') : '#f8f9fa',
              borderColor: step >= s.num ? (step > s.num ? '#25ab00' : '#7a4012') : '#eee',
              color: step >= s.num ? '#fff' : '#999',
              transition: 'all 0.3s ease',
            }}>
              {step > s.num ? <span>&#10003;</span> : <span dangerouslySetInnerHTML={{ __html: s.icon }} />}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: step >= s.num ? '#333' : '#999' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 6, background: '#eee', borderRadius: 3, marginBottom: 30 }}>
        <div style={{ height: '100%', background: '#7a4012', borderRadius: 3, width: `${((step - 1) / 2) * 100}%`, transition: 'width 0.5s ease' }} />
      </div>

      {error && <div style={{ background: '#ffebee', color: '#d32f2f', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center', border: '1px solid #f5c6cb' }}>{error}</div>}

      {step === 1 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20 }}>Order Summary</h3>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {items.map((item, index) => {
              const price = item.product_price || item.price || 0;
              const qty = item.quantity || 1;
              const itemId = item.productId || item.product_id || item.id;
              return (
                <div key={itemId || index} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
                  {(item.thumbnail || item.product_image || item.image_url) && resolveImageUrl(item.thumbnail || item.product_image || item.image_url) && (
                    <div style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={resolveImageUrl(item.thumbnail || item.product_image || item.image_url)} alt={item.product_name || item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.product_name || item.name}</h6>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{formatAmount(price)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: 4, overflow: 'hidden', height: 30 }}>
                          <button type="button" onClick={() => updateQuantity(itemId, qty - 1)} style={{ width: 28, height: 28, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                          <span style={{ padding: '0 8px', fontSize: 14, fontWeight: 500 }}>{qty}</span>
                          <button type="button" onClick={() => updateQuantity(itemId, qty + 1)} style={{ width: 28, height: 28, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 600, color: '#9c7c38' }}>{formatAmount(price * qty)}</span>
                        <button type="button" onClick={() => removeItem(itemId)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}>x</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 16, borderTop: '2px solid #f0f0f0' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Subtotal</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#7a4012' }}>{formatAmount(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <Link to="/" style={{ padding: '10px 20px', border: '1px solid #9c7c38', color: '#9c7c38', borderRadius: 0, textDecoration: 'none', fontWeight: 500 }}>Continue Shopping</Link>
            <button onClick={() => goToStep(2)} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue to Address</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20 }}>Shipping Address</h3>

          {isAuthenticated && savedAddresses.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h5 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Saved Addresses</h5>
              {savedAddresses.map((sa) => (
                <div key={sa.id} onClick={() => selectSavedAddress(sa)} style={{
                  border: `2px solid ${selectedAddressId === sa.id ? '#7a4012' : '#e0e0e0'}`,
                  borderRadius: 8, padding: 15, marginBottom: 12, cursor: 'pointer',
                  backgroundColor: selectedAddressId === sa.id ? '#f8f6f0' : '#fff',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#7a4012' }}>{sa.first_name} {sa.last_name}</span>
                    {sa.label && <span style={{ fontSize: 12, color: '#888', background: '#f0f0f0', padding: '1px 8px', borderRadius: 10 }}>{sa.label}</span>}
                    {sa.is_default === 1 && <span style={{ fontSize: 11, color: '#fff', background: '#7a4012', padding: '1px 8px', borderRadius: 10 }}>Default</span>}
                  </div>
                  <div style={{ color: '#555', fontSize: 14, lineHeight: 1.4 }}>
                    {sa.house_number}{sa.road_name ? `, ${sa.road_name}` : ''}, {sa.city}, {sa.state} - {sa.pin_code}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16, marginTop: 8 }}>
                <button type="button" onClick={() => { setSelectedAddressId(null); setAddress(prev => ({ ...prev, houseNumber: '', roadName: '', city: '', state: '', pinCode: '', phone: '' })); }} style={{ background: 'none', border: 'none', color: '#7a4012', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>+ Use a New Address</button>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>First Name *</label>
                <input type="text" value={address.firstName} onChange={e => handleAddressChange('firstName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.firstName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.firstName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.firstName}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>Last Name *</label>
                <input type="text" value={address.lastName} onChange={e => handleAddressChange('lastName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.lastName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.lastName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.lastName}</div>}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>Email *</label>
              <input type="email" value={address.email} onChange={e => handleAddressChange('email', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.email ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.email && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.email}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>Phone *</label>
              <input type="tel" value={address.phone} onChange={e => handleAddressChange('phone', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.phone ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.phone && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.phone}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>House/Building Number *</label>
              <input type="text" value={address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.houseNumber ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.houseNumber && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.houseNumber}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>Road Name / Area / Colony *</label>
              <input type="text" value={address.roadName} onChange={e => handleAddressChange('roadName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.roadName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.roadName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.roadName}</div>}
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>PIN Code *</label>
                <input type="text" maxLength={6} value={address.pinCode} onChange={e => handleAddressChange('pinCode', e.target.value.replace(/\D/g, ''))} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.pinCode ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {pinValidating && <div style={{ color: '#7a4012', fontSize: 12, marginTop: 4 }}>Validating PIN code...</div>}
                {addressErrors.pinCode && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.pinCode}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>City *</label>
                <input type="text" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.city ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.city && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.city}</div>}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>State *</label>
              <select value={address.state} onChange={e => handleAddressChange('state', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.state ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {addressErrors.state && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.state}</div>}
            </div>
          </div>

          {isAuthenticated && !selectedAddressId && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: '#f9f6f0', borderRadius: 6, border: '1px solid #e8e0d0' }}>
              <input type="checkbox" id="saveAddr" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} style={{ width: 'auto', marginRight: 10, accentColor: '#7a4012' }} />
              <label htmlFor="saveAddr" style={{ color: '#333', fontSize: 14, cursor: 'pointer' }}>Save this address to my account for faster checkout</label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <button onClick={() => goToStep(1)} style={{ padding: '10px 20px', border: '1px solid #7a4012', background: 'transparent', color: '#7a4012', cursor: 'pointer', fontWeight: 500 }}>Back to Summary</button>
            <button onClick={() => goToStep(3)} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Continue to Payment</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20 }}>Payment</h3>

          <div style={{ background: '#f9f6f0', padding: 16, borderLeft: '3px solid #7a4012', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            <strong>Shipping To:</strong><br />
            {address.firstName} {address.lastName}<br />
            {address.houseNumber}, {address.roadName}<br />
            {address.city}, {address.state} - {address.pinCode}<br />
            Phone: {address.phone} | Email: {address.email}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h5 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Order Total</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>Subtotal ({items.length} items)</span>
              <span style={{ fontWeight: 600 }}>{formatAmount(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>Shipping</span>
              <span style={{ color: '#25ab00', fontWeight: 500 }}>Free</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: '#7a4012' }}>{formatAmount(subtotal)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h5 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Payment Method</h5>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: `2px solid ${paymentMethod === 'cod' ? '#7a4012' : '#e0e0e0'}`, borderRadius: 8, marginBottom: 12, cursor: 'pointer', background: paymentMethod === 'cod' ? '#f8f6f0' : '#fff' }}>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              <div>
                <div style={{ fontWeight: 600 }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: 13, color: '#666' }}>Pay when you receive your order</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: `2px solid ${paymentMethod === 'razorpay' ? '#7a4012' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: paymentMethod === 'razorpay' ? '#f8f6f0' : '#fff' }}>
              <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
              <div>
                <div style={{ fontWeight: 600 }}>Pay Online (Razorpay)</div>
                <div style={{ fontSize: 13, color: '#666' }}>Credit/Debit Card, UPI, Net Banking</div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <button onClick={() => goToStep(2)} style={{ padding: '10px 20px', border: '1px solid #7a4012', background: 'transparent', color: '#7a4012', cursor: 'pointer', fontWeight: 500 }}>Back to Address</button>
            <button onClick={placeOrder} disabled={loading} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
