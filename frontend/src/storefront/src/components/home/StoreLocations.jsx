import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { isPlanAtLeast } from '../../utils/plan.js';
import { storeLocationDefaults } from '../../defaults/generic.js';
import TranslatedText from '../TranslatedText';

export default function StoreLocations() {
  const { siteConfig } = useSiteConfig();
  const scrollRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const stores = settings.storeLocations || [];
  const address = siteConfig?.address;
  const phone = siteConfig?.phone;
  const appointmentBookingAllowed = isPlanAtLeast(siteConfig?.subscriptionPlan, 'growth');

  if (settings.showStoreLocations !== true) return null;
  if (!stores.length && !address) return null;

  const defaultStore = stores.length
    ? stores
    : [
        {
          name: siteConfig?.brandName
            ? `${siteConfig.brandName} ${storeLocationDefaults.brandedNameSuffix}`
            : storeLocationDefaults.name,
          address: address || '',
          hours: storeLocationDefaults.hours,
          phone: phone || '',
          mapLink: '',
          image: '',
        },
      ];

  function scrollPrev() {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('.store-card');
    if (card) scrollRef.current.scrollBy({ left: -(card.offsetWidth + 16), behavior: 'smooth' });
  }

  function scrollNext() {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('.store-card');
    if (card) scrollRef.current.scrollBy({ left: card.offsetWidth + 16, behavior: 'smooth' });
  }

  return (
    <section className="store-locations-section">
      <div className="store-locations-container">
        <div className="store-locations-header">
          <h2><TranslatedText text="Come Visit Us at Our Store" /></h2>
          <p><TranslatedText text="Experience our exquisite collection in person" /></p>
        </div>

        <div className="stores-grid-wrapper">
          {defaultStore.length > 1 && (
            <button className="stores-scroll-arrow stores-scroll-left" onClick={scrollPrev} aria-label="Scroll left">
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
          <div className="stores-grid" ref={scrollRef}>
            {defaultStore.map((store, i) => (
            <div key={i} className="store-card">
              <div className="store-image">
                {store.image ? (
                  <img src={store.image} alt={store.name} />
                ) : (
                  <div style={{ width: '100%', height: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="store-details">
                <h3 className="store-name"><TranslatedText text={store.name} /></h3>
                {store.address && <p className="store-address"><TranslatedText text={store.address} /></p>}
                {store.hours && (
                  <div className="store-hours">
                    <i className="far fa-clock"></i>
                    <span><TranslatedText text={store.hours} /></span>
                  </div>
                )}
                <div className="store-contact">
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="store-phone">
                      {store.phone}
                    </a>
                  )}
                  {store.mapLink && (
                    <a href={store.mapLink} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-map-marker-alt"></i> <TranslatedText text="View on Map" />
                    </a>
                  )}
                </div>
                <div className="store-actions">
                  {appointmentBookingAllowed && (
                    <Link to="/book-appointment" className="book-appointment-btn">
                      <TranslatedText text="BOOK APPOINTMENT" />
                    </Link>
                  )}
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="call-btn" aria-label="Call store">
                      <i className="fas fa-phone"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
          {defaultStore.length > 1 && (
            <button className="stores-scroll-arrow stores-scroll-right" onClick={scrollNext} aria-label="Scroll right">
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
