import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { SiteContext } from '../context/SiteContext.jsx';
import { CurrencyContext } from '../context/CurrencyContext.jsx';
import * as authService from '../services/authService.js';
import * as orderService from '../services/orderService.js';

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

  const handleSaveAddress = async () => {
    if (!addressForm.firstName || !addressForm.houseNumber || !addressForm.city || !addressForm.state || !addressForm.pinCode) {
      setAddressError('Please fill in all required fields');
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
  };

  const getStatusColor = (status) => {
    const colors = { pending: '#f39c12', confirmed: '#3498db', processing: '#9b59b6', shipped: '#2980b9', delivered: '#27ae60', cancelled: '#e74c3c', paid: '#27ae60' };
    return colors[status?.toLowerCase()] || '#6c757d';
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
                      <span style={{ fontWeight: 'bold' }}>Order #{order.id || order.order_id}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: '#777', fontSize: 14 }}>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</span>
                        <span style={{ backgroundColor: getStatusColor(order.status), color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{order.status || 'Pending'}</span>
                      </div>
                    </div>
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
                    <div style={{ textAlign: 'right', fontWeight: 'bold', paddingTop: 10, borderTop: '1px solid #eee', marginTop: 10 }}>
                      Total: {formatAmount(orderTotal)}
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
              <button onClick={() => { setEditAddress(null); setAddressForm({ label: 'Home', firstName: '', lastName: '', phone: '', houseNumber: '', roadName: '', city: '', state: '', pinCode: '', isDefault: false }); setAddressError(''); setShowAddressModal(true); }} style={{ background: '#c8a97e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
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
              <select value={addressForm.label} onChange={e => setAddressForm(p => ({ ...p, label: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>First Name *</label>
                <input type="text" value={addressForm.firstName} onChange={e => setAddressForm(p => ({ ...p, firstName: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Last Name</label>
                <input type="text" value={addressForm.lastName} onChange={e => setAddressForm(p => ({ ...p, lastName: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Phone</label>
              <input type="tel" value={addressForm.phone} onChange={e => setAddressForm(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>House/Building Number *</label>
              <input type="text" value={addressForm.houseNumber} onChange={e => setAddressForm(p => ({ ...p, houseNumber: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>Road / Area / Colony</label>
              <input type="text" value={addressForm.roadName} onChange={e => setAddressForm(p => ({ ...p, roadName: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>City *</label>
                <input type="text" value={addressForm.city} onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>PIN Code *</label>
                <input type="text" maxLength={6} value={addressForm.pinCode} onChange={e => setAddressForm(p => ({ ...p, pinCode: e.target.value.replace(/\D/g, '') }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>State *</label>
              <select value={addressForm.state} onChange={e => setAddressForm(p => ({ ...p, state: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
