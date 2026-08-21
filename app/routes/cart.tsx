import { useState } from 'react';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, useFetcher, Link, type MetaFunction } from '@remix-run/react';
import { CartItem } from '~/components/cart/CartItem';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { EmptyState } from '~/components/ui/EmptyState';
import { Button } from '~/components/ui/Button';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Shopping Cart | MONTS' },
    { name: 'description', content: 'Review your handcrafted MONTS items and proceed to checkout.' },
  ];
};

import { logger } from '~/utils/logger.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;
  const formData = await request.formData();
  const formInput = formData.get('cartFormInput');

  if (!formInput || typeof formInput !== 'string') {
    logger.warn('Cart action rejected: missing cartFormInput');
    return json({ error: 'Invalid cart input' }, { status: 400 });
  }

  let result;
  try {
    const { action: cartAction, inputs } = JSON.parse(formInput);
    logger.info(`Processing Cart Action: ${cartAction}`, { cartAction, inputs });

    switch (cartAction) {
      case 'LinesAdd':
        result = await cart.addLines(inputs.lines);
        break;
      case 'LinesUpdate':
        result = await cart.updateLines(inputs.lines);
        break;
      case 'LinesRemove':
        result = await cart.removeLines(inputs.lineIds);
        break;
      default:
        logger.warn(`Unknown Cart Action requested: ${cartAction}`);
        return json({ error: 'Unknown cart action' }, { status: 400 });
    }

    const headers = cart.setCartId(result.cart.id);
    logger.info(`Cart Action ${cartAction} completed successfully`, {
      cartId: result.cart.id,
      totalQuantity: result.cart.totalQuantity,
    });
    return json(result, { status: 200, headers });
  } catch (error: any) {
    logger.error('Cart Action Error', error, { formInput });
    return json({ error: error.message || 'Cart operation failed' }, { status: 500 });
  }
}

export async function loader({ context }: LoaderFunctionArgs) {
  const { cart } = context;
  let cartData = null;
  try {
    cartData = await cart.get();
  } catch (error) {
    console.error('Cart loader error:', error);
  }

  return json({ cart: cartData });
}

export default function CartRoute() {
  const { cart } = useLoaderData<typeof loader>() as { cart: any };
  const [isRedirecting, setIsRedirecting] = useState(false);

  const lines = cart?.lines?.nodes || [];
  const subtotal = cart?.cost?.subtotalAmount?.amount ? parseFloat(cart.cost.subtotalAmount.amount) : 0;
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode || 'INR';

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cart?.checkoutUrl || isRedirecting) return;
    setIsRedirecting(true);
  };

  const cartFetcher = useFetcher();
  const isMutating = cartFetcher.state !== 'idle';

  const handleUpdateQuantity = (lineId: string, quantity: number) => {
    const formData = new FormData();
    if (quantity === 0) {
      formData.append(
        'cartFormInput',
        JSON.stringify({
          action: 'LinesRemove',
          inputs: { lineIds: [lineId] },
        }),
      );
    } else {
      formData.append(
        'cartFormInput',
        JSON.stringify({
          action: 'LinesUpdate',
          inputs: { lines: [{ id: lineId, quantity }] },
        }),
      );
    }
    cartFetcher.submit(formData, { method: 'POST', action: '/cart' });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Shopping Cart' }]} className="mb-8" />

      <h1
        className="text-3xl md:text-4xl font-bold text-[#060505] mb-8 pb-4 border-b border-[#e8e4df]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Your Shopping Bag
      </h1>

      {lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10" />}
          title="Your Bag is Empty"
          description="Looks like you haven't added any handcrafted pieces to your bag yet."
          actionText="Explore Collections"
          actionHref="/collections/all"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Line Items (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            {lines.map((line: any) => (
              <CartItem
                key={line.id}
                line={line}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveLine={(id) => handleUpdateQuantity(id, 0)}
                isUpdating={isMutating}
              />
            ))}
          </div>

          {/* Order Summary (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 p-6 bg-white rounded-[6px] border border-[#e8e4df] h-fit" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <h2 className="text-lg font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Order Summary
            </h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-[#686764]">
                <span>Total Items</span>
                <span>{cart?.totalQuantity || 0}</span>
              </div>
              <div className="flex justify-between text-[#686764]">
                <span>Shipping</span>
                <span className="text-[#8b7355] font-medium">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#060505] pt-3 border-t border-[#e8e4df]">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, currencyCode)}</span>
              </div>
            </div>

            {cart?.checkoutUrl ? (
              <a href={cart.checkoutUrl} onClick={handleCheckout} className="w-full">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isRedirecting}
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
              <Button variant="primary" size="lg" className="w-full" disabled>
                Checkout Unavailable
              </Button>
            )}

            <p className="text-xs text-[#686764] text-center leading-relaxed">
              Dispatched with care from our Jaipur studio in 24–48 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
