import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useFetcher, useNavigate } from 'react-router';
import { Eye, ShoppingBag, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductCardItem } from '~/types/storefront.types';
import { Badge } from '~/components/ui/Badge';
import productSlideshowConfig from '~/data/product-slideshow.json';

export interface ProductCardProps {
  product: ProductCardItem;
  onQuickView?: (product: ProductCardItem) => void;
  onAddToCart?: (variantId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const fetcher = useFetcher<{ cart?: { id?: string }; error?: string }>();
  const navigate = useNavigate();
  const [openCartWhenAdded, setOpenCartWhenAdded] = useState(false);
  const isAdding = fetcher.state !== 'idle';

  // Resolve product slideshow images (JSON overrides -> product images -> featured image)
  const customImages = (
    productSlideshowConfig?.customImagesByHandle as Record<string, string[]> | undefined
  )?.[product.handle];

  const galleryImages: { url: string; altText?: string | null }[] = useMemo(() => {
    if (customImages && Array.isArray(customImages) && customImages.length > 0) {
      return customImages.map((url) => ({ url, altText: product.title }));
    }

    const imgs: { url: string; altText?: string | null }[] = [];
    const seen = new Set<string>();

    if (product.featuredImage?.url) {
      imgs.push({
        url: product.featuredImage.url,
        altText: product.featuredImage.altText || product.title,
      });
      seen.add(product.featuredImage.url);
    }

    if (product.images?.nodes) {
      for (const node of product.images.nodes) {
        if (node?.url && !seen.has(node.url)) {
          imgs.push({
            url: node.url,
            altText: node.altText || product.title,
          });
          seen.add(node.url);
        }
      }
    }

    return imgs;
  }, [product, customImages]);

  const totalImages = galleryImages.length;
  const isSlideshowActive = Boolean(productSlideshowConfig?.enabled && totalImages > 1);

  // Auto-play cycling on hover
  useEffect(() => {
    if (!isSlideshowActive || !productSlideshowConfig?.autoPlayOnHover || !isHovered) {
      return;
    }

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % totalImages);
    }, productSlideshowConfig.autoPlayIntervalMs || 1500);

