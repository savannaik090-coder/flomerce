import React from 'react';
import { isFeatureAvailable, getRequiredPlan, PlanBadge } from './FeatureGate.jsx';

const navItems = [
  { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { id: 'products', icon: 'fa-box', label: 'Products' },
  { id: 'inventory', icon: 'fa-warehouse', label: 'Inventory' },
  { id: 'orders', icon: 'fa-shopping-bag', label: 'Orders', badgeKey: 'pendingOrders' },
  { id: 'customers', icon: 'fa-users', label: 'Customers' },
  { id: 'revenue', icon: 'fa-money-bill-wave', label: 'Revenue', gatedFeature: 'revenue' },
  { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  { id: 'website', icon: 'fa-globe', label: 'Edit Website' },
  { id: 'seo', icon: 'fa-search', label: 'SEO' },
  { id: 'notifications', icon: 'fa-bell', label: 'Push Notifications', gatedFeature: 'notifications' },
  { id: 'billing', icon: 'fa-file-invoice-dollar', label: 'Billing', enterpriseOnly: true },
  { id: 'settings', icon: 'fa-cog', label: 'Settings' },
];

export default function AdminSidebar({ activeSection, onSectionChange, isOpen, onClose, brandName, badges, permissions, isOwner, currentPlan }) {
  const visibleItems = navItems.filter(item => {
    // Billing is only meaningful on the enterprise plan (where overage
    // invoices exist). Hide for everyone else regardless of permissions.
    if (item.enterpriseOnly && currentPlan !== 'enterprise') return false;
    if (isOwner) return true;
    if (!permissions) return false;
    if (item.id === 'revenue') return permissions.includes('analytics') || permissions.includes('orders');
    if (item.id === 'billing') return true; // visible to all admins on enterprise sites
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
          {visibleItems.map(item => {
            const isLocked = item.gatedFeature && !isFeatureAvailable(currentPlan, item.gatedFeature);
            const requiredPlan = item.gatedFeature ? getRequiredPlan(item.gatedFeature) : null;

            return (
              <button
                key={item.id}
                className={`nav-item${activeSection === item.id ? ' active' : ''}${isLocked ? ' locked' : ''}`}
                onClick={() => { onSectionChange(item.id); onClose(); }}
              >
                <i className={`fas ${isLocked ? 'fa-lock' : item.icon}`} style={isLocked ? { color: '#94a3b8', fontSize: 13 } : undefined} />
                <span style={isLocked ? { color: '#94a3b8' } : undefined}>{item.label}</span>
                {isLocked && <PlanBadge plan={requiredPlan} small />}
                {!isLocked && item.badgeKey && badges?.[item.badgeKey] > 0 && (
                  <span className="nav-badge">{badges[item.badgeKey]}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className={`admin-overlay${isOpen ? ' show' : ''}`} onClick={onClose} />
    </>
  );
}
