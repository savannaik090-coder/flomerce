import React from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategoryCircles from '../components/home/CategoryCircles.jsx';
import CategorySection from '../components/home/CategorySection.jsx';
import WatchAndBuy from '../components/home/WatchAndBuy.jsx';
import BridalSection from '../components/home/BridalSection.jsx';
import ProductShowcase from '../components/home/ProductShowcase.jsx';
import StoreLocations from '../components/home/StoreLocations.jsx';
import CustomerReviews from '../components/home/CustomerReviews.jsx';
import FirstVisitBanner from '../components/home/FirstVisitBanner.jsx';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import '../styles/hero.css';
import '../styles/categories.css';
import '../styles/bridal.css';
import '../styles/showcase.css';
import '../styles/locations.css';
import '../styles/reviews.css';
import '../styles/modals.css';
import '../styles/testimonials.css';
import '../styles/home-responsive.css';

export default function HomePage() {
  const { siteConfig } = useSiteConfig();
  const categories = siteConfig?.categories || [];
  const homeCategories = categories.filter((cat) => {
    if (typeof cat === 'string') return true;
    return !cat.parent_id && (cat.show_on_home === 1 || cat.show_on_home === true);
  });

  return (
    <div className="home-page">
      <HeroSlider />
      <CategoryCircles />
      {homeCategories.map((cat) => {
        const key = typeof cat === 'string' ? cat : cat.id || cat.slug || cat.name;
        return <CategorySection key={key} category={cat} />;
      })}
      <WatchAndBuy />
      <BridalSection />
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