    return () => clearInterval(interval);
  }, [isSlideshowActive, isHovered, totalImages]);

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % totalImages);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(idx);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40 && isSlideshowActive) {
      if (diff > 0) {
        setActiveImageIndex((prev) => (prev + 1) % totalImages);
      } else {
        setActiveImageIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
      }
    }
    touchStartXRef.current = null;
  };

  useEffect(() => {
    if (!openCartWhenAdded || fetcher.state !== 'idle' || !fetcher.data) return;
    setOpenCartWhenAdded(false);
    if (fetcher.data.cart && !fetcher.data.error) {
      navigate('/cart');
    }
  }, [fetcher.data, fetcher.state, navigate, openCartWhenAdded]);

  const featuredImage = product.featuredImage?.url;
  const secondaryImage = product.images?.nodes?.[1]?.url || featuredImage;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const isOnSale = compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount);
  const firstVariant = product.variants.nodes[0];

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart && firstVariant?.id) {
      onAddToCart(firstVariant.id);
      return;
    }

    if (!firstVariant?.id) return;

    setOpenCartWhenAdded(true);

    fetcher.submit(
      {
        cartFormInput: JSON.stringify({
          action: 'LinesAdd',
          inputs: {
            lines: [
              {
                merchandiseId: firstVariant.id,
                quantity: 1,
                selectedVariant: firstVariant,
              },
            ],
          },
        }),
      },
      { method: 'POST', action: '/cart' },
    );

  };

  const formatPrice = (amount: string, currency: string) => {
    const numeric = parseFloat(amount);
    if (isNaN(numeric)) return `${currency} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  return (
    <div
      className="group relative flex flex-col h-full transition-all duration-300 rounded-[2px] overflow-hidden bg-white border border-[#e8e4df]/60 hover:border-[#dac7b4] hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveImageIndex(0);
      }}
    >
      {/* 1:1 Square Image Slideshow Container */}
      <div
        className="relative w-full overflow-hidden bg-[#f5f0e8] select-none"
        style={{ aspectRatio: '1/1' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          to={`/products/${product.handle}`}
          className="absolute inset-0 w-full h-full block overflow-hidden"
        >
          {totalImages > 0 ? (
            <>
              {/* Base Primary Image (Guaranteed solid rendering) */}
              <img
                src={galleryImages[0]?.url || product.featuredImage?.url || ''}
                alt={galleryImages[0]?.altText || product.title}
                loading="eager"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-out group-hover:scale-105 ${
                  activeImageIndex === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              />

              {/* Secondary/Subsequent Slideshow Images */}
              {galleryImages.slice(1).map((img, idx) => {
                const slideIndex = idx + 1;
                return (
                  <img
                    key={img.url || slideIndex}
                    src={img.url}
                    alt={img.altText || `${product.title} view ${slideIndex + 1}`}
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-out group-hover:scale-105 ${
                      slideIndex === activeImageIndex
                        ? 'opacity-100 z-10'
                        : 'opacity-0 pointer-events-none z-0'
                    }`}
                  />
                );
              })}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f0edea] text-[#8b7355] p-4 text-center">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-40" />
              <span
                className="text-[11px] font-medium tracking-wide uppercase text-[#686764]/70"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Artisanal Piece
              </span>
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {isOnSale && <Badge variant="sale">Sale</Badge>}
        </div>

        {/* Slideshow Arrow Navigation */}
        {isSlideshowActive && productSlideshowConfig?.showArrows && (
          <div className="absolute inset-y-0 inset-x-1.5 flex items-center justify-between pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous image"
              className="p-1 rounded-full bg-white/90 text-[#1a1a1a] hover:bg-white hover:text-[#c4622d] shadow-sm backdrop-blur-xs transition-all pointer-events-auto active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next image"
              className="p-1 rounded-full bg-white/90 text-[#1a1a1a] hover:bg-white hover:text-[#c4622d] shadow-sm backdrop-blur-xs transition-all pointer-events-auto active:scale-90 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Slideshow Dots Pagination */}
        {isSlideshowActive && productSlideshowConfig?.showDots && totalImages <= 8 && (
          <div className="absolute bottom-2.5 group-hover:bottom-12 transition-all duration-200 inset-x-0 flex items-center justify-center gap-1 z-10 pointer-events-none">
            {galleryImages.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => handleDotClick(e, dotIdx)}
                aria-label={`Slide ${dotIdx + 1}`}
                className={`transition-all duration-300 pointer-events-auto rounded-full cursor-pointer ${
                  dotIdx === activeImageIndex
                    ? 'w-3.5 h-1.5 bg-[#c4622d]'
                    : 'w-1.5 h-1.5 bg-black/35 hover:bg-black/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Quick Actions Hover Toolbar */}
        <div className="absolute bottom-0 inset-x-0 z-10 flex transform transition-all duration-200 ease-out translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
          {onQuickView ? (
            <button
              onClick={() => onQuickView(product)}
              className="flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white/95 text-[#1a1a1a] hover:bg-white cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Eye className="w-3.5 h-3.5" />
              Quick View
            </button>
          ) : (
            <Link
              to={`/products/${product.handle}`}
              className="flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white/95 text-[#1a1a1a] hover:bg-white text-center"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </Link>
          )}

          {firstVariant && (
            <button
              onClick={handleCartClick}
              disabled={!firstVariant.availableForSale || isAdding}
              className="py-2.5 px-4 text-xs font-semibold flex items-center justify-center transition-all duration-150 bg-[#c4622d] text-white hover:bg-[#923f12] disabled:bg-[#e1dcd5] active:scale-95 cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              title={firstVariant.availableForSale ? 'Add to Cart' : 'Sold Out'}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-between bg-white">
        <div>
          {product.vendor && (
            <span
              className="text-[11px] font-medium uppercase tracking-wider block text-[#686764]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {product.vendor}
            </span>
          )}
          <Link
            to={`/products/${product.handle}`}
            className="text-sm font-semibold leading-snug line-clamp-1 transition-colors text-[#060505] hover:text-[#c4622d]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {product.title}
          </Link>
        </div>

        {/* Price Row */}
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-sm font-medium text-[#2c2c2c]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {formatPrice(price.amount, price.currencyCode)}
          </span>
          {isOnSale && compareAtPrice && (
            <span
              className="text-xs line-through text-[#686764]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
