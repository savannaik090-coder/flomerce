import React from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategoryCircles from '../components/home/CategoryCircles.jsx';
import FeaturedCollection from '../components/home/FeaturedCollection.jsx';
import WatchAndBuy from '../components/home/WatchAndBuy.jsx';
import BridalSection from '../components/home/BridalSection.jsx';
import ProductShowcase from '../components/home/ProductShowcase.jsx';
import StoreLocations from '../components/home/StoreLocations.jsx';
import CustomerReviews from '../components/home/CustomerReviews.jsx';
import FirstVisitBanner from '../components/home/FirstVisitBanner.jsx';
import NewArrivals from '../components/home/NewArrivals.jsx';
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
  return (
    <div className="home-page">
      <HeroSlider />
      <CategoryCircles />
      <NewArrivals />
      <FeaturedCollection />
      <WatchAndBuy />
      <BridalSection />
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
