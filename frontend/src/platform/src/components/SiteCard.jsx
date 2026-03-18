import { useState } from 'react';

export default function SiteCard({ site, onDelete, onManage, onBilling, subscriptionInfo }) {
  const [deleting, setDeleting] = useState(false);
  const siteName = site.brand_name || site.brandName || site.subdomain;
  const siteUrl = `https://${site.subdomain}.fluxe.in`;
  const createdAt = site.created_at ? new Date(site.created_at).toLocaleDateString() : '';
  const hasCustomDomain = site.custom_domain && site.domain_status === 'verified';
  const customDomainUrl = hasCustomDomain ? `https://${site.custom_domain}` : null;

  const sub = subscriptionInfo || { plan: null, status: 'none', isActive: false, isExpired: false };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this website?')) return;
    setDeleting(true);
    try {
      await onDelete(site.id);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (sub.isActive) {
      const label = sub.plan === 'trial' ? 'Trial' : sub.plan || 'Active';
      return { text: label, bg: '#dcfce7', color: '#166534' };
    }
    if (sub.isExpired) {
      return { text: 'Expired', bg: '#fee2e2', color: '#dc2626' };
    }
    return { text: 'Inactive', bg: '#fee2e2', color: '#dc2626' };
  };

  const badge = getStatusBadge();

  return (
    <div className="site-card">
      <h3 style={{ marginBottom: '0.25rem', fontSize: '1.125rem', fontWeight: 700 }}>{siteName}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: hasCustomDomain ? '0.125rem' : '0.25rem' }}>{siteUrl}</p>
      {hasCustomDomain && (
        <p style={{ fontSize: '0.8rem', color: '#2563eb', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <i className="fas fa-globe" style={{ fontSize: '0.7rem' }} />
          {customDomainUrl}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', alignItems: 'center' }}>
        {createdAt && <span>{createdAt}</span>}
        <span style={{ marginLeft: 'auto', background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{badge.text}</span>
      </div>
      {sub.isActive && sub.periodEnd && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>
          {sub.plan === 'trial' ? 'Trial ends' : 'Renews'}: {new Date(sub.periodEnd).toLocaleDateString()}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem' }}>Visit Site</a>
        <button className="btn btn-outline" onClick={onManage} style={{ flex: 1, fontSize: '0.75rem' }}>
          Manage
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {onBilling && (
          <button className="btn btn-outline" onClick={onBilling} style={{ flex: 1, fontSize: '0.75rem' }}>
            {sub.isExpired || !sub.plan ? 'Subscribe' : 'Billing'}
          </button>
        )}
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontSize: '0.75rem' }}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
