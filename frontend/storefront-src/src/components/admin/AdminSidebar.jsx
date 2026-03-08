import React from 'react';

const navItems = [
  { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { id: 'products', icon: 'fa-box', label: 'Products' },
  { id: 'inventory', icon: 'fa-warehouse', label: 'Inventory' },
  { id: 'orders', icon: 'fa-shopping-bag', label: 'Orders', badgeKey: 'pendingOrders' },
  { id: 'customers', icon: 'fa-users', label: 'Customers' },
  { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  { id: 'notifications', icon: 'fa-bell', label: 'Push Notifications' },
  { id: 'watchbuy', icon: 'fa-video', label: 'Watch & Buy' },
];

export default function AdminSidebar({ activeSection, onSectionChange, isOpen, onClose, brandName, badges }) {
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
          {navItems.map(item => (
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
