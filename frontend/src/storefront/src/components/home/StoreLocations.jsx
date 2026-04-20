import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';

export default function StoreLocations() {
  const { siteConfig } = useSiteConfig();
  const scrollRef = useRef(null);

  const settings = siteConfig?.settings || {};
  const stores = settings.storeLocations || [];
  const address = siteConfig?.address;
  const phone = siteConfig?.phone;

  if (settings.showStoreLocations !== true) return null;
  if (!stores.length && !address) return null;

  const defaultStore = stores.length
    ? stores
    : [
        {
          name: siteConfig?.brandName ? `${siteConfig.brandName} Showroom` : 'Our Showroom',
          address: address || '',
          hours: 'Monday to Saturday 11:00 am - 08:00 pm',
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
    <section className="store-locations-section" data-flomerce-section="store-locations">
      <div className="store-locations-container">
        <div className="store-locations-header">
          <h2>Come Visit Us at Our Store</h2>
          <p>Experience our exquisite collection in person</p>
        </div>

        <div className="stores-grid-wrapper">
          {defaultStore.length > 1 && (
            <button className="stores-scroll-arrow stores-scroll-left" onClick={scrollPrev}>
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
          <div className="stores-grid" ref={scrollRef}>
            {defaultStore.map((store, i) => (
            <div key={i} className="store-card">
              {store.image && (
                <div className="store-image">
                  <img src={store.image} alt={store.name} />
                </div>
              )}
              <div className="store-details">
                <h3 className="store-name">{store.name}</h3>
                {store.address && <p className="store-address">{store.address}</p>}
                {store.hours && (
                  <div className="store-hours">
                    <i className="far fa-clock"></i>
                    <span>{store.hours}</span>
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
                      <i className="fas fa-map-marker-alt"></i> View on Map
                    </a>
                  )}
                </div>
                <div className="store-actions">
                  <Link to="/book-appointment" className="book-appointment-btn">
                    BOOK APPOINTMENT
                  </Link>
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="call-btn">
                      <i className="fas fa-phone"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
          {defaultStore.length > 1 && (
            <button className="stores-scroll-arrow stores-scroll-right" onClick={scrollNext}>
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
