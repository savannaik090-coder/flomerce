import React, { useState, useEffect, useContext, useRef } from 'react';
import { SiteContext } from '../../context/SiteContext.jsx';
import SectionToggle from './SectionToggle.jsx';
import SaveBar from './SaveBar.jsx';

const API_BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('fluxe.in') ? '' : 'https://fluxe.in';

const CATEGORY_DEFAULTS = {
  jewellery: {
    shippingRegions: 'We ship across India and select international destinations',
    shippingCharges: 'Free shipping on orders above ₹2,000. Standard shipping ₹99 for orders below ₹2,000',
    shippingDeliveryTime: '5-7 business days for domestic orders. 10-15 business days for international orders',
    shippingTracking: 'Real-time tracking via SMS and email once your order is dispatched',
    returnPolicy: '7-day return policy for unused and undamaged items in original packaging. Custom or personalized jewellery is non-returnable',
    returnReplacements: 'Replacements available for damaged or defective items within 48 hours of delivery',
    returnMandatory: 'Original invoice, undamaged packaging, and all product tags must be intact for returns',
    careGuideWashing: 'Avoid contact with water, perfumes, and chemicals. Remove jewellery before bathing or swimming',
    careGuideCleaning: 'Gently wipe with a soft dry cloth after each use. Use a jewellery polishing cloth for shine',
    careGuideMaintenance: 'Store in the provided jewellery box or a soft pouch. Keep pieces separated to avoid scratches',
  },
  clothing: {
    shippingRegions: 'We deliver across India with express and standard shipping options',
    shippingCharges: 'Free shipping on orders above ₹999. Standard shipping ₹79 for orders below ₹999',
    shippingDeliveryTime: '3-5 business days for metro cities. 5-7 business days for other locations',
    shippingTracking: 'Track your order in real-time via SMS, email, and WhatsApp updates',
    returnPolicy: '15-day easy return and exchange policy for unused items with original tags attached',
    returnReplacements: 'Size exchanges available subject to stock. Replacements for manufacturing defects',
    returnMandatory: 'Items must be unworn, unwashed, with all original tags and packaging intact',
    careGuideWashing: 'Follow the care label instructions on each garment. Use mild detergent and cold water for delicate fabrics',
    careGuideCleaning: 'Dry clean recommended for embroidered and embellished pieces. Spot clean minor stains gently',
    careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight. Use padded hangers for structured garments',
  },
  electronics: {
    shippingRegions: 'Pan-India delivery available. Select products eligible for international shipping',
    shippingCharges: 'Free shipping on all orders above ₹1,500. Flat ₹149 for smaller orders',
    shippingDeliveryTime: '2-4 business days for metros. 5-7 business days for other pin codes',
    shippingTracking: 'Real-time order tracking via our website, SMS, and email notifications',
    returnPolicy: '7-day replacement policy for manufacturing defects. No return on opened software or accessories',
    returnReplacements: 'Direct replacement for defective units. Manufacturer warranty applies for extended coverage',
    returnMandatory: 'Original packaging, accessories, invoice, and warranty card must be included with returns',
    careGuideWashing: 'Do not expose to water or moisture. Use only manufacturer-approved cleaning solutions',
    careGuideCleaning: 'Wipe surfaces with a soft microfiber cloth. Use compressed air for ports and vents',
    careGuideMaintenance: 'Store in a cool, dry environment. Use surge protectors and avoid overcharging batteries',
  },
};

const DEFAULT_VALUES = {
  shippingRegions: 'We ship across India and select international destinations',
  shippingCharges: 'Free shipping on orders above ₹1,500. Standard shipping charges apply for smaller orders',
  shippingDeliveryTime: '5-7 business days for standard delivery. Express delivery available in select cities',
  shippingTracking: 'Real-time tracking updates via SMS and email after dispatch',
  returnPolicy: '7-day return policy for unused items in original packaging with tags intact',
  returnReplacements: 'Replacements available for damaged or defective products within 48 hours of delivery',
  returnMandatory: 'Original packaging, invoice, and product tags must be intact for all returns',
  careGuideWashing: 'Follow the specific care instructions provided with your product',
  careGuideCleaning: 'Clean gently with appropriate materials as recommended for the product type',
  careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight and moisture',
};

