import React, { useState, useEffect } from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategorySection from '../components/home/CategorySection.jsx';
import ChooseByCategory from '../components/home/ChooseByCategory.jsx';
import WatchAndBuy from '../components/home/WatchAndBuy.jsx';
import FeaturedVideoSection from '../components/home/FeaturedVideoSection.jsx';
import ProductShowcase from '../components/home/ProductShowcase.jsx';
import StoreLocations from '../components/home/StoreLocations.jsx';
import CustomerReviews from '../components/home/CustomerReviews.jsx';
import FirstVisitBanner from '../components/home/FirstVisitBanner.jsx';
import { useSiteConfig } from '../hooks/useSiteConfig.js';
import { getCategories } from '../services/categoryService.js';
import { useSEO } from '../hooks/useSEO.js';
import '../styles/hero.css';
import '../styles/categories.css';
import '../styles/featured-video.css';
import '../styles/showcase.css';
import '../styles/locations.css';
import '../styles/reviews.css';
import '../styles/modals.css';
import '../styles/testimonials.css';
import '../styles/home-responsive.css';

export default function HomePage() {
  const { siteConfig, loading: siteLoading } = useSiteConfig();
  const [homeCategories, setHomeCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useSEO({ pageType: 'home' });

  useEffect(() => {
    if (!siteConfig?.id) {
      if (!siteLoading) setCategoriesLoaded(true);
      return;
    }
    setCategoriesLoaded(false);
    getCategories(siteConfig.id)
      .then((res) => {
        const all = res.data || res.categories || [];
        setAllCategories(all);
        const visible = all.filter(c => c.show_on_home === 1 && !c.parent_id);
        visible.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setHomeCategories(visible);
        setCategoriesLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setCategoriesLoaded(true);
      });
  }, [siteConfig?.id, siteLoading]);

  if (!categoriesLoaded) {
    return (
      <div className="home-page">
        <div className="home-page-loader">
          <div className="product-loader-spinner"></div>
          <p className="product-loader-text">Loading store...</p>
        </div>
      </div>
    );
  }

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
      <FeaturedVideoSection />
      {remainingCategories.slice(1).map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
