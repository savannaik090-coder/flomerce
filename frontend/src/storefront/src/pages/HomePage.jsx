import React, { useState, useEffect, useMemo } from 'react';
import HeroSlider from '../components/home/HeroSlider.jsx';
import CategorySection from '../components/home/CategorySection.jsx';
import SubcategorySection from '../components/home/SubcategorySection.jsx';
import ChooseByCategory from '../components/home/ChooseByCategory.jsx';
import WatchAndBuy from '../components/home/WatchAndBuy.jsx';
import FeaturedVideoSection from '../components/home/FeaturedVideoSection.jsx';
import ProductShowcase from '../components/home/ProductShowcase.jsx';
import ShopTheLook from '../components/home/ShopTheLook.jsx';
import StoreLocations from '../components/home/StoreLocations.jsx';
import StoreLocationsModern from '../components/templates/modern/StoreLocationsModern.jsx';
import CustomerReviews from '../components/home/CustomerReviews.jsx';
import CustomerReviewsModern from '../components/templates/modern/CustomerReviewsModern.jsx';
import FirstVisitBanner from '../components/home/FirstVisitBanner.jsx';
import HeroSplit from '../components/templates/modern/HeroSplit.jsx';
import CategoryGrid from '../components/templates/modern/CategoryGrid.jsx';
import TrendingNow from '../components/templates/modern/TrendingNow.jsx';
import BrandStory from '../components/templates/modern/BrandStory.jsx';
import ChooseByCategoryModern from '../components/templates/modern/ChooseByCategoryModern.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
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
import '../styles/shop-the-look.css';
import '../styles/home-responsive.css';
import TranslatedText from '../components/TranslatedText';

export default function HomePage() {
  const { siteConfig, loading: siteLoading } = useSiteConfig();
  const theme = useTheme();
  const isModern = theme.id === 'modern';
  const [apiCategories, setApiCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useSEO({ pageType: 'home' });

  const parsedSettings = useMemo(() => {
    if (!siteConfig?.settings) return {};
    try {
      return typeof siteConfig.settings === 'string' ? JSON.parse(siteConfig.settings) : (siteConfig.settings || {});
    } catch (e) { return {}; }
  }, [siteConfig?.settings]);

  const subcatSections = parsedSettings.subcategorySections || [];
  const sectionOrder = parsedSettings.homepageSectionOrder || [];
  const chooseConf = parsedSettings.chooseByCategory || {};
  const chooseEnabled = !!chooseConf.enabled;

  useEffect(() => {
    if (!siteConfig?.id) {
      if (!siteLoading) setCategoriesLoaded(true);
      return;
    }
    setCategoriesLoaded(false);
    getCategories(siteConfig.id)
      .then((res) => {
        setApiCategories(res.data || res.categories || []);
        setCategoriesLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setCategoriesLoaded(true);
      });
  }, [siteConfig?.id, siteLoading]);

  const allCategories = parsedSettings._previewCategories || apiCategories;

  const homeCategories = useMemo(() => {
    const visible = allCategories.filter(c => c.show_on_home === 1 && !c.parent_id);
    visible.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return visible;
  }, [allCategories]);

  // Build the list of fixed sections that are currently enabled, in
  // default visual order. Their position can be overridden by sectionOrder.
  const fixedSections = useMemo(() => {
    if (isModern) return [
      ...(parsedSettings.showTrendingNow !== false ? [{ id: 'trending_now', name: 'Trending Now' }] : []),
      ...(parsedSettings.showBrandStory !== false ? [{ id: 'brand_story', name: 'Brand Story' }] : []),
    ];
    return [
      ...(parsedSettings.showWatchAndBuy !== false ? [{ id: 'watch_and_buy', name: 'Watch & Buy' }] : []),
      ...(parsedSettings.showFeaturedVideo !== false ? [{ id: 'featured_video', name: 'Featured Video' }] : []),
      ...(parsedSettings.showShopTheLook !== false ? [{ id: 'shop_the_look', name: 'Shop the Look' }] : []),
    ];
  }, [parsedSettings, isModern]);

  const orderedSections = useMemo(() => {
    const allItems = [];
    homeCategories.forEach(cat => allItems.push({ type: 'category', id: cat.id, data: cat }));
    subcatSections.forEach(sec => allItems.push({ type: 'subcategory', id: sec.id, data: sec }));
    if (chooseEnabled) allItems.push({ type: 'choose', id: 'choose_by_category', data: null });
    fixedSections.forEach(fs => allItems.push({ type: 'fixed', id: fs.id, data: null }));

    if (sectionOrder.length === 0) return allItems;

    const ordered = [];
    const remaining = [...allItems];
    for (const entry of sectionOrder) {
      const idx = remaining.findIndex(item => item.type === entry.type && item.id === entry.id);
      if (idx !== -1) ordered.push(remaining.splice(idx, 1)[0]);
    }
    return [...ordered, ...remaining];
  }, [homeCategories, subcatSections, sectionOrder, chooseEnabled, fixedSections]);

  if (!categoriesLoaded) {
    return (
      <div className="home-page">
        <div className="home-page-loader">
          <div className="product-loader-spinner"></div>
          <p className="product-loader-text"><TranslatedText text="Loading store..." /></p>
        </div>
      </div>
    );
  }

  const ActiveHero = isModern ? HeroSplit : HeroSlider;
  const ActiveCustomerReviews = isModern ? CustomerReviewsModern : CustomerReviews;
  const ActiveChooseByCategory = isModern ? ChooseByCategoryModern : ChooseByCategory;

  function renderSection(item) {
    if (item.type === 'category') {
      const ActiveCategory = isModern ? CategoryGrid : CategorySection;
      return <ActiveCategory key={item.id} category={item.data} />;
    }
    if (item.type === 'subcategory') {
      return <SubcategorySection key={item.id} section={item.data} />;
    }
    if (item.type === 'choose') {
      return <ActiveChooseByCategory key="choose_by_category" categories={allCategories} />;
    }
    if (item.type === 'fixed') {
      if (item.id === 'watch_and_buy') return <WatchAndBuy key="watch_and_buy" />;
      if (item.id === 'featured_video') return <FeaturedVideoSection key="featured_video" />;
      if (item.id === 'shop_the_look') return <ShopTheLook key="shop_the_look" />;
      if (item.id === 'trending_now') return <TrendingNow key="trending_now" />;
      if (item.id === 'brand_story') return <BrandStory key="brand_story" />;
    }
    return null;
  }

  if (isModern) {
    return (
      <div className="home-page">
        <ActiveHero />
        {orderedSections.map((item) => renderSection(item))}
        <StoreLocationsModern />
        <ProductShowcase />
        <ActiveCustomerReviews />
        <FirstVisitBanner />
      </div>
    );
  }

  return (
    <div className="home-page">
      <HeroSlider />
      {orderedSections.map((item) => renderSection(item))}
      <ProductShowcase />
      <StoreLocations />
      <ActiveCustomerReviews />
      <FirstVisitBanner />
    </div>
  );
}