const CATEGORY_PLACEHOLDERS = {
  jewellery: {
    shippingRegions: 'e.g., Pan-India and select international destinations',
    shippingCharges: 'e.g., Free above ₹2,000, ₹99 for smaller orders',
    shippingDeliveryTime: 'e.g., 5-7 business days domestic, 10-15 international',
    shippingTracking: 'e.g., Real-time SMS and email tracking',
    returnPolicy: 'e.g., 7-day return for unused items. Custom pieces non-returnable',
    returnReplacements: 'e.g., Replacements for damaged items within 48 hours',
    returnMandatory: 'e.g., Original invoice and undamaged packaging required',
    careGuideCleaning: 'e.g., Wipe with soft dry cloth after each use',
    careGuideWashing: 'e.g., Avoid water, perfumes, and chemicals',
    careGuideMaintenance: 'e.g., Store in jewellery box, keep pieces separated',
  },
  clothing: {
    shippingRegions: 'e.g., All India delivery with express options',
    shippingCharges: 'e.g., Free above ₹999, ₹79 for smaller orders',
    shippingDeliveryTime: 'e.g., 3-5 days metro, 5-7 days other areas',
    shippingTracking: 'e.g., SMS, email, and WhatsApp tracking',
    returnPolicy: 'e.g., 15-day easy return with original tags',
    returnReplacements: 'e.g., Size exchanges subject to stock',
    returnMandatory: 'e.g., Unworn, unwashed, with original tags',
    careGuideCleaning: 'e.g., Dry clean for embroidered pieces',
    careGuideWashing: 'e.g., Follow care label, mild detergent, cold water',
    careGuideMaintenance: 'e.g., Store away from sunlight, use padded hangers',
  },
  electronics: {
    shippingRegions: 'e.g., Pan-India, select international shipping',
    shippingCharges: 'e.g., Free above ₹1,500, ₹149 for others',
    shippingDeliveryTime: 'e.g., 2-4 days metro, 5-7 days other areas',
    shippingTracking: 'e.g., Website, SMS, and email tracking',
    returnPolicy: 'e.g., 7-day replacement for defects',
    returnReplacements: 'e.g., Direct replacement, manufacturer warranty',
    returnMandatory: 'e.g., Original packaging, accessories, warranty card',
    careGuideCleaning: 'e.g., Microfiber cloth, compressed air for ports',
    careGuideWashing: 'e.g., No water exposure, approved cleaners only',
    careGuideMaintenance: 'e.g., Cool dry storage, use surge protectors',
  },
};

const DEFAULT_PLACEHOLDERS = {
  shippingRegions: 'e.g., Pan-India and international delivery',
  shippingCharges: 'e.g., Free above ₹1,500, standard charges below',
  shippingDeliveryTime: 'e.g., 5-7 business days standard delivery',
  shippingTracking: 'e.g., SMS and email tracking after dispatch',
  returnPolicy: 'e.g., 7-day return for unused items',
  returnReplacements: 'e.g., Replacements for defective items',
  returnMandatory: 'e.g., Original packaging and invoice required',
  careGuideCleaning: 'e.g., Clean gently with soft cloth',
  careGuideWashing: 'e.g., Follow product care instructions',
  careGuideMaintenance: 'e.g., Store in cool, dry place',
};

