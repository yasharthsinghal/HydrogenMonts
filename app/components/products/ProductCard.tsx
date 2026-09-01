import React, { useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { Eye, ShoppingBag, Loader2 } from 'lucide-react';
import type { ProductCardItem } from '~/types/storefront.types';
import { Badge } from '~/components/ui/Badge';

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
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== 'idle';

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

    fetcher.submit(
      {
        cartFormInput: JSON.stringify({
          action: 'LinesAdd',
          inputs: {
            lines: [{ merchandiseId: firstVariant.id, quantity: 1 }],
          },
        }),
      },
      { method: 'POST', action: '/cart' },
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cart'));
    }
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
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1:1 Square Image Container */}
      <div className="relative w-full overflow-hidden bg-[#f5f0e8]" style={{ aspectRatio: '1/1' }}>
        <Link to={`/products/${product.handle}`} className="relative block w-full h-full overflow-hidden">
          {/* Featured Primary Image */}
          <img
            src={featuredImage}
            alt={product.featuredImage?.altText || product.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
            style={{
              opacity: isHovered && secondaryImage && secondaryImage !== featuredImage ? 0 : 1,
            }}
          />
          {/* Secondary Lookbook Image (Cross-faded on hover) */}
          {secondaryImage && secondaryImage !== featuredImage && (
            <img
              src={secondaryImage}
              alt={`${product.title} alternate view`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
              style={{
                opacity: isHovered ? 1 : 0,
              }}
            />
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {isOnSale && <Badge variant="sale">Sale</Badge>}
        </div>

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
