import React, { useState, useEffect } from 'react';
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
import { getCategories } from '../services/categoryService.js';
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
  const [homeCategories, setHomeCategories] = useState([]);

  useEffect(() => {
    if (!siteConfig?.id) return;
    getCategories(siteConfig.id)
      .then((res) => {
        const all = res.data || res.categories || [];
        const visible = all.filter(c => c.show_on_home === 1 && !c.parent_id);
        visible.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setHomeCategories(visible);
      })
      .catch(console.error);
  }, [siteConfig?.id]);

  return (
    <div className="home-page">
      <HeroSlider />
      <CategoryCircles />
      {homeCategories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
      <WatchAndBuy />
      <BridalSection />
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
