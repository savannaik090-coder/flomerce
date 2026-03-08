import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../../hooks/useSiteConfig.js';
import { formatINR } from '../../utils/priceFormatter.js';

export default function WatchAndBuy() {
  const { siteConfig } = useSiteConfig();
  const [videos, setVideos] = useState([]);
  const [playingIdx, setPlayingIdx] = useState(null);
  const videoRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const configVideos = siteConfig?.settings?.watchAndBuyVideos || [];
    setVideos(configVideos);
  }, [siteConfig]);

  const handlePlay = (idx) => {
    videoRefs.current.forEach((v, i) => {
      if (v && i !== idx) {
        v.pause();
      }
    });
    setPlayingIdx(idx);
  };

  const handleVideoClick = (idx) => {
    const video = videoRefs.current[idx];
    if (!video) return;
    if (video.paused) {
      video.play();
      handlePlay(idx);
    } else {
      video.pause();
      setPlayingIdx(null);
    }
  };

  if (!videos.length) return null;

  return (
    <section className="testimonials-section" style={{ marginTop: '-10px', paddingTop: '10px' }}>
      <div className="featured-collection-header2">
        <h2 className="section-title">Watch And Buy</h2>
      </div>
      <div className="testimonials-container">
        <div
          className="testimonials-scroll"
          ref={containerRef}
          style={{
            display: 'flex',
            gap: '15px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            padding: '0 20px',
          }}
        >
          {videos.map((item, idx) => (
            <div
              key={idx}
              style={{
                flex: '0 0 300px',
                minWidth: '300px',
                scrollSnapAlign: 'start',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                background: '#000',
              }}
            >
              <video
                ref={(el) => (videoRefs.current[idx] = el)}
                style={{
                  width: '100%',
                  height: '500px',
                  objectFit: 'cover',
                  cursor: 'pointer',
                }}
                playsInline
                muted
                loop
                onClick={() => handleVideoClick(idx)}
                poster={item.thumbnail || ''}
              >
                <source src={item.videoUrl} type="video/mp4" />
              </video>

              {playingIdx !== idx && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60px',
                    height: '60px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5.14v14l11-7-11-7z" fill="#ffffff" />
                  </svg>
                </div>
              )}

              {item.product && (
                <Link
                  to={`/product/${item.product.id}`}
                  className="video-product-link"
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textDecoration: 'none',
                    color: '#333',
                  }}
                >
                  {item.product.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>
                    {item.product.name}
                    {item.product.price && (
                      <span style={{ display: 'block', fontSize: '12px', color: '#5a3f2a' }}>
                        {formatINR(item.product.price)}
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#5a3f2a' }}>→</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
