import React, { useState } from 'react';
import { Link } from '@remix-run/react';
import { Eye, ShoppingBag } from 'lucide-react';
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

  const featuredImage = product.featuredImage?.url;
  const secondaryImage = product.images?.nodes?.[1]?.url || featuredImage;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const isOnSale = compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount);
  const firstVariant = product.variants.nodes[0];

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
      className="group relative flex flex-col h-full transition-all duration-300 rounded-[2px] overflow-hidden bg-white border border-[#e8e4df]/60 hover:border-[#e8e4df] hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1:1 Square Image Container */}
      <div className="relative w-full overflow-hidden bg-[#f5f0e8]" style={{ aspectRatio: '1/1' }}>
        <Link to={`/products/${product.handle}`} className="block w-full h-full">
          <img
            src={isHovered ? secondaryImage : featuredImage}
            alt={product.featuredImage?.altText || product.title}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {isOnSale && <Badge variant="sale">Sale</Badge>}
        </div>

        {/* Quick Actions Hover Toolbar */}
        <div
          className="absolute bottom-0 inset-x-0 z-10 flex transition-all duration-200"
          style={{
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
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

          {firstVariant && onAddToCart && (
            <button
              onClick={() => onAddToCart(firstVariant.id)}
              disabled={!firstVariant.availableForSale}
              className="py-2.5 px-4 text-xs font-semibold flex items-center justify-center transition-colors bg-[#c4622d] text-white hover:bg-[#923f12] disabled:bg-[#e1dcd5] cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              title="Add to Cart"
            >
              <ShoppingBag className="w-4 h-4" />
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
