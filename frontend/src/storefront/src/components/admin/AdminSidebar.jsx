import React from 'react';

const navItems = [
  { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { id: 'products', icon: 'fa-box', label: 'Products' },
  { id: 'inventory', icon: 'fa-warehouse', label: 'Inventory' },
  { id: 'locations', icon: 'fa-map-marker-alt', label: 'Locations' },
  { id: 'orders', icon: 'fa-shopping-bag', label: 'Orders', badgeKey: 'pendingOrders' },
  { id: 'customers', icon: 'fa-users', label: 'Customers' },
  { id: 'revenue', icon: 'fa-money-bill-wave', label: 'Revenue' },
  { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  { id: 'website', icon: 'fa-globe', label: 'Edit Website' },
  { id: 'seo', icon: 'fa-search', label: 'SEO' },
  { id: 'notifications', icon: 'fa-bell', label: 'Push Notifications' },
  { id: 'settings', icon: 'fa-cog', label: 'Settings' },
];

export default function AdminSidebar({ activeSection, onSectionChange, isOpen, onClose, brandName, badges, permissions, isOwner }) {
  const visibleItems = navItems.filter(item => {
    if (isOwner) return true;
    if (!permissions) return false;
    if (item.id === 'revenue') return permissions.includes('analytics') || permissions.includes('orders');
    if (item.id === 'locations') return permissions.includes('inventory');
    return permissions.includes(item.id);
  });

  return (
    <>
      <aside className={`admin-sidebar${isOpen ? ' show' : ''}`}>
        <button className="sidebar-close" onClick={onClose}>
          <i className="fas fa-times" />
        </button>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <i className="fas fa-store" />
            <span>{brandName || 'Admin Panel'}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map(item => (
            <button
              key={item.id}
              className={`nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => { onSectionChange(item.id); onClose(); }}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
              {item.badgeKey && badges?.[item.badgeKey] > 0 && (
                <span className="nav-badge">{badges[item.badgeKey]}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      <div className={`admin-overlay${isOpen ? ' show' : ''}`} onClick={onClose} />
    </>
  );
}
