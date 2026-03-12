import { useState } from 'react';
import { apiRequest } from '../services/api.js';

export default function SiteCard({ site, onDelete, onManage }) {
  const [deleting, setDeleting] = useState(false);
  const [managing, setManaging] = useState(false);
  const siteName = site.brand_name || site.brandName || site.subdomain;
  const siteUrl = `https://${site.subdomain}.fluxe.in`;
  const template = site.template_id || site.template || 'template1';
  const createdAt = site.created_at ? new Date(site.created_at).toLocaleDateString() : '';
  const hasCustomDomain = site.custom_domain && site.domain_status === 'verified';
  const customDomainUrl = hasCustomDomain ? `https://${site.custom_domain}` : null;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this website?')) return;
    setDeleting(true);
    try {
      await onDelete(site.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleManage = async () => {
    setManaging(true);
    try {
      const result = await apiRequest('/api/site-admin/auto-login', {
        method: 'POST',
        body: JSON.stringify({ siteId: site.id }),
      });
      const token = result.token || result.data?.token;
      const adminUrl = token
        ? `${siteUrl}/admin?token=${encodeURIComponent(token)}`
        : `${siteUrl}/admin`;
      onManage({ site, adminUrl });
    } catch (e) {
      console.error('Auto-login failed:', e);
      onManage({ site, adminUrl: `${siteUrl}/admin` });
    } finally {
      setManaging(false);
    }
  };

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
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        <span>{template}</span>
        {createdAt && <span>· {createdAt}</span>}
        <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Active</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem' }}>Visit Site</a>
        <button className="btn btn-outline" onClick={handleManage} disabled={managing} style={{ flex: 1, fontSize: '0.75rem' }}>
          {managing ? 'Loading...' : 'Manage'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontSize: '0.75rem' }}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
