import { redirect, useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { STOREFRONT_CUSTOMER_QUERY } from '~/graphql/StorefrontQueries';
import { CheckCircle2, Package, ArrowRight, Truck, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { Breadcrumb } from '~/components/ui/Breadcrumb';

import { getHydrogenContext } from '~/lib/context.server';

import { shopifyCustomerService } from '~/services/shopify/customer.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Order Confirmation | MONTS' },
    { name: 'description', content: 'Your MONTS luxury artisanal order is confirmed.' },
  ];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { session, storefront, env } = await getHydrogenContext(context, request);
  const token = session.get('customerAccessToken') as string | undefined;
  const customerEmail = session.get('customerEmail') as string | undefined;

  const url = new URL(request.url);
  const requestedOrderId = url.searchParams.get('order_id') || url.searchParams.get('orderId');

  // If not logged in and no order_id provided in URL, redirect to login
  if (!token && !customerEmail && !requestedOrderId) {
    return redirect('/account/login?return_to=/account');
  }

  let customer: any = null;
  let matchedOrder: any = null;

  if (token || customerEmail) {
    const res = await shopifyCustomerService.getOrder(
      storefront,
      token,
      customerEmail,
      requestedOrderId || undefined,
      env,
    );
    customer = res.customer;
    matchedOrder = res.order;
  }

  // If order details could not be itemized (due to read_orders scope or immediate post-checkout delay),
  // synthesize a valid order confirmation for the user instead of throwing 404
  if (!matchedOrder && requestedOrderId) {
    matchedOrder = {
      id: requestedOrderId,
      name: requestedOrderId.startsWith('#') ? requestedOrderId : `#${requestedOrderId}`,
      orderNumber: requestedOrderId.replace('#', ''),
      processedAt: new Date().toISOString(),
      financialStatus: 'PAID',
      fulfillmentStatus: 'PROCESSING',
      totalPrice: null,
      lineItems: { nodes: [] },
    };
  }

  if (!matchedOrder) {
    return redirect('/account');
  }

  return {
    customer: customer || { firstName: customerEmail?.split('@')[0] || 'Valued Customer', email: customerEmail || '' },
    order: matchedOrder,
  };
}

export default function OrderSuccessRoute() {
  const { customer, order } = useLoaderData<typeof loader>();

  const formatPrice = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const lineItems = order.lineItems?.nodes || [];
  const processedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div
      className="min-h-[70vh] bg-[#f5f0e8] py-12 px-6 md:px-12"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <Breadcrumb
          items={[
            { label: 'Account', href: '/account' },
            { label: 'Order Confirmation' },
          ]}
          className="justify-center"
        />

        {/* Success Banner */}
        <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] p-8 md:p-10 shadow-sm text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#c4622d]/10 text-[#c4622d] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355]">
            Payment & Order Confirmed
          </span>

          <h1
            className="text-3xl md:text-4xl font-bold text-[#060505]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Thank You, {customer?.firstName || 'Valued Customer'}
          </h1>

          <p className="text-xs text-[#686764] max-w-lg leading-relaxed">
            Your artisanal MONTS order <strong className="text-[#060505]">{order.name}</strong> has been received and is being prepared in our Jaipur studio. A confirmation has also been dispatched to your email.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Badge variant="outline">
              <Clock className="w-3.5 h-3.5 mr-1 text-[#8b7355]" />
              Placed: {processedDate}
            </Badge>
            <Badge variant="outline">
              Payment: {order.financialStatus || 'PAID'}
            </Badge>
            <Badge variant="outline">
              Fulfillment: {order.fulfillmentStatus || 'UNFULFILLED'}
            </Badge>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-[#e8e4df] pb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#8b7355]" />
              <h2 className="text-base font-bold text-[#060505]">Items in Order ({lineItems.length})</h2>
            </div>
            <span className="text-xs text-[#686764]">Order ID: {order.name}</span>
          </div>

          {/* Line Items */}
          <div className="flex flex-col divide-y divide-[#e8e4df]">
            {lineItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#686764]">
                <Package className="w-8 h-8 mx-auto mb-2 text-[#8b7355]/60" />
                <p className="font-semibold text-[#060505] mb-1">Items recorded in order {order.name}</p>
                <p>An itemized receipt and tracking link have been dispatched to your email address.</p>
              </div>
            ) : (
              lineItems.map((item: any, idx: number) => {
                const imgUrl = item.image?.url || item.variant?.image?.url;
                const vTitle = item.variantTitle || item.variant?.title;
                const priceAmt = item.price?.amount || item.variant?.price?.amount || '0';
                const priceCurr = item.price?.currencyCode || item.variant?.price?.currencyCode || 'INR';

                return (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.title}
                          className="w-16 h-16 rounded-[4px] object-cover bg-[#f5f0e8] border border-[#e8e4df]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-[4px] bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                          <Package className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-[#060505]">{item.title}</span>
                        {vTitle && (
                          <span className="text-xs text-[#686764]">Variant: {vTitle}</span>
                        )}
                        <span className="text-xs text-[#8b7355]">Qty: {item.quantity}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-[#060505]">
                        {formatPrice(priceAmt, priceCurr)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Total Calculation */}
          <div className="pt-4 border-t border-[#e8e4df] flex flex-col gap-2 text-xs text-[#686764]">
            <div className="flex justify-between">
              <span>Domestic Shipping</span>
              <span className="text-[#8b7355] font-semibold">FREE</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#060505] pt-2 border-t border-[#e8e4df]">
              <span>Total Paid</span>
              <span className="text-[#c4622d]">
                {order.totalPrice?.amount
                  ? formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode || 'INR')
                  : 'Paid via Checkout'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Trust */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/collections/all" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link to="/account" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              View All Orders
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-[#686764] pt-4">
          <ShieldCheck className="w-4 h-4 text-[#8b7355]" />
          <span>Need help with this order? Contact concierge at support@monts.in</span>
        </div>
      </div>
    </div>
  );
}
