import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../../hooks/useSiteConfig.js';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import './modern.css';
import TranslatedText from '../../TranslatedText';

export default function BrandStory() {
  const { siteConfig } = useSiteConfig();
  const settings = siteConfig?.settings || {};

  const isHidden = settings.showBrandStory === false;
  if (isHidden) return null;

  const headline = settings.brandStoryHeadline || '';
  const text = settings.brandStoryText || '';
  const image = settings.brandStoryImage || '';
  const ctaText = settings.brandStoryCtaText || '';
  const ctaLink = settings.brandStoryCtaLink || '/about';

  return (
    <section className="mn-brand-section">
      <div className="mn-brand-container">
        {image && (
          <div className="mn-brand-image-side">
            <img src={resolveImageUrl(image)} alt={headline} className="mn-brand-image" />
          </div>
        )}
        <div className={`mn-brand-text-side ${!image ? 'mn-brand-text-full' : ''}`}>
          <span className="mn-brand-label"><TranslatedText text="Our Brand" /></span>
          <h2 className="mn-brand-headline">
            {headline
              ? <TranslatedText text={headline} />
              : <TranslatedText text="Our Story" />}
          </h2>
          <p className="mn-brand-body">
            {text
              ? <TranslatedText text={text} />
              : <TranslatedText text="We believe in crafting products that blend quality with purpose. Every piece is thoughtfully designed to bring beauty and function into your everyday life." />}
          </p>
          {ctaText && ctaLink.startsWith('http') ? (
            <a href={ctaLink} className="mn-brand-cta" target="_blank" rel="noopener noreferrer"><TranslatedText text={ctaText} /></a>
          ) : ctaText ? (
            <Link to={ctaLink} className="mn-brand-cta"><TranslatedText text={ctaText} /></Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
