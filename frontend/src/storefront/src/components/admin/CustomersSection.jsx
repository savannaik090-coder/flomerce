import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders } from '../../services/orderService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import { parseAsUTC, formatDateShortForAdmin } from '../../utils/dateFormatter.js';

export default function CustomersSection() {
  const { siteConfig } = useContext(SiteContext);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteConfig?.id) loadCustomers();
  }, [siteConfig?.id]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await getOrders(siteConfig.id);
      const orders = res.data || res.orders || [];

      const customerMap = {};
      orders.forEach(order => {
        const email = order.email || order.customer_email;
        if (!email) return;
        if (!customerMap[email]) {
          customerMap[email] = {
            email,
            name: order.customer_name || order.name || "Guest",
            phone: order.phone || order.customer_phone || '',
            orderCount: 0,
            totalSpent: 0,
            lastOrder: order.created_at || order.createdAt,
          };
        }
        customerMap[email].orderCount++;
        customerMap[email].totalSpent += parseFloat(order.total || order.total_amount) || 0;
        const orderDate = parseAsUTC(order.created_at || order.createdAt) || new Date(0);
        if (orderDate > (parseAsUTC(customerMap[email].lastOrder) || new Date(0))) {
          customerMap[email].lastOrder = order.created_at || order.createdAt;
        }
      });

      setCustomers(Object.values(customerMap).sort((a, b) => b.orderCount - a.orderCount));
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter(c =>
    !searchTerm ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search customers by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users" />
          <h3>No customers found</h3>
          <p>Customer data is derived from orders. Once you have orders, customers will appear here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Customers ({filtered.length})</h3>
          </div>
          <div className="card-content" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Name</th>
                    <th style={{ minWidth: 200 }}>Email address</th>
                    <th style={{ minWidth: 130 }}>Phone</th>
                    <th style={{ minWidth: 80 }}>Orders</th>
                    <th style={{ minWidth: 110 }}>Total Spent</th>
                    <th style={{ minWidth: 110 }}>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(customer => (
                    <tr key={customer.email}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{customer.name}</td>
                      <td style={{ wordBreak: 'break-all' }}>{customer.email}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{customer.phone || '—'}</td>
                      <td>{customer.orderCount}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPrice(customer.totalSpent, getAdminCurrency(siteConfig))}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateShortForAdmin(customer.lastOrder, siteConfig?.settings?.timezone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
