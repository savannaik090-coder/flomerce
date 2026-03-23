import React, { useMemo } from 'react';
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
  const { fullCategories } = useSiteConfig();

  useSEO({ pageType: 'home' });

  const homeCategories = useMemo(() => {
    const visible = (fullCategories || []).filter(c => c.show_on_home === 1 && !c.parent_id);
    visible.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return visible;
  }, [fullCategories]);

  const remainingCategories = homeCategories.slice(1);

  return (
    <div className="home-page">
      <HeroSlider />
      {homeCategories.length > 0 && (
        <CategorySection key={homeCategories[0].id} category={homeCategories[0]} />
      )}
      <ChooseByCategory categories={fullCategories} />
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
