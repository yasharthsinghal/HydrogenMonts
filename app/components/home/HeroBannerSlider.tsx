import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { HeroBannerItem } from '~/types/banner.types';

interface HeroBannerSliderProps {
  banners: HeroBannerItem[];
  fallbackImage?: string;
  autoPlayIntervalMs?: number;
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({
  banners,
  fallbackImage = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-lifestyle-1.jpg',
  autoPlayIntervalMs = 6000,
}) => {
  // Filter only active banners
  const activeBanners = banners.filter((b) => b.isActive);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch gesture state for mobile swiping
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const totalSlides = activeBanners.length;

  const handleNextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const handleSelectSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Autoplay effect
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNextSlide();
    }, autoPlayIntervalMs);

    return () => clearInterval(timer);
  }, [totalSlides, isPaused, autoPlayIntervalMs, handleNextSlide]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped left -> Next slide
      handleNextSlide();
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> Prev slide
      handlePrevSlide();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  if (totalSlides === 0) {
    return null;
  }

  return (
    <section
      className="relative w-full overflow-hidden bg-[#060505] select-none"
      style={{ minHeight: '82vh' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Hero Banners"
    >
      {activeBanners.map((banner, index) => {
        const isCurrent = index === currentSlide;
        const desktopImg = banner.imageDesktop || fallbackImage;
        const mobileImg = banner.imageMobile || desktopImg;

        // Gradient overlay styles
        let overlayGradient = 'linear-gradient(to bottom, rgba(6,5,5,0.25) 0%, rgba(6,5,5,0.65) 60%, rgba(6,5,5,0.92) 100%)';
        if (banner.overlayDarkness === 'dark') {
          overlayGradient = 'linear-gradient(to bottom, rgba(6,5,5,0.45) 0%, rgba(6,5,5,0.8) 60%, rgba(6,5,5,0.96) 100%)';
        } else if (banner.overlayDarkness === 'light') {
          overlayGradient = 'linear-gradient(to bottom, rgba(6,5,5,0.1) 0%, rgba(6,5,5,0.45) 60%, rgba(6,5,5,0.75) 100%)';
        } else if (banner.overlayDarkness === 'none' || banner.displayMode === 'image-only') {
          overlayGradient = 'none';
        }

        return (
          <div
            key={banner.id || `banner-${index}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out flex items-center justify-center ${
              isCurrent ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {/* Background Picture with Responsive Mobile & Desktop Assets */}
            <div className="absolute inset-0">
              <picture className="w-full h-full block">
                {banner.imageMobile && (
                  <source media="(max-width: 767px)" srcSet={mobileImg} />
                )}
                <img
                  src={desktopImg}
                  alt={banner.title || 'MONTS Banner'}
                  className="w-full h-full object-cover transform scale-102 transition-transform duration-10000"
                  style={{ objectPosition: 'center 35%' }}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </picture>

              {/* Scrim Overlay */}
              {overlayGradient !== 'none' && (
                <div
                  className="absolute inset-0"
                  style={{ background: overlayGradient }}
                />
              )}
            </div>

            {/* Content Mode: Image-Only (Whole slide is a direct clickable link) */}
            {banner.displayMode === 'image-only' ? (
              <Link
                to={banner.ctaLink || '/collections/all'}
                className="absolute inset-0 z-10 w-full h-full block cursor-pointer"
                aria-label={banner.title || 'View Promotion'}
              />
            ) : (
              /* Content Mode: Text Overlay with Dynamic Typography & CTAs */
              <div
                className={`relative z-10 px-6 max-w-3xl mx-auto flex flex-col gap-6 ${
                  banner.textAlignment === 'left'
                    ? 'items-start text-left'
                    : banner.textAlignment === 'right'
                    ? 'items-end text-right'
                    : 'items-center text-center'
                }`}
              >
                {banner.badge && (
                  <span
                    className="text-xs uppercase tracking-[0.35em] font-semibold flex items-center gap-2 text-[#e8dfd5] bg-[#060505]/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-sm animate-fade-in"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c4622d]" />
                    {banner.badge}
                  </span>
                )}

                {banner.title && (
                  <h1
                    className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-tight text-white drop-shadow-md tracking-tight"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {banner.title}
                  </h1>
                )}

                {banner.subtitle && (
                  <p
                    className="text-base sm:text-xl font-light max-w-xl text-white/90 leading-relaxed drop-shadow-sm"
                    style={{ fontFamily: "'Cormorant', serif" }}
                  >
                    {banner.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  {banner.ctaText && banner.ctaLink && (
                    <Link
                      to={banner.ctaLink}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all bg-[#c4622d] text-white hover:bg-[#923f12] active:scale-95 cursor-pointer shadow-lg hover:shadow-xl"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span>{banner.ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  {banner.secondaryText && banner.secondaryLink && (
                    banner.secondaryLink.startsWith('http') ? (
                      <a
                        href={banner.secondaryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all text-white border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-xs active:scale-95 cursor-pointer"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {banner.secondaryText}
                      </a>
                    ) : (
                      <Link
                        to={banner.secondaryLink}
                        className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all text-white border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-xs active:scale-95 cursor-pointer"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {banner.secondaryText}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Navigation Controls: Left & Right Arrows (shown only if > 1 slide) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060505]/45 hover:bg-[#c4622d] text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-md group"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060505]/45 hover:bg-[#c4622d] text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-md group"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Indicator Navigation Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#060505]/35 backdrop-blur-md border border-white/10">
            {activeBanners.map((_, dotIdx) => (
              <button
                key={`dot-${dotIdx}`}
                type="button"
                onClick={() => handleSelectSlide(dotIdx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  dotIdx === currentSlide
                    ? 'w-8 bg-[#c4622d]'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