export default function ProductPoliciesEditor({ onSaved, onPreviewUpdate }) {
  const { siteConfig } = useContext(SiteContext);
  const [showSection, setShowSection] = useState(true);
  const [fields, setFields] = useState({
    shippingRegions: '',
    shippingCharges: '',
    shippingDeliveryTime: '',
    shippingTracking: '',
    returnPolicy: '',
    returnReplacements: '',
    returnMandatory: '',
    careGuideCleaning: '',
    careGuideWashing: '',
    careGuideMaintenance: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedRef = useRef(false);

  const placeholders = CATEGORY_PLACEHOLDERS[siteConfig?.category] || DEFAULT_PLACEHOLDERS;

  useEffect(() => {
    if (siteConfig?.id) loadSettings();
  }, [siteConfig?.id]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setHasChanges(true);
    if (onPreviewUpdate) onPreviewUpdate({ ...fields, showProductPolicies: showSection });
  }, [fields, showSection]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site?subdomain=${encodeURIComponent(siteConfig.subdomain)}`);
      const result = await response.json();
      if (result.success && result.data) {
        let settings = result.data.settings || {};
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
        }
        setFields({
          shippingRegions: settings.shippingRegions || '',
          shippingCharges: settings.shippingCharges || '',
          shippingDeliveryTime: settings.shippingDeliveryTime || '',
          shippingTracking: settings.shippingTracking || '',
          returnPolicy: settings.returnPolicy || '',
          returnReplacements: settings.returnReplacements || '',
          returnMandatory: settings.returnMandatory || '',
          careGuideCleaning: settings.careGuideCleaning || '',
          careGuideWashing: settings.careGuideWashing || '',
          careGuideMaintenance: settings.careGuideMaintenance || '',
        });
        setShowSection(settings.showProductPolicies !== false);
      }
    } catch (e) {
      console.error('Failed to load product policies settings:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { hasLoadedRef.current = true; }, 0);
    }
  }

  function handleChange(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  function handleLoadDefaults() {
    const defaults = CATEGORY_DEFAULTS[siteConfig?.category] || DEFAULT_VALUES;
    setFields(defaults);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = sessionStorage.getItem('site_admin_token');
      const response = await fetch(`${API_BASE}/api/sites/${siteConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `SiteAdmin ${token}` : '',
        },
        body: JSON.stringify({ settings: { ...fields, showProductPolicies: showSection } }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setStatus('success');
        setHasChanges(false);
        if (onSaved) onSaved();
      } else {
        setStatus('error:' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      setStatus('error:' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner-admin"><div className="spinner" /></div>;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#334155',
    background: '#fff',
    resize: 'vertical',
    minHeight: 42,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 6,
  };

  const fieldGroupStyle = {
    marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <SaveBar topBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      <form onSubmit={handleSave}>
        <SectionToggle
          enabled={showSection}
          onChange={setShowSection}
          label="Show Product Policies"
          description="Toggle shipping, returns, and care guide sections on product pages"
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>Product Policies</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              These details appear as expandable sections on every product page
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadDefaults}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fas fa-magic" style={{ marginRight: 6 }} />
            Load Defaults
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-truck" style={{ marginRight: 8, color: '#64748b' }} />
              Shipping & Delivery Details
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Regions</label>
              <textarea
                value={fields.shippingRegions}
                onChange={(e) => handleChange('shippingRegions', e.target.value)}
                placeholder={placeholders.shippingRegions}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Shipping Charges</label>
              <textarea
                value={fields.shippingCharges}
                onChange={(e) => handleChange('shippingCharges', e.target.value)}
                placeholder={placeholders.shippingCharges}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Delivery Time</label>
              <textarea
                value={fields.shippingDeliveryTime}
                onChange={(e) => handleChange('shippingDeliveryTime', e.target.value)}
                placeholder={placeholders.shippingDeliveryTime}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tracking</label>
              <textarea
                value={fields.shippingTracking}
                onChange={(e) => handleChange('shippingTracking', e.target.value)}
                placeholder={placeholders.shippingTracking}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-exchange-alt" style={{ marginRight: 8, color: '#64748b' }} />
              Return & Exchange
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Policy</label>
              <textarea
                value={fields.returnPolicy}
                onChange={(e) => handleChange('returnPolicy', e.target.value)}
                placeholder={placeholders.returnPolicy}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Replacements</label>
              <textarea
                value={fields.returnReplacements}
                onChange={(e) => handleChange('returnReplacements', e.target.value)}
                placeholder={placeholders.returnReplacements}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Mandatory Requirement</label>
              <textarea
                value={fields.returnMandatory}
                onChange={(e) => handleChange('returnMandatory', e.target.value)}
                placeholder={placeholders.returnMandatory}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-hand-holding-heart" style={{ marginRight: 8, color: '#64748b' }} />
              Care Guide
            </h3>
          </div>
          <div className="card-body">
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Cleaning</label>
              <textarea
                value={fields.careGuideCleaning}
                onChange={(e) => handleChange('careGuideCleaning', e.target.value)}
                placeholder={placeholders.careGuideCleaning}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Washing</label>
              <textarea
                value={fields.careGuideWashing}
                onChange={(e) => handleChange('careGuideWashing', e.target.value)}
                placeholder={placeholders.careGuideWashing}
                style={inputStyle}
                rows={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Maintenance</label>
              <textarea
                value={fields.careGuideMaintenance}
                onChange={(e) => handleChange('careGuideMaintenance', e.target.value)}
                placeholder={placeholders.careGuideMaintenance}
                style={inputStyle}
                rows={2}
              />
            </div>
          </div>
        </div>

        <SaveBar saving={saving} hasChanges={hasChanges} onSave={(e) => handleSave(e || { preventDefault: () => {} })} />
      </form>
    </div>
  );
}
