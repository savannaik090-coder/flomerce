import React, { useState, useEffect, useMemo } from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategorySection from '../components/home/CategorySection.jsx';
import SubcategorySection from '../components/home/SubcategorySection.jsx';
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
  const [subcatSections, setSubcatSections] = useState([]);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useSEO({ pageType: 'home' });

  useEffect(() => {
    if (siteConfig?.settings) {
      let settings = {};
      try {
        settings = typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {});
      } catch (e) {
        settings = {};
      }
      setSubcatSections(settings.subcategorySections || []);
      setSectionOrder(settings.homepageSectionOrder || []);
    }
  }, [siteConfig?.settings]);

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

  const orderedSections = useMemo(() => {
    const allItems = [];
    homeCategories.forEach(cat => allItems.push({ type: 'category', id: cat.id, data: cat }));
    subcatSections.forEach(sec => allItems.push({ type: 'subcategory', id: sec.id, data: sec }));

    if (sectionOrder.length === 0) return allItems;

    const ordered = [];
    const remaining = [...allItems];
    for (const entry of sectionOrder) {
      const idx = remaining.findIndex(item => item.type === entry.type && item.id === entry.id);
      if (idx !== -1) {
        ordered.push(remaining.splice(idx, 1)[0]);
      }
    }
    return [...ordered, ...remaining];
  }, [homeCategories, subcatSections, sectionOrder]);

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

  return (
    <div className="home-page">
      <HeroSlider />
      {orderedSections.length > 0 && orderedSections[0].type === 'category' ? (
        <CategorySection key={orderedSections[0].id} category={orderedSections[0].data} />
      ) : orderedSections.length > 0 && orderedSections[0].type === 'subcategory' ? (
        <SubcategorySection key={orderedSections[0].id} section={orderedSections[0].data} />
      ) : null}
      <ChooseByCategory categories={allCategories} />
      {orderedSections.length > 1 && orderedSections[1].type === 'category' ? (
        <CategorySection key={orderedSections[1].id} category={orderedSections[1].data} />
      ) : orderedSections.length > 1 && orderedSections[1].type === 'subcategory' ? (
        <SubcategorySection key={orderedSections[1].id} section={orderedSections[1].data} />
      ) : null}
      <WatchAndBuy />
      <FeaturedVideoSection />
      {orderedSections.slice(2).map((item) => (
        item.type === 'category' ? (
          <CategorySection key={item.id} category={item.data} />
        ) : (
          <SubcategorySection key={item.id} section={item.data} />
        )
      ))}
      <ProductShowcase />
      <StoreLocations />
      <CustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
