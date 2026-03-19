import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { getProducts } from '../../services/productService.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

export default function WatchAndBuy() {
  const { siteConfig } = useSiteConfig();
  const { formatAmount } = useCurrency();
  const [videos, setVideos] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [playingIdx, setPlayingIdx] = useState(null);
  const videoRefs = useRef([]);
  const containerRef = useRef(null);

  const isSectionHidden = siteConfig?.settings?.showWatchAndBuy === false;

  useEffect(() => {
    if (isSectionHidden) return;
    const configVideos = siteConfig?.settings?.watchAndBuyVideos || [];
    setVideos(configVideos);

    if (configVideos.length > 0 && siteConfig?.id) {
      getProducts(siteConfig.id, { limit: 500 })
        .then(res => {
          const prods = res.data || res.products || [];
          const map = {};
          configVideos.forEach(v => {
            if (v.productSku) {
              const found = prods.find(p => p.sku === v.productSku || p.id === v.productSku);
              const extractImage = (p) => {
                let imgs = p.images;
                if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; } }
                const raw = Array.isArray(imgs) ? (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url) : null;
                return raw || p.thumbnail_url || p.image_url || p.image || p.mainImage || '';
              };
              if (found) {
                map[v.productSku] = {
                  id: found.id,
                  name: found.name,
                  price: found.price,
                  image: resolveImageUrl(extractImage(found)),
                };
              } else if (v.productId) {
                const foundById = prods.find(p => p.id === v.productId);
                if (foundById) {
                  map[v.productSku] = {
                    id: foundById.id,
                    name: foundById.name,
                    price: foundById.price,
                    image: resolveImageUrl(extractImage(foundById)),
                  };
                }
              }
            }
          });
          setProductMap(map);
        })
        .catch(console.error);
    }
  }, [siteConfig]);

  useEffect(() => {
    if (!containerRef.current || videos.length < 2) return;
    const timer = setTimeout(() => {
      const scroll = containerRef.current;
      if (!scroll) return;
      const items = scroll.querySelectorAll('.wb-video-item');
      if (items.length >= 2) {
        const secondItem = items[1];
        const containerCenter = scroll.clientWidth / 2;
        const itemCenter = secondItem.offsetLeft + (secondItem.offsetWidth / 2);
        scroll.scrollTo({ left: itemCenter - containerCenter, behavior: 'smooth' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [videos]);

  useEffect(() => {
    if (!containerRef.current) return;
    const scroll = containerRef.current;
    const items = scroll.querySelectorAll('.wb-video-item');
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          entry.target.classList.add('in-focus');
        } else {
          entry.target.classList.remove('in-focus');
        }
      });
    }, { root: scroll, rootMargin: '0px', threshold: 0.7 });

    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [videos]);

  const handleVideoClick = (idx) => {
    const video = videoRefs.current[idx];
    if (!video) return;
    if (video.paused) {
      videoRefs.current.forEach((v, i) => {
        if (v && i !== idx && !v.paused) v.pause();
      });
      video.play();
      setPlayingIdx(idx);
    } else {
      video.pause();
      setPlayingIdx(null);
    }
  };

  if (!videos.length || isSectionHidden) return null;

  return (
    <section className="wb-section">
      <div className="wb-header">
        <h2 className="wb-title">Watch And Buy</h2>
        <hr className="wb-divider" />
      </div>
      <div className="wb-container">
        <div className="wb-scroll" ref={containerRef}>
          {videos.map((item, idx) => {
            const product = productMap[item.productSku];
            return (
              <div key={item.id || idx} className="wb-video-item">
                <div className="wb-video-wrapper" onClick={() => handleVideoClick(idx)}>
                  <video
                    ref={(el) => (videoRefs.current[idx] = el)}
                    className="wb-video"
                    playsInline
                    loop
                  >
                    <source src={item.videoUrl} type="video/mp4" />
                  </video>

                  {playingIdx !== idx && (
                    <div className="wb-play-overlay">
                      <div className="wb-play-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M8 5.14v14l11-7-11-7z" fill="rgba(255,255,255,0.6)" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {product ? (
                    <Link
                      to={`/product/${product.id}`}
                      className="wb-product-link"
                      onClick={e => e.stopPropagation()}
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="wb-product-img"
                        />
                      )}
                      <div className="wb-product-info">
                        <div className="wb-product-name">{product.name}</div>
                        {product.price && (
                          <div className="wb-product-price">{formatAmount(product.price)}</div>
                        )}
                      </div>
                    </Link>
                  ) : item.productSku ? (
                    <Link
                      to={`/product/${item.productId || item.productSku}`}
                      className="wb-product-link"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="wb-product-placeholder-icon">
                        <i className="fas fa-shopping-bag" style={{ color: '#fff', fontSize: 18 }}></i>
                      </div>
                      <div className="wb-product-info">
                        <div className="wb-product-name">{item.title || 'View Product'}</div>
                        <div className="wb-product-sku">SKU: {item.productSku}</div>
                      </div>
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
