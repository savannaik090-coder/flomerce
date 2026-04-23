import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SiteContext } from '../../context/SiteContext.jsx';

export default function LinkSelector({ label, value, onChange, showNone = true, style }) {
  const { t } = useTranslation('admin');
  const { siteConfig } = useContext(SiteContext);
  const categories = siteConfig?.categories || [];
  const knownValues = getKnownValues(categories);

  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    if (value && !knownValues.includes(value)) {
      setCustomMode(true);
    }
  }, []);

  const selectValue = customMode ? '__custom__' : (value || '');

  function handleChange(e) {
    const val = e.target.value;
    if (val === '__custom__') {
      setCustomMode(true);
      onChange('');
    } else {
      setCustomMode(false);
      onChange(val);
    }
  }

  return (
    <div style={style}>
      {label && <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{label}</label>}
      <select
        value={selectValue}
        onChange={handleChange}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, background: 'white', boxSizing: 'border-box' }}
      >
        {showNone && <option value="">{t('linkSelector.none')}</option>}
        <optgroup label={t('linkSelector.groupPages')}>
          <option value="/">{t('linkSelector.pageHome')}</option>
          <option value="/about">{t('linkSelector.pageAbout')}</option>
          <option value="/contact">{t('linkSelector.pageContact')}</option>
          <option value="/cart">{t('linkSelector.pageCart')}</option>
          <option value="/wishlist">{t('linkSelector.pageWishlist')}</option>
          <option value="/signup">{t('linkSelector.pageSignup')}</option>
          <option value="/book-appointment">{t('linkSelector.pageBookAppointment')}</option>
          <option value="/order-track">{t('linkSelector.pageOrderTrack')}</option>
          <option value="/profile">{t('linkSelector.pageProfile')}</option>
        </optgroup>
        {categories.length > 0 && (
          <optgroup label={t('linkSelector.groupCategories')}>
            {categories.map(cat => {
              const name = typeof cat === 'string' ? cat : cat.name || '';
              const slug = typeof cat === 'string'
                ? cat.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                : cat.slug || name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
              return <option key={`cat-${slug}`} value={`/category/${slug}`}>{name}</option>;
            })}
          </optgroup>
        )}
        {getSubcategoryOptions(categories).length > 0 && (
          <optgroup label={t('linkSelector.groupSubcategories')}>
            {getSubcategoryOptions(categories).map(sub => (
              <option key={`sub-${sub.value}`} value={sub.value}>{sub.label}</option>
            ))}
          </optgroup>
        )}
        <optgroup label={t('linkSelector.groupOther')}>
          <option value="__custom__">{t('linkSelector.customUrl')}</option>
        </optgroup>
      </select>
      {customMode && (
        <input
          type="text"
          placeholder={t('linkSelector.customPlaceholder')}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 8 }}
        />
      )}
    </div>
  );
}

function getSubcategoryOptions(categories) {
  const options = [];
  for (const cat of categories) {
    const catName = typeof cat === 'string' ? cat : cat.name || '';
    const catSlug = typeof cat === 'string'
      ? cat.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
      : cat.slug || catName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const children = cat.children || [];
    for (const group of children) {
      const grandchildren = group.children || [];
      if (grandchildren.length > 0) {
        for (const val of grandchildren) {
          options.push({
            value: `/category/${catSlug}?subcategory=${val.id}`,
            label: `${catName} > ${group.name} > ${val.name}`,
          });
        }
      } else {
        options.push({
          value: `/category/${catSlug}?subcategory=${group.id}`,
          label: `${catName} > ${group.name}`,
        });
      }
    }
  }
  return options;
}

function getKnownValues(categories) {
  const known = [
    '', '/', '/about', '/contact', '/cart', '/wishlist', '/signup',
    '/book-appointment', '/order-track', '/profile',
  ];
  for (const cat of categories) {
    const name = typeof cat === 'string' ? cat : cat.name || '';
    const slug = typeof cat === 'string'
      ? cat.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
      : cat.slug || name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    known.push(`/category/${slug}`);
  }
  for (const sub of getSubcategoryOptions(categories)) {
    known.push(sub.value);
  }
  return known;
}
