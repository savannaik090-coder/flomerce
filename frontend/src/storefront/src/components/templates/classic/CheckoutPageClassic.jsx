import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../../../context/CartContext.jsx';
import { translateApiError } from '../../../services/errorMessages.js';
import { AuthContext } from '../../../context/AuthContext.jsx';
import { SiteContext } from '../../../context/SiteContext.jsx';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import { CurrencyContext } from '../../../context/CurrencyContext.jsx';
import { COUNTRIES, getStatesForCountry, getCountryName } from '../../../utils/countryStates.js';
import PhoneInput from '../../ui/PhoneInput.jsx';
import * as orderService from '../../../services/orderService.js';
import * as authService from '../../../services/authService.js';
import { getApiUrl } from '../../../services/api.js';
import TranslatedText from '../../TranslatedText';
import { useShopperTranslation } from '../../../context/ShopperTranslationContext.jsx';

const T = {
  bg: '#FAF3E8',
  cardBg: '#FEFCF7',
  border: '#D9C5A0',
  borderInput: '#C5A87E',
  borderFocus: '#8B5E3C',
  stepActive: '#8B5E3C',
  stepDone: '#C8960C',
  dark: '#2E1A0E',
  body: '#5C3D1E',
  muted: '#8B7355',
  btn: '#4A2E17',
  btnText: '#FAF3E8',
  gold: '#C8960C',
  successGreen: '#2d6a4f',
  errorBg: '#FDE8DC',
  errorBorder: '#C5714A',
  errorText: '#7A2800',
};

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" };
const BODY  = { fontFamily: "'Lora', Georgia, serif" };

