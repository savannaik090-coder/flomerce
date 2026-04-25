import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { translateApiError } from '../services/errorMessages.js';
import { AuthContext } from '../context/AuthContext.jsx';
import { SiteContext } from '../context/SiteContext.jsx';
import { resolveImageUrl } from '../utils/imageUrl.js';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import { COUNTRIES, getStatesForCountry, getCountryName, getDialCode } from '../utils/countryStates.js';
import PhoneInput from '../components/ui/PhoneInput.jsx';
import * as orderService from '../services/orderService.js';
import * as authService from '../services/authService.js';
import '../styles/checkout.css';
import TranslatedText from '../components/TranslatedText';
import { useShopperTranslation } from '../context/ShopperTranslationContext.jsx';

export default function CheckoutPage() {
  const { items, subtotal, updateQuantity, removeItem, clearAll, cartItemKey } = useContext(CartContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount, siteDefaultCurrency } = useContext(CurrencyContext);
  const { translate: tx } = useShopperTranslation();

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
    country: 'IN',
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
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);

  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  const settings = siteConfig?.settings || {};
  const codEnabled = settings.codEnabled !== false;
  const availableCoupons = Array.isArray(settings.coupons) ? settings.coupons : [];
  const whatsappNotificationsAvailable = settings.whatsappNotificationsEnabled === true;

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

  const statesForCountry = useMemo(() => getStatesForCountry(address.country), [address.country]);

  const validateAddress = useCallback(() => {
    const errs = {};
    if (address.firstName.trim().length < 2) errs.firstName = tx("First name must be at least 2 characters");
    if (address.lastName.trim().length < 2) errs.lastName = tx("Last name must be at least 2 characters");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(address.email.trim())) errs.email = tx("Please enter a valid email");
    const phoneDigits = address.phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) errs.phone = tx("Please enter a valid phone number");
    if (address.houseNumber.trim().length < 1) errs.houseNumber = tx("House/Building number is required");
    if (address.roadName.trim().length < 5) errs.roadName = tx("Road/Area must be at least 5 characters");
    if (address.city.trim().length < 2) errs.city = tx("City name must be at least 2 characters");
    if (!address.country) errs.country = tx("Please select a country");
    const countryStates = getStatesForCountry(address.country);
    if (countryStates.length > 0 && !address.state) errs.state = tx("Please select a state/region");
    if (address.country === 'IN') {
      if (!/^\d{6}$/.test(address.pinCode.trim())) errs.pinCode = tx("Please enter a valid 6-digit PIN code");
    } else {
      if (address.pinCode.trim().length < 3) errs.pinCode = tx("Please enter a valid postal/ZIP code");
    }
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }, [address]);

  const validatePinCode = useCallback(async (pin) => {
    if (address.country !== 'IN') return;
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
        setAddressErrors(prev => ({ ...prev, pinCode: tx("Invalid PIN code") }));
      }
    } catch {
      setAddressErrors(prev => ({ ...prev, pinCode: undefined }));
    } finally {
      setPinValidating(false);
    }
  }, [address.country]);

  const handleAddressChange = useCallback((field, value) => {
    if (field === 'country') {
      setAddress(prev => ({ ...prev, country: value, state: '' }));
      setAddressErrors(prev => ({ ...prev, country: undefined, state: undefined }));
      setSelectedAddressId(null);
      return;
    }
    setAddress(prev => ({ ...prev, [field]: value }));
    setAddressErrors(prev => ({ ...prev, [field]: undefined }));
    setSelectedAddressId(null);
    if (field === 'pinCode' && address.country === 'IN' && value.length === 6) {
      validatePinCode(value);
    }
  }, [validatePinCode, address.country]);

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
      country: addr.country || 'IN',
      state: addr.state || '',
      pinCode: addr.pin_code || '',
    }));
  }, []);

  useEffect(() => {
    if (!codEnabled && paymentMethod === 'cod') {
      setPaymentMethod('razorpay');
    }
  }, [codEnabled]);

  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Math.round((subtotal * appliedCoupon.value) / 100 * 100) / 100
      : Math.min(appliedCoupon.value, subtotal)
    : 0;

  const deliveryConfig = settings.deliveryConfig || {};
  const computeShippingCost = useCallback((orderSubtotal, customerCountry, customerState) => {
    if (!deliveryConfig.enabled) return 0;
    if (deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0 && orderSubtotal >= deliveryConfig.freeAbove) return 0;
    if (Array.isArray(deliveryConfig.regionRates) && customerCountry) {
      const countryName = getCountryName(customerCountry);
      if (customerState) {
        const csMatch = deliveryConfig.regionRates.find(r => r.country === countryName && r.state === customerState);
        if (csMatch && csMatch.rate !== '' && csMatch.rate != null) return Number(csMatch.rate) || 0;
      }
      const cMatch = deliveryConfig.regionRates.find(r => r.country === countryName && (!r.state || r.state === ''));
      if (cMatch && cMatch.rate !== '' && cMatch.rate != null) return Number(cMatch.rate) || 0;
      const legacyMatch = customerState ? deliveryConfig.regionRates.find(r => !r.country && r.state === customerState) : null;
      if (legacyMatch && legacyMatch.rate !== '' && legacyMatch.rate != null) return Number(legacyMatch.rate) || 0;
    }
    return Number(deliveryConfig.flatRate) || 0;
  }, [deliveryConfig]);

  const subtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const shippingCost = computeShippingCost(subtotalAfterCoupon, address.country, address.state);
  const finalTotal = subtotalAfterCoupon + shippingCost;
  const hasRegionOverrides = deliveryConfig.enabled && Array.isArray(deliveryConfig.regionRates) && deliveryConfig.regionRates.length > 0;
  const hasFullLocation = !!address.country && (statesForCountry.length === 0 || !!address.state);
  const showShippingNote = deliveryConfig.enabled && !hasFullLocation && (hasRegionOverrides || (deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0));

  const applyCoupon = useCallback(() => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError(tx("Please enter a coupon code")); return; }
    setCouponApplying(true);
    const found = availableCoupons.find(c => c.active && c.code.toUpperCase() === code);
    if (!found) { setCouponError(tx("Invalid coupon code")); setCouponApplying(false); return; }
    if (found.expiryDate && new Date(found.expiryDate) < new Date()) { setCouponError(tx("This coupon has expired")); setCouponApplying(false); return; }
    if (found.minOrder && subtotal < found.minOrder) { setCouponError(tx("Minimum order amount for this coupon is {{amount}}").replace('{{amount}}', formatAmount(found.minOrder))); setCouponApplying(false); return; }
    setAppliedCoupon(found);
    setCouponApplying(false);
  }, [couponCode, availableCoupons, subtotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  }, []);

  const validateCartStock = useCallback(async () => {
    if (!siteConfig?.id || items.length === 0) return true;
    try {
      const { apiRequest } = await import('../services/api.js');
      await apiRequest(`/api/orders/validate-stock`, {
        method: 'POST',
        body: JSON.stringify({
          siteId: siteConfig.id,
          items: items.map(item => ({
            productId: item.productId || item.product_id || item.id,
            name: item.name || item.product_name,
            quantity: item.quantity || 1,
          })),
        }),
      });
      return true;
    } catch (err) {
      setError(translateApiError(err, tx, tx("Some items in your cart are no longer available. Please update your cart and try again.")));
      return false;
    }
  }, [siteConfig, items]);

  const goToStep = useCallback(async (s) => {
    if (s === 2 && items.length === 0) {
      setError(tx("Your cart is empty"));
      return;
    }
    if (s === 2) {
      setLoading(true);
      const stockValid = await validateCartStock();
      setLoading(false);
      if (!stockValid) return;
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
            country: address.country,
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
  }, [items, validateAddress, validateCartStock, isAuthenticated, saveAddress, selectedAddressId, savedAddresses, address]);

  const placeOrder = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!siteConfig?.id) {
      setError(tx("Store configuration not loaded. Please refresh the page and try again."));
      setLoading(false);
      return;
    }

    const stockValid = await validateCartStock();
    if (!stockValid) {
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
        selectedOptions: item.selectedOptions || null,
      })),
      total: finalTotal,
      subtotal,
      shippingCost,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: couponDiscount || 0,
      shippingAddress: {
        name: customerName,
        email: address.email,
        phone: address.phone,
        address: `${address.houseNumber}, ${address.roadName}`,
        city: address.city,
        country: getCountryName(address.country),
        countryCode: address.country,
        state: address.state,
        pinCode: address.pinCode,
      },
      customerName,
      customerEmail: address.email,
      customerPhone: address.phone,
      paymentMethod,
      currency: siteDefaultCurrency,
      whatsappOptIn: whatsappNotificationsAvailable && whatsappOptIn,
    };

    if (paymentMethod === 'razorpay') {
      const razorpayKeyId = siteConfig?.settings?.razorpayKeyId || siteConfig?.settings?.razorpay_key_id;
      if (!razorpayKeyId) {
        setError(tx("Online payment is not configured for this store. Please use Cash on Delivery."));
        setLoading(false);
        return;
      }
      if (!window.Razorpay) {
        setError(tx("Payment gateway not loaded. Please refresh and try again."));
        setLoading(false);
        return;
      }

      let apiRequest;
      try {
        ({ apiRequest } = await import('../services/api.js'));

        const dbOrder = await orderService.createOrder(orderData);
        const order = dbOrder.data || dbOrder.order || dbOrder;
        const createdOrderId = order.id || order.orderId;
        const orderNumber = order.orderNumber || order.order_number;

        const paymentResult = await apiRequest('/api/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({
            amount: finalTotal,
            currency: siteDefaultCurrency,
            receipt: `order_${createdOrderId || Date.now()}`,
            siteId: siteConfig?.id,
            orderId: createdOrderId,
            notes: {},
          }),
        });

        const paymentData = paymentResult.data || paymentResult;
        const razorpayOrderId = paymentData.orderId || paymentData.razorpay_order_id;

        if (!razorpayOrderId) {
          setError(tx("Failed to initialize payment. Please try again."));
          setLoading(false);
          return;
        }

        const snapshotItems = [...items];
        const snapshotAddress = { ...address };
        const snapshotTotal = finalTotal;
        const snapshotDiscount = couponDiscount;
        const snapshotCoupon = appliedCoupon?.code || null;

        const options = {
          key: paymentData.keyId || razorpayKeyId,
          amount: paymentData.amount || Math.round(finalTotal * 100),
          currency: paymentData.currency || 'INR',
          name: siteConfig?.brandName || tx('Store'),
          description: tx("Store Order"),
          order_id: razorpayOrderId,
          handler: async function (response) {
            setLoading(true);
            try {
              await apiRequest('/api/payments/verify', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  siteId: siteConfig?.id,
                  orderId: createdOrderId,
                }),
              });
              const ref = orderNumber || createdOrderId || 'ORD-' + Date.now();
              setOrderRef(ref);
              setPlacedOrderDetails({ items: snapshotItems, address: snapshotAddress, paymentMethod: 'razorpay', total: snapshotTotal, discount: snapshotDiscount, couponCode: snapshotCoupon, originalTotal: subtotal, shippingCost });
              setOrderPlaced(true);
              clearAll();
            } catch (verifyErr) {
              console.error('Payment verification error:', verifyErr);
              setError(tx("Payment verification failed. If money was deducted, please contact support with your order reference."));
              setLoading(false);
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
          setError(tx("Payment failed: {{reason}}. Please try again.").replace('{{reason}}', resp.error?.description || tx("Unknown error")));
          setLoading(false);
        });
        rzp.open();
      } catch (err) {
        setError(translateApiError(err, tx, tx("Failed to initialize payment. Please try again.")));
        setLoading(false);
      }
      return;
    }

    try {
      const result = await orderService.createOrder(orderData);
      const order = result.data || result.order || result;
      const ref = order.orderNumber || order.order_number || order.id || order.order_id || 'ORD-' + Date.now();
      setOrderRef(ref);
      setPlacedOrderDetails({ items: [...items], address: { ...address }, paymentMethod, total: finalTotal, discount: couponDiscount, couponCode: appliedCoupon?.code || null, originalTotal: subtotal, shippingCost });
      setOrderPlaced(true);
      clearAll();
    } catch (err) {
      setError(translateApiError(err, tx, tx("Failed to place order. Please try again.")));
    }
    setLoading(false);
  }, [siteConfig, items, subtotal, address, paymentMethod, clearAll, validateCartStock]);

  if (orderPlaced) {
    const od = placedOrderDetails;
    return (
      <div className="checkout-page" style={{ maxWidth: 640, margin: '40px auto 60px', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ background: '#25ab00', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 34 }}>✓</div>
            <h2 style={{ color: '#fff', margin: '0 0 6px', fontFamily: "'Playfair Display', serif", fontSize: 24 }}><TranslatedText text="Order Placed Successfully!" /></h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: 14 }}><TranslatedText text="Thank you for your purchase. We'll get it ready for you." /></p>
          </div>

          <div style={{ padding: '24px 24px 0' }}>
            <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ color: '#555', fontSize: 14 }}><TranslatedText text="Order Reference" /></span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{orderRef}</span>
            </div>

            {od && (
              <>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}><TranslatedText text="Items Ordered" /></h4>
                <div style={{ marginBottom: 20 }}>
                  {od.items.map((item, i) => {
                    const price = item.product_price || item.price || 0;
                    const qty = item.quantity || 1;
                    const imgUrl = resolveImageUrl(item.thumbnail || item.product_image || item.image_url || '');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f7f7f7' }}>
                        {imgUrl && (
                          <img src={imgUrl} alt={item.product_name || item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name || item.name}</div>
                          {item.selectedOptions && (() => {
                            const parts = [];
                            if (item.selectedOptions.color) {
                              parts.push(<><TranslatedText text="Color" />{`: ${item.selectedOptions.color}`}</>);
                            }
                            if (item.selectedOptions.customOptions) {
                              for (const [label, value] of Object.entries(item.selectedOptions.customOptions)) {
                                parts.push(<><TranslatedText text={label} />{`: ${value}`}</>);
                              }
                            }
                            if (item.selectedOptions.pricedOptions) {
                              for (const [label, val] of Object.entries(item.selectedOptions.pricedOptions)) {
                                parts.push(<><TranslatedText text={label} />{`: ${val.name}`}</>);
                              }
                            }
                            return parts.length > 0 ? (
                              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                                {parts.map((p, k) => (
                                  <React.Fragment key={k}>{k > 0 ? ' \u2022 ' : ''}{p}</React.Fragment>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}><TranslatedText text="Qty:" /> {`${qty} × ${formatAmount(price)}`}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#7a4012', fontSize: 14, flexShrink: 0 }}>{formatAmount(price * qty)}</div>
                      </div>
                    );
                  })}
                </div>

                {od.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#16a34a', fontSize: 14 }}>{tx("Coupon ({{code}})").replace('{{code}}', od.couponCode)}</span>
                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>- {formatAmount(od.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 14 }}><TranslatedText text="Shipping" /></span>
                  <span style={{ fontWeight: 500, fontSize: 14, color: od.shippingCost > 0 ? '#1a1a1a' : '#25ab00' }}>
                    {od.shippingCost > 0 ? formatAmount(od.shippingCost) : <TranslatedText text="Free" />}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #f0f0f0', marginBottom: 24 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}><TranslatedText text="Total Paid" /></span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#7a4012' }}>{formatAmount(od.total)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}><TranslatedText text="Shipping To" /></div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 600 }}>{od.address.firstName} {od.address.lastName}</div>
                      <div>{od.address.houseNumber}, {od.address.roadName}</div>
                      <div>{od.address.city}, {od.address.state}</div>
                      <div>{od.address.country ? getCountryName(od.address.country) : ''}</div>
                      <div>{od.address.country === 'IN' ? <TranslatedText text="PIN" /> : <TranslatedText text="Postal Code" />}: {od.address.pinCode}</div>
                      <div style={{ marginTop: 4, color: '#666' }}>{od.address.phone}</div>
                    </div>
                  </div>
                  <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}><TranslatedText text="Payment" /></div>
                    <div style={{ fontSize: 13, color: '#333' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {od.paymentMethod === 'cod' ? <TranslatedText text="Cash on Delivery" /> : <TranslatedText text="Online Payment (Razorpay)" />}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {od.paymentMethod === 'cod'
                          ? <TranslatedText text="You will pay when the order is delivered to you." />
                          : <TranslatedText text="Payment completed successfully online." />}
                      </div>
                      <div style={{ marginTop: 10, display: 'inline-block', background: od.paymentMethod === 'cod' ? '#fff3e0' : '#e8f5e9', color: od.paymentMethod === 'cod' ? '#e65100' : '#2e7d32', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                        {od.paymentMethod === 'cod' ? <TranslatedText text="Pending" /> : <TranslatedText text="Paid" />}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <Link to="/" style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: '#7a4012', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 15,  }}>
              <TranslatedText text="Continue Shopping" />
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
          <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 15 }}><TranslatedText text="Your cart is empty" /></h2>
          <p style={{ color: '#777', marginBottom: 20 }}><TranslatedText text="Add some items to your cart before checkout." /></p>
          <Link to="/" style={{ background: '#7a4012', color: '#fff', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>
            <TranslatedText text="Browse Products" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" style={{ maxWidth: 900, margin: '40px auto 60px', padding: '0 20px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 30, textAlign: 'center',  }}><TranslatedText text="Checkout" /></h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, gap: 0 }}>
        {[
          { num: 1, label: tx("Order Summary"), icon: '&#128722;' },
          { num: 2, label: tx("Address"), icon: '&#128205;' },
          { num: 3, label: tx("Payment"), icon: '&#128179;' },
        ].map((s) => (
          <div key={s.num} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px', fontSize: 20, border: '2px solid',
              backgroundColor: step >= s.num ? (step > s.num ? ('#25ab00') : '#7a4012') : '#f8f9fa',
              borderColor: step >= s.num ? (step > s.num ? ('#25ab00') : '#7a4012') : '#eee',
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

      {error && <div style={{ background: '#ffebee', color: '#d32f2f', padding: 12, borderRadius: 6, marginBottom: 20, textAlign: 'center', border: '1px solid #f5c6cb' }}><TranslatedText text={error} /></div>}

      {step === 1 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20,  }}><TranslatedText text="Order Summary" /></h3>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {items.map((item, index) => {
              const price = item.product_price || item.price || 0;
              const qty = item.quantity || 1;
              const itemKey = cartItemKey ? cartItemKey(item) : (item.productId || item.product_id || item.id);
              return (
                <div key={itemKey || index} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
                  {(item.thumbnail || item.product_image || item.image_url) && resolveImageUrl(item.thumbnail || item.product_image || item.image_url) && (
                    <div style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={resolveImageUrl(item.thumbnail || item.product_image || item.image_url)} alt={item.product_name || item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.product_name || item.name}</h6>
                    {item.selectedOptions && (() => {
                      const parts = [];
                      if (item.selectedOptions.color) {
                        parts.push(<><TranslatedText text="Color" />{`: ${item.selectedOptions.color}`}</>);
                      }
                      if (item.selectedOptions.customOptions) {
                        for (const [label, value] of Object.entries(item.selectedOptions.customOptions)) {
                          parts.push(<><TranslatedText text={label} />{`: ${value}`}</>);
                        }
                      }
                      if (item.selectedOptions.pricedOptions) {
                        for (const [label, val] of Object.entries(item.selectedOptions.pricedOptions)) {
                          parts.push(<><TranslatedText text={label} />{`: ${val.name}`}</>);
                        }
                      }
                      return parts.length > 0 ? (
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                          {parts.map((p, k) => (
                            <React.Fragment key={k}>{k > 0 ? ' \u2022 ' : ''}{p}</React.Fragment>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{formatAmount(price)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: 4, overflow: 'hidden', height: 30 }}>
                          <button type="button" onClick={() => updateQuantity(itemKey, qty - 1, item.selectedOptions)} style={{ width: 28, height: 28, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                          <span style={{ padding: '0 8px', fontSize: 14, fontWeight: 500 }}>{qty}</span>
                          <button type="button" onClick={() => updateQuantity(itemKey, qty + 1, item.selectedOptions)} style={{ width: 28, height: 28, border: 'none', background: '#f8f9fa', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 600, color: '#9c7c38' }}>{formatAmount(price * qty)}</span>
                        <button type="button" onClick={() => removeItem(itemKey, item.selectedOptions)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}>x</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}><TranslatedText text="Subtotal" /></span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{formatAmount(subtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 500 }}>
                  {tx("Coupon ({{code}})").replace('{{code}}', appliedCoupon.code)}
                </span>
                <span style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>- {formatAmount(couponDiscount)}</span>
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}><TranslatedText text="Shipping" /></span>
                <span style={{ fontSize: 14, fontWeight: 600, color: shippingCost > 0 ? '#1a1a1a' : '#25ab00' }}>
                  {shippingCost > 0 ? formatAmount(shippingCost) : <TranslatedText text="Free" />}
                </span>
              </div>
              {showShippingNote && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, textAlign: 'end' }}><TranslatedText text="May vary based on your location" /></div>
              )}
              {deliveryConfig.enabled && deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0 && shippingCost > 0 && (
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3, textAlign: 'end' }}><TranslatedText text="Free shipping on orders above" /> {formatAmount(deliveryConfig.freeAbove)}</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}><TranslatedText text="Total" /></span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#7a4012' }}>{formatAmount(finalTotal)}</span>
            </div>
          </div>

          {availableCoupons.some(c => c.active) && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {!appliedCoupon ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}><TranslatedText text="Have a coupon code?" /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder={tx("Enter code")}
                      style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponApplying}
                      style={{ padding: '9px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      <TranslatedText text="Apply" />
                    </button>
                  </div>
                  {couponError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}><TranslatedText text={couponError} /></div>}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{tx("✓ Coupon applied: {{code}}").replace('{{code}}', appliedCoupon.code)}</span>
                    <span style={{ fontSize: 13, color: '#64748b', marginInlineStart: 8 }}>
                      ({appliedCoupon.type === 'percent' ? tx("{{value}}% off").replace('{{value}}', String(appliedCoupon.value)) : tx("{{amount}} off").replace('{{amount}}', formatAmount(appliedCoupon.value))})
                    </span>
                  </div>
                  <button type="button" onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}><TranslatedText text="Remove" /></button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>
            <Link to="/" style={{ padding: '10px 20px', border: `1px solid ${'#9c7c38'}`, color: '#9c7c38', borderRadius: 0, textDecoration: 'none', fontWeight: 500 }}><TranslatedText text="Continue Shopping" /></Link>
            <button onClick={() => goToStep(2)} disabled={loading} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{loading ? (<><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /><TranslatedText text="Checking Availability..." /></>) : <TranslatedText text="Continue to Address" />}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20,  }}><TranslatedText text="Shipping Address" /></h3>

          {isAuthenticated && savedAddresses.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h5 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}><TranslatedText text="Saved Addresses" /></h5>
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
                    {sa.is_default === 1 && <span style={{ fontSize: 11, color: '#fff', background: '#7a4012', padding: '1px 8px', borderRadius: 10 }}><TranslatedText text="Default" /></span>}
                  </div>
                  <div style={{ color: '#555', fontSize: 14, lineHeight: 1.4 }}>
                    {sa.house_number}{sa.road_name ? `, ${sa.road_name}` : ''}, {sa.city}{sa.state ? `, ${sa.state}` : ''} - {sa.pin_code}{sa.country && sa.country !== 'IN' ? `, ${getCountryName(sa.country)}` : ''}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16, marginTop: 8 }}>
                <button type="button" onClick={() => { setSelectedAddressId(null); setAddress(prev => ({ ...prev, houseNumber: '', roadName: '', city: '', country: 'IN', state: '', pinCode: '', phone: '' })); }} style={{ background: 'none', border: 'none', color: '#7a4012', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}><TranslatedText text="+ Use a New Address" /></button>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="First Name *" /></label>
                <input type="text" value={address.firstName} onChange={e => handleAddressChange('firstName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.firstName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.firstName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.firstName}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="Last Name *" /></label>
                <input type="text" value={address.lastName} onChange={e => handleAddressChange('lastName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.lastName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.lastName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.lastName}</div>}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="Email *" /></label>
              <input type="email" value={address.email} onChange={e => handleAddressChange('email', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.email ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.email && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.email}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="Phone *" /></label>
              <PhoneInput
                value={address.phone}
                onChange={val => handleAddressChange('phone', val)}
                countryCode={address.country}
                error={addressErrors.phone}
              />
              {addressErrors.phone && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.phone}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="House/Building Number *" /></label>
              <input type="text" value={address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.houseNumber ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.houseNumber && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.houseNumber}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="Road Name / Area / Colony *" /></label>
              <input type="text" value={address.roadName} onChange={e => handleAddressChange('roadName', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.roadName ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              {addressErrors.roadName && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.roadName}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="Country *" /></label>
              <select value={address.country} onChange={e => handleAddressChange('country', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.country ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                <option value="">{tx("Select Country")}</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              {addressErrors.country && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.country}</div>}
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}>{address.country === 'IN' ? <TranslatedText text="PIN Code *" /> : <TranslatedText text="Postal / ZIP Code *" />}</label>
                <input type="text" maxLength={address.country === 'IN' ? 6 : 15} value={address.pinCode} onChange={e => handleAddressChange('pinCode', address.country === 'IN' ? e.target.value.replace(/\D/g, '') : e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.pinCode ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {pinValidating && <div style={{ color: '#7a4012', fontSize: 12, marginTop: 4 }}><TranslatedText text="Validating PIN code..." /></div>}
                {addressErrors.pinCode && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.pinCode}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="City *" /></label>
                <input type="text" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.city ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
                {addressErrors.city && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.city}</div>}
              </div>
            </div>
            {statesForCountry.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333', fontSize: 14 }}><TranslatedText text="State / Region *" /></label>
                <select value={address.state} onChange={e => handleAddressChange('state', e.target.value)} style={{ width: '100%', padding: 12, border: `1px solid ${addressErrors.state ? '#e74c3c' : '#ddd'}`, borderRadius: 4, fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                  <option value="">{tx("Select State / Region")}</option>
                  {statesForCountry.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {addressErrors.state && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{addressErrors.state}</div>}
              </div>
            )}
          </div>

          {isAuthenticated && !selectedAddressId && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: '#f8f6f0', borderRadius: 6, border: `1px solid ${'#e8e0d0'}` }}>
              <input type="checkbox" id="saveAddr" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} style={{ width: 'auto', marginInlineEnd: 10, accentColor: '#7a4012' }} />
              <label htmlFor="saveAddr" style={{ color: '#333', fontSize: 14, cursor: 'pointer' }}><TranslatedText text="Save this address to my account for faster checkout" /></label>
            </div>
          )}

          {whatsappNotificationsAvailable && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, padding: '12px 16px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <input type="checkbox" id="whatsappOptIn" checked={whatsappOptIn} onChange={e => setWhatsappOptIn(e.target.checked)} style={{ width: 'auto', marginInlineEnd: 10, marginTop: 2, accentColor: '#25D366' }} />
              <label htmlFor="whatsappOptIn" style={{ color: '#333', fontSize: 14, cursor: 'pointer', lineHeight: 1.4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fab fa-whatsapp" style={{ color: '#25D366', fontSize: 16 }} />
                  <TranslatedText text="Get order updates on WhatsApp" />
                </span>
                <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}><TranslatedText text="Receive confirmation, shipping and delivery updates on your phone number" /></span>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <button onClick={() => goToStep(1)} style={{ padding: '10px 20px', border: `1px solid #7a4012`, background: 'transparent', color: '#7a4012', cursor: 'pointer', fontWeight: 500 }}><TranslatedText text="Back to Summary" /></button>
            <button onClick={() => goToStep(3)} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}><TranslatedText text="Continue to Payment" /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: '#fff', padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 20,  }}><TranslatedText text="Payment" /></h3>

          <div style={{ background: '#f8f6f0', padding: 16, borderInlineStart: `3px solid #7a4012`, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            <strong><TranslatedText text="Shipping To:" /></strong><br />
            {address.firstName} {address.lastName}<br />
            {address.houseNumber}, {address.roadName}<br />
            {address.city}{address.state ? `, ${address.state}` : ''} - {address.pinCode}<br />
            {getCountryName(address.country)}<br />
            <TranslatedText text="Phone: {{phone}} | Email: {{email}}" vars={{ phone: address.phone, email: address.email }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <h5 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}><TranslatedText text="Order Total" /></h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span><TranslatedText text="Subtotal ({{count}} items)" vars={{ count: items.length }} /></span>
              <span style={{ fontWeight: 600 }}>{formatAmount(subtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#16a34a' }}><TranslatedText text="Coupon ({{code}})" vars={{ code: appliedCoupon.code }} /></span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>- {formatAmount(couponDiscount)}</span>
              </div>
            )}
            <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><TranslatedText text="Shipping" /></span>
                <span style={{ color: shippingCost > 0 ? '#1a1a1a' : '#25ab00', fontWeight: 500 }}>
                  {shippingCost > 0 ? formatAmount(shippingCost) : <TranslatedText text="Free" />}
                </span>
              </div>
              {deliveryConfig.enabled && deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0 && shippingCost > 0 && (
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, textAlign: 'end' }}><TranslatedText text="Free shipping on orders above {{amount}}" vars={{ amount: formatAmount(deliveryConfig.freeAbove) }} /></div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 700 }}>
              <span><TranslatedText text="Total" /></span>
              <span style={{ color: '#7a4012' }}>{formatAmount(finalTotal)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h5 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}><TranslatedText text="Payment Method" /></h5>
            {codEnabled && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: `2px solid ${paymentMethod === 'cod' ? '#7a4012' : '#e0e0e0'}`, borderRadius: 8, marginBottom: 12, cursor: 'pointer', background: paymentMethod === 'cod' ? '#f8f6f0' : '#fff' }}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ accentColor: '#7a4012' }} />
                <div>
                  <div style={{ fontWeight: 600 }}><TranslatedText text="Cash on Delivery (COD)" /></div>
                  <div style={{ fontSize: 13, color: '#666' }}><TranslatedText text="Pay when you receive your order" /></div>
                </div>
              </label>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: `2px solid ${paymentMethod === 'razorpay' ? '#7a4012' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: paymentMethod === 'razorpay' ? '#f8f6f0' : '#fff' }}>
              <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} style={{ accentColor: '#7a4012' }} />
              <div>
                <div style={{ fontWeight: 600 }}><TranslatedText text="Pay Online (Razorpay)" /></div>
                <div style={{ fontSize: 13, color: '#666' }}><TranslatedText text="Credit/Debit Card, UPI, Net Banking" /></div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <button onClick={() => goToStep(2)} style={{ padding: '10px 20px', border: `1px solid #7a4012`, background: 'transparent', color: '#7a4012', cursor: 'pointer', fontWeight: 500 }}><TranslatedText text="Back to Address" /></button>
            <button onClick={placeOrder} disabled={loading} style={{ padding: '10px 24px', background: '#7a4012', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? <TranslatedText text="Processing..." /> : <TranslatedText text="Place Order" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
