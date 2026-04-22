import React from 'react';
import { useTranslation } from 'react-i18next';
import { isFeatureAvailable, getRequiredPlan, PlanBadge } from './FeatureGate.jsx';

const navItems = [
  { id: 'dashboard', icon: 'fa-chart-line', labelKey: 'sections.dashboard' },
  { id: 'products', icon: 'fa-box', labelKey: 'sections.products' },
  { id: 'inventory', icon: 'fa-warehouse', labelKey: 'sections.inventory' },
  { id: 'orders', icon: 'fa-shopping-bag', labelKey: 'sections.orders', badgeKey: 'pendingOrders' },
  { id: 'customers', icon: 'fa-users', labelKey: 'sections.customers' },
  { id: 'revenue', icon: 'fa-money-bill-wave', labelKey: 'sections.revenue', gatedFeature: 'revenue' },
  { id: 'analytics', icon: 'fa-chart-bar', labelKey: 'sections.analytics' },
  { id: 'website', icon: 'fa-globe', labelKey: 'sections.website' },
  { id: 'seo', icon: 'fa-search', labelKey: 'sections.seo' },
  { id: 'notifications', icon: 'fa-bell', labelKey: 'sections.notifications', gatedFeature: 'notifications' },
  { id: 'billing', icon: 'fa-file-invoice-dollar', labelKey: 'sections.billing', enterpriseOnly: true },
  { id: 'settings', icon: 'fa-cog', labelKey: 'sections.settings' },
];

export default function AdminSidebar({ activeSection, onSectionChange, isOpen, onClose, brandName, badges, permissions, isOwner, currentPlan }) {
  const { t } = useTranslation('admin');
  const visibleItems = navItems.filter(item => {
    if (item.enterpriseOnly && currentPlan !== 'enterprise') return false;
    if (isOwner) return true;
    if (!permissions) return false;
    if (item.id === 'revenue') return permissions.includes('analytics') || permissions.includes('orders');
    if (item.id === 'billing') return true;
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
            <span>{brandName || t('panelTitle')}</span>
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
                <span style={isLocked ? { color: '#94a3b8' } : undefined}>{t(item.labelKey)}</span>
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
