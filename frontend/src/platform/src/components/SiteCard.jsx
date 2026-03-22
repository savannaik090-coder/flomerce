function utcDate(s) { if (!s) return null; const v = String(s).trim(); const iso = v.includes('T') ? v : v.replace(' ', 'T'); return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'); }

export default function SiteCard({ site, onManage, subscriptionInfo }) {
  const siteName = site.brand_name || site.brandName || site.subdomain;
  const siteUrl = `https://${site.subdomain}.fluxe.in`;
  const createdAt = site.created_at ? utcDate(site.created_at).toLocaleDateString() : '';
  const hasCustomDomain = site.custom_domain && site.domain_status === 'verified';
  const customDomainUrl = hasCustomDomain ? `https://${site.custom_domain}` : null;

  const sub = subscriptionInfo || { plan: null, status: 'none', isActive: false, isExpired: false, isCancelled: false };

  const isEnterprise = sub.plan === 'enterprise';

  const getStatusBadge = () => {
    if (sub.isCancelled && sub.isActive) {
      const label = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) + ' - Cancelling' : 'Cancelling';
      return { text: label, bg: '#fef3c7', color: '#92400e' };
    }
    if (sub.isActive) {
      if (isEnterprise) return { text: 'Enterprise', bg: '#ede9fe', color: '#5b21b6' };
      const label = sub.plan === 'trial' ? 'Trial' : (sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'Active');
      return { text: label, bg: '#dcfce7', color: '#166534' };
    }
    if (sub.isExpired) {
      const planLabel = sub.plan && sub.plan !== 'expired' && sub.plan !== 'free' && sub.plan !== 'paused'
        ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) + ' - Expired'
        : 'Expired';
      return { text: planLabel, bg: '#fee2e2', color: '#dc2626' };
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
      {sub.isActive && sub.periodEnd && !isEnterprise && (
        <p style={{ fontSize: '0.75rem', color: sub.isCancelled ? '#92400e' : 'var(--text-muted)', marginBottom: '0.75rem', margin: '0 0 0.75rem 0' }}>
          {sub.isCancelled ? 'Ends' : sub.plan === 'trial' ? 'Trial ends' : 'Renews'}: {new Date(sub.periodEnd).toLocaleDateString()}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem' }}>Visit Site</a>
        <button className="btn btn-outline" onClick={onManage} style={{ flex: 1, fontSize: '0.75rem' }}>
          Manage
        </button>
      </div>
    </div>
  );
}