const S = {
  label: { display: 'block', fontSize: 13, color: T.body, marginBottom: 5, ...BODY },
  input: {
    width: '100%', background: T.cardBg, border: `1px solid ${T.borderInput}`,
    padding: '10px 13px', color: T.dark, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', ...BODY, transition: 'border-color 0.2s',
  },
  fieldError: { fontSize: 12, color: T.errorText, marginTop: 4, ...BODY },
  card: { background: T.cardBg, border: `1px solid ${T.border}`, padding: '28px 28px 24px' },
  cardHeading: { ...SERIF, fontSize: 20, fontWeight: 600, color: T.dark, margin: '0 0 20px' },
  primaryBtn: {
    background: T.btn, color: T.btnText, border: 'none', padding: '13px 24px',
    ...SERIF, fontSize: 15, fontWeight: 500, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  outlineBtn: {
    background: 'transparent', color: T.btn, border: `1px solid ${T.btn}`,
    padding: '12px 20px', ...SERIF, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  goldOutlineBtn: {
    background: 'transparent', color: T.stepFocus, border: `1px solid ${T.stepActive}`,
    color: T.stepActive, padding: '10px 20px', ...BODY, fontSize: 14, cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

function FieldRow({ children, span2 }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : undefined }}>{children}</div>
  );
}

export default function CheckoutPageClassic() {
  const { items, subtotal, updateQuantity, removeItem, clearAll, cartItemKey } = useContext(CartContext);
  const { user, isAuthenticated } = useContext(AuthContext);
  const { siteConfig } = useContext(SiteContext);
  const { formatAmount, siteDefaultCurrency } = useContext(CurrencyContext);
  const { translate: tx } = useShopperTranslation();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [address, setAddress] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    houseNumber: '', roadName: '', city: '', country: 'IN', state: '', pinCode: '',
  });
  const [addressErrors, setAddressErrors]     = useState({});
  const [pinValidating, setPinValidating]     = useState(false);
  const [savedAddresses, setSavedAddresses]   = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [saveAddress, setSaveAddress]         = useState(true);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  const [paymentMethod, setPaymentMethod]   = useState('cod');
  const [orderPlaced, setOrderPlaced]       = useState(false);
  const [orderRef, setOrderRef]             = useState('');
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  const [couponCode, setCouponCode]       = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError]     = useState('');
  const [couponApplying, setCouponApplying] = useState(false);

  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  const settings                    = siteConfig?.settings || {};
  const codEnabled                  = settings.codEnabled !== false;
  const shiprocketEnabled           = settings.shiprocketEnabled === true;
  const availableCoupons            = Array.isArray(settings.coupons) ? settings.coupons : [];
  const whatsappNotificationsAvailable = settings.whatsappNotificationsEnabled === true;

  const [serviceability, setServiceability]           = useState(null);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAddress(prev => ({
        ...prev,
        firstName: user.name?.split(' ')[0] || '',
        lastName:  user.name?.split(' ').slice(1).join(' ') || '',
        email:     user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && !addressesLoaded) {
      (async () => {
        try {
          const result = await authService.getAddresses();
          const addrs = result.data || result || [];
          const list  = Array.isArray(addrs) ? addrs : [];
          setSavedAddresses(list);
          if (list.length > 0) {
            const def = list.find(a => a.is_default === 1) || list[0];
            selectSavedAddress(def);
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
    if (address.lastName.trim().length  < 2) errs.lastName  = tx("Last name must be at least 2 characters");
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(address.email.trim())) errs.email = tx("Please enter a valid email");
    const phoneDigits = address.phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) errs.phone = tx("Please enter a valid phone number");
    if (address.houseNumber.trim().length < 1) errs.houseNumber = tx("House/Building number is required");
    if (address.roadName.trim().length   < 5) errs.roadName    = tx("Road/Area must be at least 5 characters");
    if (address.city.trim().length       < 2) errs.city        = tx("City name must be at least 2 characters");
    if (!address.country) errs.country = tx("Please select a country");
    const cs = getStatesForCountry(address.country);
    if (cs.length > 0 && !address.state) errs.state = tx("Please select a state/region");
    if (address.country === 'IN') {
      if (!/^\d{6}$/.test(address.pinCode.trim())) errs.pinCode = tx("Please enter a valid 6-digit PIN code");
    } else {
      if (address.pinCode.trim().length < 3) errs.pinCode = tx("Please enter a valid postal/ZIP code");
    }
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }, [address, tx]);

  const validatePinCode = useCallback(async (pin) => {
    if (address.country !== 'IN') return;
    if (!/^\d{6}$/.test(pin)) return;
    setPinValidating(true);
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await resp.json();
      if (data?.[0]?.Status === 'Success') {
        const po = data[0].PostOffice[0];
        setAddress(prev => ({ ...prev, city: po.District || prev.city, state: po.State || prev.state }));
        setAddressErrors(prev => ({ ...prev, pinCode: undefined }));
      } else {
        setAddressErrors(prev => ({ ...prev, pinCode: tx("Invalid PIN code") }));
      }
    } catch {
      setAddressErrors(prev => ({ ...prev, pinCode: undefined }));
    } finally {
      setPinValidating(false);
    }
  }, [address.country, tx]);

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
    if (field === 'pinCode' && address.country === 'IN' && value.length === 6) validatePinCode(value);
  }, [validatePinCode, address.country]);

  const selectSavedAddress = useCallback((addr) => {
    setSelectedAddressId(addr.id);
    setAddress(prev => ({
      ...prev,
      firstName:   addr.first_name  || prev.firstName,
      lastName:    addr.last_name   || prev.lastName,
      phone:       addr.phone       || prev.phone,
      houseNumber: addr.house_number || '',
      roadName:    addr.road_name   || '',
      city:        addr.city        || '',
      country:     addr.country     || 'IN',
      state:       addr.state       || '',
      pinCode:     addr.pin_code    || '',
    }));
  }, []);

  useEffect(() => {
    if (!codEnabled && paymentMethod === 'cod') setPaymentMethod('razorpay');
  }, [codEnabled]);

  const itemsSig = useMemo(
    () => items.map(i => `${i.productId || i.product_id}:${i.quantity || 1}`).join(','),
    [items]
  );

  useEffect(() => {
    if (!shiprocketEnabled)      { setServiceability(null); return; }
    if (!siteConfig?.id)         { setServiceability(null); return; }
    if (address.country !== 'IN'){ setServiceability(null); return; }
    const pin = (address.pinCode || '').trim();
    if (!/^\d{6}$/.test(pin))   { setServiceability(null); return; }
    if (!itemsSig)               { setServiceability(null); return; }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setServiceabilityLoading(true);
      try {
        const codFlag = (paymentMethod === 'cod' && codEnabled) ? 1 : 0;
        const url = getApiUrl(
          `/api/shipping/serviceability?siteId=${encodeURIComponent(siteConfig.id)}` +
          `&pincode=${pin}&items=${encodeURIComponent(itemsSig)}&cod=${codFlag}`
        );
        const resp = await fetch(url, { method: 'GET' });
        const body = await resp.json().catch(() => null);
        if (cancelled) return;
        const svc = body && typeof body === 'object' ? (body.data ?? null) : null;
        setServiceability(svc && typeof svc === 'object' ? svc : null);
      } catch {
        if (!cancelled) setServiceability(null);
      } finally {
        if (!cancelled) setServiceabilityLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [shiprocketEnabled, siteConfig?.id, address.country, address.pinCode, itemsSig, codEnabled, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === 'cod' && serviceability?.serviceable && codEnabled && serviceability.codAvailable === false) {
      setPaymentMethod('razorpay');
    }
  }, [serviceability, paymentMethod, codEnabled]);

  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Math.round((subtotal * appliedCoupon.value) / 100 * 100) / 100
      : Math.min(appliedCoupon.value, subtotal)
    : 0;

  const deliveryConfig = settings.deliveryConfig || {};
  const computeShippingCost = useCallback((sub, country, state) => {
    if (!deliveryConfig.enabled) return 0;
    if (deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0 && sub >= deliveryConfig.freeAbove) return 0;
    if (Array.isArray(deliveryConfig.regionRates) && country) {
      const cn = getCountryName(country);
      if (state) {
        const m = deliveryConfig.regionRates.find(r => r.country === cn && r.state === state);
        if (m && m.rate !== '' && m.rate != null) return Number(m.rate) || 0;
      }
      const m = deliveryConfig.regionRates.find(r => r.country === cn && (!r.state || r.state === ''));
      if (m && m.rate !== '' && m.rate != null) return Number(m.rate) || 0;
      const leg = state ? deliveryConfig.regionRates.find(r => !r.country && r.state === state) : null;
      if (leg && leg.rate !== '' && leg.rate != null) return Number(leg.rate) || 0;
    }
    return Number(deliveryConfig.flatRate) || 0;
  }, [deliveryConfig]);

  const subtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const staticShippingCost  = computeShippingCost(subtotalAfterCoupon, address.country, address.state);
  const freeAboveActive     = !!(deliveryConfig.enabled && deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0 && subtotalAfterCoupon >= deliveryConfig.freeAbove);
  const dynamicQuote        = (!freeAboveActive && serviceability?.serviceable && typeof serviceability?.dynamicShippingFee === 'number' && Number.isFinite(serviceability.dynamicShippingFee) && serviceability.dynamicShippingFee >= 0) ? serviceability.dynamicShippingFee : null;
  const shippingCost        = dynamicQuote != null ? dynamicQuote : staticShippingCost;
  const isCarrierQuoted     = dynamicQuote != null;
  const finalTotal          = subtotalAfterCoupon + shippingCost;
  const hasRegionOverrides  = deliveryConfig.enabled && Array.isArray(deliveryConfig.regionRates) && deliveryConfig.regionRates.length > 0;
  const hasFullLocation     = !!address.country && (statesForCountry.length === 0 || !!address.state);
  const showShippingNote    = deliveryConfig.enabled && !hasFullLocation && (hasRegionOverrides || (deliveryConfig.freeAboveEnabled && deliveryConfig.freeAbove > 0));

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
  }, [couponCode, availableCoupons, subtotal, tx, formatAmount]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  }, []);

  const validateCartStock = useCallback(async () => {
    if (!siteConfig?.id || items.length === 0) return true;
    try {
      const { apiRequest } = await import('../../../services/api.js');
      await apiRequest('/api/orders/validate-stock', {
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
  }, [siteConfig, items, tx]);

  const goToStep = useCallback(async (s) => {
    if (s === 2 && items.length === 0) { setError(tx("Your cart is empty")); return; }
    if (s === 2) {
      setLoading(true);
      const ok = await validateCartStock();
      setLoading(false);
      if (!ok) return;
    }
    if (s === 3) {
      if (!validateAddress()) return;
      if (isAuthenticated && saveAddress && !selectedAddressId) {
        try {
          await authService.createAddress({
            label: 'Home',
            firstName: address.firstName, lastName: address.lastName, phone: address.phone,
            houseNumber: address.houseNumber, roadName: address.roadName, city: address.city,
            country: address.country, state: address.state, pinCode: address.pinCode,
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
  }, [items, validateAddress, validateCartStock, isAuthenticated, saveAddress, selectedAddressId, savedAddresses, address, tx]);

  const placeOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!siteConfig?.id) {
      setError(tx("Store configuration not loaded. Please refresh the page and try again."));
      setLoading(false);
      return;
    }
    const stockValid = await validateCartStock();
    if (!stockValid) { setLoading(false); return; }

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
      total: finalTotal, subtotal, shippingCost,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: couponDiscount || 0,
      shippingAddress: {
        name: customerName, email: address.email, phone: address.phone,
        address: `${address.houseNumber}, ${address.roadName}`,
        city: address.city, country: getCountryName(address.country),
        countryCode: address.country, state: address.state, pinCode: address.pinCode,
      },
      customerName, customerEmail: address.email, customerPhone: address.phone,
      paymentMethod, currency: siteDefaultCurrency,
      whatsappOptIn: whatsappNotificationsAvailable && whatsappOptIn,
      signedQuote: serviceability?.signedQuote || null,
    };

    if (paymentMethod === 'razorpay') {
      const razorpayKeyId = siteConfig?.settings?.razorpayKeyId || siteConfig?.settings?.razorpay_key_id;
      if (!razorpayKeyId) { setError(tx("Online payment is not configured for this store. Please use Cash on Delivery.")); setLoading(false); return; }
      if (!window.Razorpay) { setError(tx("Payment gateway not loaded. Please refresh and try again.")); setLoading(false); return; }
      let apiRequest;
      try {
        ({ apiRequest } = await import('../../../services/api.js'));
        const dbOrder   = await orderService.createOrder(orderData);
        const order     = dbOrder.data || dbOrder.order || dbOrder;
        const createdOrderId = order.id || order.orderId;
        const orderNumber    = order.orderNumber || order.order_number;
        const paymentResult  = await apiRequest('/api/payments/create-order', {
          method: 'POST',
          body: JSON.stringify({
            amount: finalTotal, currency: siteDefaultCurrency,
            receipt: `order_${createdOrderId || Date.now()}`,
            siteId: siteConfig?.id, orderId: createdOrderId, notes: {},
          }),
        });
        const paymentData    = paymentResult.data || paymentResult;
        const razorpayOrderId = paymentData.orderId || paymentData.razorpay_order_id;
        if (!razorpayOrderId) { setError(tx("Failed to initialize payment. Please try again.")); setLoading(false); return; }
        const snapshotItems   = [...items];
        const snapshotAddress = { ...address };
        const options = {
          key: paymentData.keyId || razorpayKeyId,
          amount: paymentData.amount || Math.round(finalTotal * 100),
          currency: paymentData.currency || 'INR',
          name: siteConfig?.brandName || tx('Store'),
          description: tx("Store Order"),
          order_id: razorpayOrderId,
          handler: async function(response) {
            setLoading(true);
            try {
              await apiRequest('/api/payments/verify', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  siteId: siteConfig?.id, orderId: createdOrderId,
                }),
              });
              setOrderRef(orderNumber || createdOrderId || 'ORD-' + Date.now());
              setPlacedOrderDetails({ items: snapshotItems, address: snapshotAddress, paymentMethod: 'razorpay', total: finalTotal, discount: couponDiscount, couponCode: appliedCoupon?.code || null, originalTotal: subtotal, shippingCost });
              setOrderPlaced(true);
              clearAll();
            } catch (verifyErr) {
              setError(tx("Payment verification failed. If money was deducted, please contact support with your order reference."));
              setLoading(false);
            }
          },
          modal: { ondismiss: function() { setLoading(false); } },
          prefill: { name: customerName, email: address.email, contact: address.phone },
          theme: { color: siteConfig?.primaryColor || T.btn },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(resp) {
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
      const order  = result.data || result.order || result;
      const ref    = order.orderNumber || order.order_number || order.id || order.order_id || 'ORD-' + Date.now();
      setOrderRef(ref);
      setPlacedOrderDetails({ items: [...items], address: { ...address }, paymentMethod, total: finalTotal, discount: couponDiscount, couponCode: appliedCoupon?.code || null, originalTotal: subtotal, shippingCost });
      setOrderPlaced(true);
      clearAll();
    } catch (err) {
      setError(translateApiError(err, tx, tx("Failed to place order. Please try again.")));
    }
    setLoading(false);
  }, [siteConfig, items, subtotal, address, paymentMethod, clearAll, validateCartStock, tx, finalTotal, shippingCost, couponDiscount, appliedCoupon, siteDefaultCurrency, whatsappNotificationsAvailable, whatsappOptIn, serviceability]);

  const fontStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:wght@400;500;600;700&display=swap');
    @keyframes wp-spin { to { transform: rotate(360deg); } }
    @media (min-width: 1024px) {
      .wp-cols     { flex-direction: row !important; }
      .wp-main-col { width: 60% !important; }
      .wp-side-col { width: 40% !important; }
    }
    .wp-input:focus { border-color: ${T.borderFocus} !important; box-shadow: 0 0 0 2px rgba(139,94,60,0.12); }
    .wp-coupon-apply:hover { background: ${T.stepActive} !important; color: ${T.btnText} !important; }
    .wp-primary-btn:hover  { background: #3E2200 !important; }
    .wp-outline-btn:hover  { background: ${T.btn} !important; color: ${T.btnText} !important; }
    .wp-saved-addr:hover   { border-color: ${T.stepActive} !important; }
    .wp-payment-card:hover { border-color: ${T.borderInput} !important; }
  `;

  const brandName = siteConfig?.brandName || siteConfig?.brand_name || 'Store';

  function StepWizard() {
    const steps = [
      { num: 1, label: tx('Cart') },
      { num: 2, label: tx('Details') },
      { num: 3, label: tx('Payment') },
    ];
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 1, background: T.border, zIndex: 0 }} />
          {steps.map((s, i) => {
            const done   = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done   ? T.cardBg   : active ? T.stepActive : T.cardBg,
                  border: done       ? `2px solid ${T.stepDone}` : active ? 'none' : `1px solid ${T.border}`,
                  color:  done       ? T.stepDone : active ? '#fff'        : T.muted,
                  fontSize: 14, fontWeight: 600, ...BODY,
                  boxShadow: active ? `0 0 0 3px rgba(139,94,60,0.15)` : 'none',
                }}>
                  {done ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 11, ...BODY, textTransform: 'uppercase', letterSpacing: '0.08em', color: active ? T.stepActive : done ? T.stepDone : T.muted, fontWeight: active ? 600 : 400 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function CouponPanel() {
    return (
      <div style={{ marginTop: 16 }}>
        {!appliedCoupon ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="wp-input"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                placeholder={tx("Coupon code")}
                style={{ ...S.input, flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}
              />
              <button
                type="button"
                className="wp-coupon-apply"
                onClick={applyCoupon}
                disabled={couponApplying}
                style={{ padding: '10px 16px', background: 'transparent', border: `1px solid ${T.stepActive}`, color: T.stepActive, ...BODY, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >
                <TranslatedText text="Apply" />
              </button>
            </div>
            {couponError && <div style={{ ...S.fieldError, marginTop: 6 }}><TranslatedText text={couponError} /></div>}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#EBF5EB', border: `1px solid #A7D4A7` }}>
            <span style={{ fontSize: 13, color: T.successGreen, fontWeight: 600, ...BODY }}>
              ✓ {appliedCoupon.code} ({appliedCoupon.type === 'percent' ? `${appliedCoupon.value}% off` : `${formatAmount(appliedCoupon.value)} off`})
            </span>
            <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, ...BODY, textDecoration: 'underline' }}>
              <TranslatedText text="Remove" />
            </button>
          </div>
        )}
      </div>
    );
  }

  function OrderSummarySidebar() {
    return (
      <div style={{ ...S.card, padding: '24px 24px 28px' }}>
        <h3 style={{ ...S.cardHeading, fontSize: 18, marginBottom: 20 }}>
          <TranslatedText text="Your Order" />
        </h3>

        <div style={{ marginBottom: 16 }}>
          {items.map((item, i) => {
            const price  = item.product_price || item.price || 0;
            const qty    = item.quantity || 1;
            const imgUrl = resolveImageUrl(item.thumbnail || item.product_image || item.image_url || '');
            return (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 52, height: 52, background: T.bg, border: `1px solid ${T.border}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imgUrl
                    ? <img src={imgUrl} alt={item.product_name || item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 20 }}>🛍</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.dark, ...BODY, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name || item.name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, ...BODY }}><TranslatedText text="Qty:" /> {qty}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.dark, ...BODY, flexShrink: 0 }}>{formatAmount(price * qty)}</div>
              </div>
            );
          })}
        </div>

        {availableCoupons.some(c => c.active) && <CouponPanel />}

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.body, ...BODY }}>
            <span><TranslatedText text="Subtotal" /></span>
            <span>{formatAmount(subtotal)}</span>
          </div>
          {couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.successGreen, ...BODY }}>
              <span><TranslatedText text="Discount" /></span>
              <span>- {formatAmount(couponDiscount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.body, ...BODY }}>
            <span><TranslatedText text="Shipping" /></span>
            <span style={{ color: shippingCost === 0 ? T.successGreen : T.body }}>
              {step < 3 && !hasFullLocation
                ? <TranslatedText text="Calculated at next step" />
                : shippingCost > 0 ? formatAmount(shippingCost) : <TranslatedText text="Free" />}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, color: T.dark, borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 4, ...SERIF }}>
            <span><TranslatedText text="Total" /></span>
            <span>{formatAmount(finalTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: T.muted, ...BODY }}>
          <span>🔒</span>
          <span><TranslatedText text="Secure SSL Checkout" /></span>
        </div>
      </div>
    );
  }

  function SelectedOptionsSummary({ item }) {
    if (!item.selectedOptions) return null;
    const parts = [];
    if (item.selectedOptions.color) parts.push(`Color: ${item.selectedOptions.color}`);
    if (item.selectedOptions.customOptions) {
      for (const [label, value] of Object.entries(item.selectedOptions.customOptions)) parts.push(`${label}: ${value}`);
    }
    if (item.selectedOptions.pricedOptions) {
      for (const [label, val] of Object.entries(item.selectedOptions.pricedOptions)) parts.push(`${label}: ${val.name}`);
    }
    if (!parts.length) return null;
    return <div style={{ fontSize: 11, color: T.muted, marginTop: 2, ...BODY }}>{parts.join(' · ')}</div>;
  }

  if (orderPlaced) {
    const od = placedOrderDetails;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, ...BODY, padding: '40px 16px 60px' }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyle }} />
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ ...SERIF, fontSize: 28, color: T.dark }}>{brandName}</h1>
            <div style={{ height: 1, background: T.gold, marginTop: 8 }} />
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ background: T.btn, padding: '36px 28px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'rgba(250,243,232,0.2)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 28 }}>✓</div>
              <h2 style={{ ...SERIF, color: T.btnText, margin: '0 0 6px', fontSize: 22 }}>
                <TranslatedText text="Order Placed Successfully!" />
              </h2>
              <p style={{ color: 'rgba(250,243,232,0.8)', margin: 0, fontSize: 14, ...BODY }}>
                <TranslatedText text="Thank you for your purchase. We'll get it ready for you." />
              </p>
            </div>
            <div style={{ padding: '28px 28px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: T.bg, border: `1px solid ${T.border}`, marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: T.muted, ...BODY }}><TranslatedText text="Order Reference" /></span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: T.dark }}>{orderRef}</span>
              </div>
              {od && (
                <>
                  <h4 style={{ ...SERIF, fontSize: 16, color: T.dark, margin: '0 0 12px', paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                    <TranslatedText text="Items Ordered" />
                  </h4>
                  <div style={{ marginBottom: 20 }}>
                    {od.items.map((item, i) => {
                      const price  = item.product_price || item.price || 0;
                      const qty    = item.quantity || 1;
                      const imgUrl = resolveImageUrl(item.thumbnail || item.product_image || item.image_url || '');
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.bg}` }}>
                          {imgUrl && <img src={imgUrl} alt={item.product_name || item.name} style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.dark, ...BODY }}>{item.product_name || item.name}</div>
                            <SelectedOptionsSummary item={item} />
                            <div style={{ fontSize: 12, color: T.muted, ...BODY, marginTop: 2 }}><TranslatedText text="Qty:" /> {qty} × {formatAmount(price)}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.dark, ...BODY, flexShrink: 0 }}>{formatAmount(price * qty)}</div>
                        </div>
                      );
                    })}
                  </div>
                  {od.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: T.successGreen, fontSize: 13, ...BODY }}>
                      <span><TranslatedText text="Coupon" /> ({od.couponCode})</span>
                      <span>- {formatAmount(od.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.body, ...BODY }}>
                    <span><TranslatedText text="Shipping" /></span>
                    <span style={{ color: od.shippingCost > 0 ? T.dark : T.successGreen }}>{od.shippingCost > 0 ? formatAmount(od.shippingCost) : <TranslatedText text="Free" />}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `2px solid ${T.border}`, ...SERIF, fontSize: 17, fontWeight: 600, color: T.dark, marginBottom: 24 }}>
                    <span><TranslatedText text="Total Paid" /></span>
                    <span>{formatAmount(od.total)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: 14 }}>
                      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8, ...BODY }}><TranslatedText text="Shipping To" /></div>
                      <div style={{ fontSize: 13, color: T.dark, lineHeight: 1.7, ...BODY }}>
                        <div style={{ fontWeight: 600 }}>{od.address.firstName} {od.address.lastName}</div>
                        <div>{od.address.houseNumber}, {od.address.roadName}</div>
                        <div>{od.address.city}{od.address.state ? `, ${od.address.state}` : ''}</div>
                        <div>{od.address.country ? getCountryName(od.address.country) : ''}</div>
                        <div style={{ marginTop: 4, color: T.muted }}>{od.address.phone}</div>
                      </div>
                    </div>
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: 14 }}>
                      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8, ...BODY }}><TranslatedText text="Payment" /></div>
                      <div style={{ fontSize: 13, color: T.dark, ...BODY }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{od.paymentMethod === 'cod' ? <TranslatedText text="Cash on Delivery" /> : <TranslatedText text="Online Payment (Razorpay)" />}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>{od.paymentMethod === 'cod' ? <TranslatedText text="Pay on delivery." /> : <TranslatedText text="Payment completed online." />}</div>
                        <div style={{ marginTop: 8, display: 'inline-block', background: od.paymentMethod === 'cod' ? '#FFF3E0' : '#E8F5E9', color: od.paymentMethod === 'cod' ? '#E65100' : '#2E7D32', fontSize: 11, fontWeight: 600, padding: '3px 10px' }}>
                          {od.paymentMethod === 'cod' ? <TranslatedText text="Pending" /> : <TranslatedText text="Paid" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '0 28px 28px' }}>
              <Link to="/" style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: T.btn, color: T.btnText, textDecoration: 'none', fontWeight: 600, fontSize: 15, ...SERIF }}>
                <TranslatedText text="Continue Shopping" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && step === 1) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, ...BODY }}>
        <style dangerouslySetInnerHTML={{ __html: fontStyle }} />
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛍</div>
          <h2 style={{ ...SERIF, color: T.dark, marginBottom: 12 }}><TranslatedText text="Your cart is empty" /></h2>
          <p style={{ color: T.muted, marginBottom: 24, ...BODY }}><TranslatedText text="Add some items to your cart before checkout." /></p>
          <Link to="/" style={{ background: T.btn, color: T.btnText, padding: '12px 28px', textDecoration: 'none', fontWeight: 600, ...SERIF, fontSize: 15 }}>
            <TranslatedText text="Browse Products" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, ...BODY }}>
      <style dangerouslySetInnerHTML={{ __html: fontStyle }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <StepWizard />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>
        {error && (
          <div style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`, color: T.errorText, padding: '12px 16px', marginBottom: 24, fontSize: 14, ...BODY }}>
            <TranslatedText text={error} />
          </div>
        )}

        <div className="wp-cols" style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'flex-start' }}>

          <div className="wp-main-col" style={{ width: '100%' }}>

            {step === 1 && (
              <div>
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <h2 style={S.cardHeading}><TranslatedText text="Order Summary" /></h2>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {items.map((item, index) => {
                      const price   = item.product_price || item.price || 0;
                      const qty     = item.quantity || 1;
                      const itemKey = cartItemKey ? cartItemKey(item) : (item.productId || item.product_id || item.id);
                      const imgUrl  = resolveImageUrl(item.thumbnail || item.product_image || item.image_url || '');
                      return (
                        <div key={itemKey || index} style={{ display: 'flex', gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${T.border}` }}>
                          <div style={{ width: 64, height: 64, background: T.bg, border: `1px solid ${T.border}`, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {imgUrl ? <img src={imgUrl} alt={item.product_name || item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>🛍</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: T.dark, ...BODY }}>{item.product_name || item.name}</div>
                            <SelectedOptionsSummary item={item} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, overflow: 'hidden', height: 30 }}>
                                <button type="button" onClick={() => updateQuantity(itemKey, qty - 1, item.selectedOptions)} style={{ width: 30, height: 30, border: 'none', background: T.bg, cursor: 'pointer', fontWeight: 'bold', color: T.dark, fontSize: 14 }}>−</button>
                                <span style={{ padding: '0 10px', fontSize: 13, fontWeight: 500, color: T.dark, ...BODY }}>{qty}</span>
                                <button type="button" onClick={() => updateQuantity(itemKey, qty + 1, item.selectedOptions)} style={{ width: 30, height: 30, border: 'none', background: T.bg, cursor: 'pointer', fontWeight: 'bold', color: T.dark, fontSize: 14 }}>+</button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: T.dark, ...BODY }}>{formatAmount(price * qty)}</span>
                                <button type="button" onClick={() => removeItem(itemKey, item.selectedOptions)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }} aria-label="Remove">×</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/" className="wp-outline-btn" style={{ ...S.outlineBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      <TranslatedText text="Continue Shopping" />
                    </Link>
                    <button onClick={() => goToStep(2)} disabled={loading} className="wp-primary-btn" style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                      {loading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'wp-spin 0.8s linear infinite' }} /><TranslatedText text="Checking..." /></> : <><TranslatedText text="Continue to Details" /> →</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                {isAuthenticated && savedAddresses.length > 0 && (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <h2 style={S.cardHeading}><TranslatedText text="Saved Addresses" /></h2>
                    {savedAddresses.map(sa => (
                      <div key={sa.id} className="wp-saved-addr" onClick={() => selectSavedAddress(sa)} style={{ border: `2px solid ${selectedAddressId === sa.id ? T.stepActive : T.border}`, padding: 14, marginBottom: 12, cursor: 'pointer', background: selectedAddressId === sa.id ? '#F5ECD5' : T.cardBg, transition: 'border-color 0.2s' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.dark, ...BODY }}>{sa.label || 'Address'}</div>
                        <div style={{ fontSize: 13, color: T.body, ...BODY, marginTop: 4, lineHeight: 1.6 }}>
                          {sa.house_number} {sa.road_name}, {sa.city}{sa.state ? `, ${sa.state}` : ''} – {sa.pin_code}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 13, color: T.muted, marginTop: 8, ...BODY }}>— <TranslatedText text="or enter a new address below" /> —</div>
                  </div>
                )}

                <div style={{ ...S.card, marginBottom: 20 }}>
                  <h2 style={S.cardHeading}><TranslatedText text="Contact Information" /></h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={S.label}><TranslatedText text="First Name" /></label>
                      <input className="wp-input" type="text" value={address.firstName} onChange={e => handleAddressChange('firstName', e.target.value)} style={S.input} placeholder="Jane" />
                      {addressErrors.firstName && <div style={S.fieldError}>{addressErrors.firstName}</div>}
                    </div>
                    <div>
                      <label style={S.label}><TranslatedText text="Last Name" /></label>
                      <input className="wp-input" type="text" value={address.lastName} onChange={e => handleAddressChange('lastName', e.target.value)} style={S.input} placeholder="Doe" />
                      {addressErrors.lastName && <div style={S.fieldError}>{addressErrors.lastName}</div>}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={S.label}><TranslatedText text="Email Address" /></label>
                      <input className="wp-input" type="email" value={address.email} onChange={e => handleAddressChange('email', e.target.value)} style={S.input} placeholder="jane@example.com" />
                      {addressErrors.email && <div style={S.fieldError}>{addressErrors.email}</div>}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={S.label}><TranslatedText text="Phone Number" /></label>
                      <PhoneInput
                        value={address.phone}
                        onChange={val => handleAddressChange('phone', val)}
                        defaultCountry={address.country}
                        style={S.input}
                      />
                      {addressErrors.phone && <div style={S.fieldError}>{addressErrors.phone}</div>}
                    </div>
                  </div>
                </div>

                <div style={{ ...S.card, marginBottom: 20 }}>
                  <h2 style={S.cardHeading}><TranslatedText text="Shipping Address" /></h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={S.label}><TranslatedText text="Country" /></label>
                      <select className="wp-input" value={address.country} onChange={e => handleAddressChange('country', e.target.value)} style={{ ...S.input, appearance: 'none' }}>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                      {addressErrors.country && <div style={S.fieldError}>{addressErrors.country}</div>}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={S.label}><TranslatedText text="House / Flat No." /></label>
                      <input className="wp-input" type="text" value={address.houseNumber} onChange={e => handleAddressChange('houseNumber', e.target.value)} style={S.input} placeholder="Apt 4B" />
                      {addressErrors.houseNumber && <div style={S.fieldError}>{addressErrors.houseNumber}</div>}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={S.label}><TranslatedText text="Street / Road" /></label>
                      <input className="wp-input" type="text" value={address.roadName} onChange={e => handleAddressChange('roadName', e.target.value)} style={S.input} placeholder="MG Road" />
                      {addressErrors.roadName && <div style={S.fieldError}>{addressErrors.roadName}</div>}
                    </div>
                    <div>
                      <label style={S.label}><TranslatedText text="City" /></label>
                      <input className="wp-input" type="text" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} style={S.input} placeholder="Bangalore" />
                      {addressErrors.city && <div style={S.fieldError}>{addressErrors.city}</div>}
                    </div>
                    {statesForCountry.length > 0 ? (
                      <div>
                        <label style={S.label}><TranslatedText text="State" /></label>
                        <select className="wp-input" value={address.state} onChange={e => handleAddressChange('state', e.target.value)} style={{ ...S.input, appearance: 'none' }}>
                          <option value="">{tx("Select state")}</option>
                          {statesForCountry.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {addressErrors.state && <div style={S.fieldError}>{addressErrors.state}</div>}
                      </div>
                    ) : (
                      <div>
                        <label style={S.label}><TranslatedText text="State / Region" /></label>
                        <input className="wp-input" type="text" value={address.state} onChange={e => handleAddressChange('state', e.target.value)} style={S.input} placeholder="State" />
                      </div>
                    )}
                    <div>
                      <label style={S.label}>{address.country === 'IN' ? <TranslatedText text="PIN Code" /> : <TranslatedText text="Postal Code" />}</label>
                      <input className="wp-input" type="text" value={address.pinCode} onChange={e => handleAddressChange('pinCode', e.target.value)} style={S.input} placeholder={address.country === 'IN' ? '560001' : 'Postal code'} />
                      {pinValidating && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, ...BODY }}><TranslatedText text="Validating…" /></div>}
                      {addressErrors.pinCode && <div style={S.fieldError}>{addressErrors.pinCode}</div>}
                    </div>
                  </div>

                  {isAuthenticated && !selectedAddressId && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" id="wp-save-addr" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} style={{ accentColor: T.stepActive, width: 16, height: 16 }} />
                      <label htmlFor="wp-save-addr" style={{ fontSize: 13, color: T.body, cursor: 'pointer', ...BODY }}>
                        <TranslatedText text="Save this address for future orders" />
                      </label>
                    </div>
                  )}

                  {whatsappNotificationsAvailable && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" id="wp-wa-optin" checked={whatsappOptIn} onChange={e => setWhatsappOptIn(e.target.checked)} style={{ accentColor: T.stepActive, width: 16, height: 16 }} />
                      <label htmlFor="wp-wa-optin" style={{ fontSize: 13, color: T.body, cursor: 'pointer', ...BODY }}>
                        <TranslatedText text="Get order updates on WhatsApp" />
                      </label>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => goToStep(1)} className="wp-outline-btn" style={S.outlineBtn}>
                    ← <TranslatedText text="Back to Cart" />
                  </button>
                  <button onClick={() => goToStep(3)} disabled={loading} className="wp-primary-btn" style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'wp-spin 0.8s linear infinite' }} /><TranslatedText text="Saving…" /></> : <><TranslatedText text="Continue to Payment" /> →</>}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div style={{ ...S.card, marginBottom: 20 }}>
                  <h2 style={S.cardHeading}><TranslatedText text="Shipping To" /></h2>
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, padding: '14px 16px', fontSize: 14, color: T.dark, lineHeight: 1.8, ...BODY }}>
                    <strong>{address.firstName} {address.lastName}</strong><br />
                    {address.houseNumber}, {address.roadName}<br />
                    {address.city}{address.state ? `, ${address.state}` : ''} — {address.pinCode}<br />
                    {getCountryName(address.country)}<br />
                    <span style={{ color: T.muted }}>{address.phone} · {address.email}</span>
                  </div>
                </div>

                {shiprocketEnabled && address.country === 'IN' && /^\d{6}$/.test((address.pinCode || '').trim()) && (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    {serviceabilityLoading && (
                      <div style={{ fontSize: 13, color: T.muted, ...BODY }}>
                        <span style={{ display: 'inline-block', width: 12, height: 12, border: `2px solid ${T.muted}`, borderTopColor: T.stepActive, borderRadius: '50%', animation: 'wp-spin 0.8s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
                        <TranslatedText text="Checking delivery to your pincode…" />
                      </div>
                    )}
                    {!serviceabilityLoading && serviceability?.serviceable && (
                      <>
                        <div style={{ fontSize: 14, color: T.dark, fontWeight: 600, ...BODY }}>
                          🚚{' '}
                          {serviceability.etaMinDays && serviceability.etaMaxDays && serviceability.etaMinDays !== serviceability.etaMaxDays
                            ? <TranslatedText text="Estimated delivery: {{min}}–{{max}} business days" vars={{ min: serviceability.etaMinDays, max: serviceability.etaMaxDays }} />
                            : serviceability.etaMaxDays
                              ? <TranslatedText text="Estimated delivery: {{max}} business days" vars={{ max: serviceability.etaMaxDays }} />
                              : <TranslatedText text="Delivery available to your pincode" />}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 4, ...BODY }}><TranslatedText text="Exact date confirmed once your order ships." /></div>
                      </>
                    )}
                    {!serviceabilityLoading && serviceability && serviceability.serviceable === false && serviceability.reason !== 'NOT_CONFIGURED' && (
                      <div style={{ fontSize: 13, color: '#9B6B00', ...BODY }}>
                        ⚠ <TranslatedText text="We can't confirm delivery to this pincode right now. You can still place the order — we'll update you with shipping details after." />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ ...S.card, marginBottom: 20 }}>
                  <h2 style={S.cardHeading}><TranslatedText text="Payment Method" /></h2>
                  {codEnabled && (() => {
                    const codBlocked = !!(serviceability?.serviceable && serviceability.codAvailable === false);
                    return (
                      <label className="wp-payment-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', border: `2px solid ${paymentMethod === 'cod' ? T.stepActive : T.border}`, marginBottom: 12, cursor: codBlocked ? 'not-allowed' : 'pointer', background: codBlocked ? T.bg : (paymentMethod === 'cod' ? '#F5ECD5' : T.cardBg), opacity: codBlocked ? 0.6 : 1, transition: 'all 0.2s' }}>
                        <input type="radio" name="wp-payment" value="cod" checked={paymentMethod === 'cod'} disabled={codBlocked} onChange={() => !codBlocked && setPaymentMethod('cod')} style={{ accentColor: T.stepActive, marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: T.dark, ...BODY }}>
                            <TranslatedText text="Cash on Delivery (COD)" />
                            {serviceability?.serviceable && serviceability.codAvailable === true && (
                              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', background: '#DCF5E8', color: '#15803D', fontWeight: 600 }}>
                                ✓ <TranslatedText text="Available" />
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: T.muted, marginTop: 3, ...BODY }}>
                            {codBlocked
                              ? <TranslatedText text="Cash on Delivery isn't available for this pincode. Please pay online." />
                              : <TranslatedText text="Pay when you receive your order" />}
                          </div>
                        </div>
                      </label>
                    );
                  })()}
                  <label className="wp-payment-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', border: `2px solid ${paymentMethod === 'razorpay' ? T.stepActive : T.border}`, cursor: 'pointer', background: paymentMethod === 'razorpay' ? '#F5ECD5' : T.cardBg, transition: 'all 0.2s' }}>
                    <input type="radio" name="wp-payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} style={{ accentColor: T.stepActive, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.dark, ...BODY }}><TranslatedText text="Pay Online (Razorpay)" /></div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 3, ...BODY }}><TranslatedText text="Credit/Debit Card, UPI, Net Banking, Wallets" /></div>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => goToStep(2)} className="wp-outline-btn" style={S.outlineBtn}>
                    ← <TranslatedText text="Back to Address" />
                  </button>
                  <button onClick={placeOrder} disabled={loading} className="wp-primary-btn" style={{ ...S.primaryBtn, minWidth: 160, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading
                      ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'wp-spin 0.8s linear infinite' }} /><TranslatedText text="Processing…" /></>
                      : <TranslatedText text="Place Order" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="wp-side-col" style={{ width: '100%' }}>
            <div style={{ position: 'sticky', top: 24 }}>
              <OrderSummarySidebar />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
