import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';
import { getOrders } from '../../services/orderService.js';
import { formatPrice, getAdminCurrency } from '../../utils/priceFormatter.js';
import { parseAsUTC, formatDateShortForAdmin } from '../../utils/dateFormatter.js';

export default function CustomersSection() {
  const { t } = useTranslation(['customers', 'common']);
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
            name: order.customer_name || order.name || t('guest'),
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
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users" />
          <h3>{t('noneFound')}</h3>
          <p>{t('derivedFromOrders')}</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('title')} ({filtered.length})</h3>
          </div>
          <div className="card-content" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>{t('common:name')}</th>
                    <th style={{ minWidth: 200 }}>{t('common:email')}</th>
                    <th style={{ minWidth: 130 }}>{t('phone')}</th>
                    <th style={{ minWidth: 80 }}>{t('orders')}</th>
                    <th style={{ minWidth: 110 }}>{t('totalSpent')}</th>
                    <th style={{ minWidth: 110 }}>{t('lastOrder')}</th>
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
