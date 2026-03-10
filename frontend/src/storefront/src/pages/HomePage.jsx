import React, { useState, useEffect } from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategorySection from '../components/home/CategorySection.jsx';
import ChooseByCategory from '../components/home/ChooseByCategory.jsx';
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
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    if (!siteConfig?.id) return;
    getCategories(siteConfig.id)
      .then((res) => {
        const all = res.data || res.categories || [];
        setAllCategories(all);
        const visible = all.filter(c => c.show_on_home === 1 && !c.parent_id);
        visible.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setHomeCategories(visible);
      })
      .catch(console.error);
  }, [siteConfig?.id]);

  const remainingCategories = homeCategories.slice(1);

  return (
    <div className="home-page">
      <HeroSlider />
      {homeCategories.length > 0 && (
        <CategorySection key={homeCategories[0].id} category={homeCategories[0]} />
      )}
      <ChooseByCategory categories={allCategories} />
      {remainingCategories.length > 0 && (
        <CategorySection key={remainingCategories[0].id} category={remainingCategories[0]} />
      )}
      <WatchAndBuy />
      {remainingCategories.slice(1).map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
      <BridalSection />
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
