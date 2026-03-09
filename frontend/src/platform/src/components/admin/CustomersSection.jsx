import { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';

export default function CustomersSection({ site }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (site?.id) loadCustomers();
  }, [site?.id]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/orders?siteId=${site.id}`);
      const orders = res.data || res.orders || [];

      const customerMap = {};
      orders.forEach(order => {
        const email = order.email || order.customer_email;
        if (!email) return;
        if (!customerMap[email]) {
          customerMap[email] = {
            email,
            name: order.customer_name || order.name || 'Guest',
            phone: order.phone || order.customer_phone || '',
            orderCount: 0,
            totalSpent: 0,
            lastOrder: order.created_at || order.createdAt,
          };
        }
        customerMap[email].orderCount++;
        customerMap[email].totalSpent += parseFloat(order.total || order.total_amount) || 0;
        const orderDate = new Date(order.created_at || order.createdAt);
        if (orderDate > new Date(customerMap[email].lastOrder)) {
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

  if (loading) return <div className="sa-loading"><div className="sa-spinner" /></div>;

  return (
    <div>
      <div className="sa-search-bar">
        <input
          type="text"
          placeholder="Search customers by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="sa-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          <h3>No customers found</h3>
          <p>Customer data is derived from orders. Once you have orders, customers will appear here.</p>
        </div>
      ) : (
        <div className="sa-card">
          <div className="sa-card-header">
            <h3 className="sa-card-title">Customers ({filtered.length})</h3>
          </div>
          <div className="sa-card-content" style={{ padding: 0 }}>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(customer => (
                    <tr key={customer.email}>
                      <td style={{ fontWeight: 500 }}>{customer.name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone || '\u2014'}</td>
                      <td>{customer.orderCount}</td>
                      <td>{'\u20B9'}{customer.totalSpent.toLocaleString('en-IN')}</td>
                      <td>{new Date(customer.lastOrder).toLocaleDateString()}</td>
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
