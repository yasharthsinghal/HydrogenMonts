import React, { useEffect, useState } from 'react';
import { Link, useFetcher } from '@remix-run/react';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from './CartItem';
import { EmptyState } from '~/components/ui/EmptyState';
import { Button } from '~/components/ui/Button';

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart?: {
    id?: string;
    totalQuantity?: number;
    checkoutUrl?: string;
    cost?: {
      subtotalAmount?: {
        amount: string;
        currencyCode: string;
      };
      totalAmount?: {
        amount: string;
        currencyCode: string;
      };
    };
    lines?: {
      nodes?: any[];
      edges?: any[];
    } | any[];
  } | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
}) => {
  const fetcher = useFetcher();
  const isMutating = fetcher.state !== 'idle';
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rawLines: any = cart?.lines;
  const lines: any[] =
    rawLines?.nodes ||
    (rawLines?.edges ? rawLines.edges.map((e: any) => e.node) : null) ||
    (Array.isArray(rawLines) ? rawLines : []);

  const subtotal = cart?.cost?.subtotalAmount?.amount
    ? parseFloat(cart.cost.subtotalAmount.amount)
    : cart?.cost?.totalAmount?.amount
    ? parseFloat(cart.cost.totalAmount.amount)
    : lines.reduce((sum: number, line: any) => {
        const p = parseFloat(line?.cost?.totalAmount?.amount || line?.merchandise?.price?.amount || 0);
        return sum + (isNaN(p) ? 0 : p);
      }, 0);

  const currencyCode =
    cart?.cost?.subtotalAmount?.currencyCode ||
    cart?.cost?.totalAmount?.currencyCode ||
    'INR';

  const freeShippingThreshold = 999;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleUpdateQuantity = (lineId: string, quantity: number) => {
    if (quantity === 0) {
      fetcher.submit(
        {
          cartFormInput: JSON.stringify({
            action: 'LinesRemove',
            inputs: { lineIds: [lineId] },
          }),
        },
        { method: 'POST', action: '/cart' },
      );
    } else {
      fetcher.submit(
        {
          cartFormInput: JSON.stringify({
            action: 'LinesUpdate',
            inputs: { lines: [{ id: lineId, quantity }] },
          }),
        },
        { method: 'POST', action: '/cart' },
      );
    }
  };

  const handleRemoveLine = (lineId: string) => {
    handleUpdateQuantity(lineId, 0);
  };

  const handleCheckout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cart?.checkoutUrl || isRedirecting) return;
    setIsRedirecting(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#060505]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#faf8f5] h-full shadow-2xl z-10 flex flex-col justify-between border-l border-[#e8e4df]">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between p-5 border-b border-[#e8e4df] bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#c4622d]" />
              <h2
                className="text-lg font-bold text-[#060505]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Shopping Cart
              </h2>
              {cart?.totalQuantity !== undefined && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0edea] text-[#2c2c2c]">
                  {cart.totalQuantity}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#686764] hover:text-[#060505] hover:bg-[#f0edea] transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Policy Banner */}
          <div className="p-3.5 bg-[#f5f0e8] border-b border-[#e8e4df] flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-[#060505]">
              <span>🇮🇳 Free Shipping across India</span>
              <span className="text-[#8b7355] text-[11px]">Prepaid & COD</span>
            </div>
            <span className="text-[11px] text-[#686764]">
              ✈️ Worldwide delivery (US, UK, SG, JP, UAE) calculated at actuals.
            </span>
          </div>
        </div>

        {/* Line Items Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {lines.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8" />}
              title="Your Cart is Empty"
              description="Explore our artisanal collection and add handcrafted pieces to your cart."
              actionText="Explore Collection"
              actionHref="/collections/all"
              onAction={onClose}
            />
          ) : (
            <div className="flex flex-col">
              {lines.map((line: any) => (
                <CartItem
                  key={line.id}
                  line={line}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveLine={handleRemoveLine}
                  isUpdating={isMutating}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Subtotal & Checkout Button */}
        {lines.length > 0 && (
          <div className="p-5 border-t border-[#e8e4df] bg-white flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#686764]">Estimated Subtotal</span>
              <span className="text-lg font-bold text-[#060505]">
                {formatPrice(subtotal, currencyCode)}
              </span>
            </div>

            {/* Prepaid Savings Indicator */}
            <div className="flex items-center justify-between p-2.5 bg-[#faf8f5] rounded-[4px] border border-[#c4622d]/25 text-xs">
              <span className="text-[#060505] font-medium flex items-center gap-1.5">
                <span className="text-[#c4622d] font-bold">⚡ Prepaid Offer:</span> 15% Off
              </span>
              <span className="text-[#c4622d] font-bold">
                Save {formatPrice(subtotal * 0.15, currencyCode)}
              </span>
            </div>

            <p className="text-[11px] text-[#686764]">
              Shipping and taxes calculated at checkout.
            </p>
            {cart?.checkoutUrl ? (
              <a
                href={cart.checkoutUrl}
                onClick={handleCheckout}
                className="w-full"
              >
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isRedirecting || isMutating}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isRedirecting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Redirecting to Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </a>
            ) : (
              <Link to="/cart" onClick={onClose}>
                <Button variant="primary" size="lg" className="w-full">
                  View Full Cart
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
