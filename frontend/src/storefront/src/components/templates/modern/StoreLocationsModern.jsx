import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { isPlanAtLeast } from '../../../utils/plan.js';
import { storeLocationDefaults, storeLocationBrandedTemplate } from '../../../defaults/generic.js';
import TranslatedText from '../../TranslatedText';
import { useShopperTranslation } from '../../../context/ShopperTranslationContext.jsx';

export default function StoreLocationsModern() {
  const { translate: tx } = useShopperTranslation();
  const { siteConfig } = useSiteConfig();
  const scrollRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const stores = settings.storeLocations || [];
  const address = siteConfig?.address;
  const phone = siteConfig?.phone;
  const appointmentBookingAllowed = isPlanAtLeast(siteConfig?.subscriptionPlan, 'growth');

  if (settings.showStoreLocations !== true) return null;

  const defaultStore = stores.length
    ? stores
    : [
        {
          name: siteConfig?.brandName
            ? storeLocationBrandedTemplate.name
            : storeLocationDefaults.name,
          _nameVars: siteConfig?.brandName ? { brand: siteConfig.brandName } : undefined,
          address: address || '',
          hours: storeLocationDefaults.hours,
          phone: phone || '',
          mapLink: '',
          image: '',
        },
      ];

  function scrollPrev() {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('.mn-store-card');
    if (card) scrollRef.current.scrollBy({ left: -(card.offsetWidth + 20), behavior: 'smooth' });
  }

  function scrollNext() {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('.mn-store-card');
    if (card) scrollRef.current.scrollBy({ left: card.offsetWidth + 20, behavior: 'smooth' });
  }

  return (
    <section className="mn-store-locations">
      <div className="mn-store-locations-container">
        <div className="mn-store-locations-header">
          <h2 className="mn-store-locations-title"><TranslatedText text="Come Visit Us at Our Store" /></h2>
          <p className="mn-store-locations-subtitle"><TranslatedText text="Experience our exquisite collection in person" /></p>
        </div>

        <div className="mn-store-locations-wrapper">
          {defaultStore.length > 1 && (
            <button className="mn-store-locations-arrow mn-store-locations-arrow-left" onClick={scrollPrev} aria-label={tx("Scroll left")}>
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
          <div className="mn-store-locations-scroll" ref={scrollRef}>
            {defaultStore.map((store, i) => (
              <div key={i} className="mn-store-card">
                <div className="mn-store-card-image">
                  {store.image ? (
                    <img src={store.image} alt={store.name} />
                  ) : (
                    <div className="mn-store-card-image-placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="mn-store-card-body">
                  <h3 className="mn-store-card-name"><TranslatedText text={store.name} vars={store._nameVars} /></h3>
                  {store.address && <p className="mn-store-card-info"><TranslatedText text={store.address} /></p>}
                  {store.hours && (
                    <div className="mn-store-card-row">
                      <i className="far fa-clock"></i>
                      <span><TranslatedText text={store.hours} /></span>
                    </div>
                  )}
                  {(store.phone || store.mapLink) && (
                    <div className="mn-store-card-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      {store.phone && (
                        <a href={`tel:${store.phone}`} className="mn-store-card-phone">{store.phone}</a>
                      )}
                      {store.mapLink && (
                        <a href={store.mapLink} target="_blank" rel="noopener noreferrer" className="mn-store-card-maplink">
                          <TranslatedText text="View on Map" />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="mn-store-card-actions">
                    {appointmentBookingAllowed && (
                      <Link to="/book-appointment" className="mn-store-book-btn">
                        <TranslatedText text="BOOK APPOINTMENT" />
                      </Link>
                    )}
                    {store.phone && (
                      <a href={`tel:${store.phone}`} className="mn-store-call-btn" aria-label={tx("Call store")}>
                        <i className="fas fa-phone"></i>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {defaultStore.length > 1 && (
            <button className="mn-store-locations-arrow mn-store-locations-arrow-right" onClick={scrollNext} aria-label={tx("Scroll right")}>
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
