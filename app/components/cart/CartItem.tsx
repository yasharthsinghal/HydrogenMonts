import React from 'react';
import { Link } from 'react-router';
import { Minus, Plus, Trash2 } from 'lucide-react';

export interface CartLineItemProps {
  line: {
    id: string;
    quantity: number;
    cost: {
      amountPerQuantity: {
        amount: string;
        currencyCode: string;
      };
      totalAmount: {
        amount: string;
        currencyCode: string;
      };
    };
    merchandise: {
      id: string;
      title: string;
      product: {
        title: string;
        handle: string;
      };
      image?: {
        url: string;
        altText?: string | null;
      } | null;
    };
  };
  onUpdateQuantity?: (lineId: string, quantity: number) => void;
  onRemoveLine?: (lineId: string) => void;
  isUpdating?: boolean;
}

export const CartItem: React.FC<CartLineItemProps> = ({
  line,
  onUpdateQuantity,
  onRemoveLine,
  isUpdating = false,
}) => {
  const merchandise = line?.merchandise;
  const cost = line?.cost;
  const quantity = line?.quantity ?? 1;
  const id = line?.id;

  const product = merchandise?.product || {
    title: merchandise?.title || 'Handcrafted Piece',
    handle: '',
  };
  const image = merchandise?.image?.url;

  const formatPrice = (amount: string | number, currency?: string) => {
    const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numeric)) return `${currency || 'INR'} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  const unitAmount =
    cost?.amountPerQuantity?.amount ||
    (merchandise as any)?.price?.amount ||
    '0';
  const unitCurrency =
    cost?.amountPerQuantity?.currencyCode ||
    (merchandise as any)?.price?.currencyCode ||
    'INR';
  const totalAmount =
    cost?.totalAmount?.amount ||
    (parseFloat(unitAmount) * quantity).toString();
  const totalCurrency =
    cost?.totalAmount?.currencyCode || unitCurrency;

  return (
    <div
      className={`flex gap-4 py-4 border-b border-[#e8e4df] ${
        isUpdating ? 'opacity-50 pointer-events-none' : ''
      }`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* 1:1 Image */}
      <div
        className="w-20 h-20 bg-[#f5f0e8] rounded-[2px] overflow-hidden shrink-0 border border-[#e8e4df]/60"
        style={{ aspectRatio: '1/1' }}
      >
        {image ? (
          <img
            src={image}
            alt={merchandise?.image?.altText || product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#e8dfd5]" />
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            {product.handle ? (
              <Link
                to={`/products/${product.handle}`}
                className="text-sm font-semibold text-[#060505] hover:text-[#c4622d] transition-colors leading-snug line-clamp-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {product.title}
              </Link>
            ) : (
              <span
                className="text-sm font-semibold text-[#060505] leading-snug line-clamp-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {product.title}
              </span>
            )}
            {onRemoveLine && id && (
              <button
                type="button"
                onClick={() => onRemoveLine(id)}
                className="text-[#afaba6] hover:text-[#dc2626] transition-colors p-1 cursor-pointer shrink-0"
                aria-label="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {merchandise?.title && merchandise.title !== 'Default Title' && (
            <span className="text-xs text-[#686764] block mt-0.5">
              {merchandise.title}
            </span>
          )}

          <span className="text-xs font-semibold text-[#2c2c2c] block mt-1">
            {formatPrice(unitAmount, unitCurrency)}
          </span>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-[#e8e4df] rounded-[4px] bg-[#faf8f5]">
            <button
              type="button"
              onClick={() => id && onUpdateQuantity?.(id, Math.max(0, quantity - 1))}
              className="p-1.5 text-[#686764] hover:text-[#060505] cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-3 text-xs font-semibold text-[#060505] min-w-[24px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => id && onUpdateQuantity?.(id, quantity + 1)}
              className="p-1.5 text-[#686764] hover:text-[#060505] cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <span className="text-sm font-bold text-[#060505]">
            {formatPrice(totalAmount, totalCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
};
