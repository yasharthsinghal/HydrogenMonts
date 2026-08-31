import { redirect, useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { EmptyState } from '~/components/ui/EmptyState';
import {
  Package,
  Calendar,
  MapPin,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Truck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { shopifyCustomerService } from '~/services/shopify/customer.server';
import { getHydrogenContext } from '~/lib/context.server';

export const meta: MetaFunction = () => [
  { title: 'Order Details | MONTS' },
  { name: 'description', content: 'Detailed tracking and itemized invoice for your handcrafted MONTS order.' },
];

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { id } = params;
  const { session, storefront, env } = await getHydrogenContext(context, request);

  const customerEmail = session.get('customerEmail') as string | undefined;
  const customerAccessToken = session.get('customerAccessToken') as string | undefined;

  // Not authenticated via OTP or Storefront token → redirect to login
  if (!customerEmail && !customerAccessToken) {
    return redirect(`/account/login?return_to=/account/orders/${id}`);
  }

  if (!id) {
    return redirect('/account');
  }

  const { order, customer, permissionDenied, unauthorized } =
    await shopifyCustomerService.getOrder(storefront, customerAccessToken, customerEmail, id, env);

  if (unauthorized) {
    throw new Response('Unauthorized Access to Order', { status: 403 });
  }

  return {
    order,
    customer,
    requestedId: id,
    permissionDenied: Boolean(permissionDenied),
    customerEmail: customerEmail || customer?.email || '',
  };
}

export default function OrderDetailRoute() {
  const { order, customer, requestedId, permissionDenied, customerEmail } =
    useLoaderData<typeof loader>();

  const formatPrice = (amount: string | number, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return `${currency || 'INR'} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const displayName = order?.name || `#${requestedId.replace('#', '')}`;
  const shippingAddr =
    order?.shippingAddress ||
    customer?.defaultAddress ||
    customer?.addresses?.nodes?.[0];

  return (
    <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Breadcrumb
        items={[
          { label: 'My Account', href: '/account' },
          { label: `Order ${displayName}` },
        ]}
        className="mb-8"
      />

      {/* Case 1: Order Details Found & Active */}
      {order ? (
        <div className="flex flex-col gap-8">
          {/* Header Card */}
          <div className="bg-[#faf8f5] rounded-[8px] border border-[#e8e4df] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355]">
                  Order Reference
                </span>
                <Badge variant={order.financialStatus === 'PAID' ? 'default' : 'outline'}>
                  {order.financialStatus}
                </Badge>
                <Badge variant={order.fulfillmentStatus === 'FULFILLED' ? 'default' : 'outline'}>
                  {order.fulfillmentStatus}
                </Badge>
              </div>
              <h1
                className="text-3xl md:text-4xl font-bold text-[#060505]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {displayName}
              </h1>
              <p className="text-xs text-[#686764] mt-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Processed on {formatDate(order.processedAt)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/account">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                  All Orders
                </Button>
              </Link>
              {order.statusUrl && (
                <a href={order.statusUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="sm" className="flex items-center gap-1.5 cursor-pointer">
                    Track on Shopify
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Line items */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-[8px] border border-[#e8e4df] p-6 shadow-sm">
                <h3
                  className="text-lg font-bold text-[#060505] mb-4 pb-3 border-b border-[#e8e4df]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Purchased Items ({order.lineItems?.nodes?.length ?? 0})
                </h3>

                <div className="divide-y divide-[#e8e4df]">
                  {(order.lineItems?.nodes ?? []).map((item: any, idx: number) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {item.variant?.image?.url ? (
                          <img
                            src={item.variant.image.url}
                            alt={item.title}
                            className="w-16 h-16 rounded-[4px] object-cover bg-[#f5f0e8] border border-[#e8e4df]"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-[4px] bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[#060505]">{item.title}</p>
                          {item.variant?.title && item.variant.title !== 'Default Title' && (
                            <p className="text-xs text-[#686764] mt-0.5">{item.variant.title}</p>
                          )}
                          <p className="text-xs text-[#8b7355] mt-1">Quantity: {item.quantity}</p>
                        </div>
                      </div>

                      {item.variant?.price && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#060505]">
                            {formatPrice(
                              parseFloat(item.variant.price.amount || '0') * (item.quantity || 1),
                              item.variant.price.currencyCode || order.totalPrice?.currencyCode || 'INR',
                            )}
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-[#686764]">
                              {formatPrice(item.variant.price.amount, item.variant.price.currencyCode)} each
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary & Delivery */}
            <div className="flex flex-col gap-6">
              {/* Payment Summary */}
              <div className="bg-[#faf8f5] rounded-[8px] border border-[#e8e4df] p-6 shadow-sm">
                <h3
                  className="text-base font-bold text-[#060505] mb-4 pb-3 border-b border-[#e8e4df]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Order Summary
                </h3>
                <div className="flex flex-col gap-2.5 text-xs text-[#686764]">
                  <div className="flex justify-between">
                    <span>Payment Status</span>
                    <span className="font-semibold text-[#060505]">{order.financialStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fulfillment</span>
                    <span className="font-semibold text-[#060505]">{order.fulfillmentStatus}</span>
                  </div>
                  <div className="pt-3 border-t border-[#e8e4df] flex justify-between items-center text-sm font-bold text-[#060505]">
                    <span>Total Paid</span>
                    <span className="text-base text-[#c4622d]">
                      {formatPrice(order.totalPrice?.amount ?? '0', order.totalPrice?.currencyCode ?? 'INR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {shippingAddr && (
                <div className="bg-white rounded-[8px] border border-[#e8e4df] p-6 shadow-sm text-xs text-[#686764]">
                  <div className="flex items-center gap-2 mb-3 text-[#060505] font-bold text-sm">
                    <MapPin className="w-4 h-4 text-[#c4622d]" />
                    <span>Delivery Details</span>
                  </div>
                  <p className="font-semibold text-[#060505] mb-1">
                    {shippingAddr.firstName} {shippingAddr.lastName}
                  </p>
                  <p>{shippingAddr.address1}</p>
                  {shippingAddr.address2 && <p>{shippingAddr.address2}</p>}
                  <p>
                    {shippingAddr.city}
                    {shippingAddr.province ? `, ${shippingAddr.province}` : ''}{' '}
                    {shippingAddr.zip}
                  </p>
                  <p>{shippingAddr.country}</p>
                  {shippingAddr.phone && <p className="mt-2 text-[11px] text-[#8b7355]">{shippingAddr.phone}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : permissionDenied ? (
        /* Case 2: Scope Missing in Admin App */
        <div className="bg-[#faf8f5] rounded-[8px] border border-[#e8e4df] p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#c4622d]/10 text-[#c4622d] flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-2">
            Order Reference #{requestedId}
          </span>
          <h2
            className="text-2xl md:text-3xl font-bold text-[#060505] mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Order Recorded on Shopify
          </h2>
          <p className="text-sm text-[#686764] mb-6 leading-relaxed">
            Your order <strong>#{requestedId}</strong> has been registered in our central store. Itemized
            line-item tracking on this storefront requires the <code className="bg-[#f0edea] px-1.5 py-0.5 rounded text-[#c4622d] font-mono">read_orders</code> access
            scope in your Shopify custom app.
          </p>

          <div className="bg-white border border-[#e8e4df] rounded-[6px] p-5 text-left text-xs text-[#686764] mb-6 space-y-2">
            <div className="flex items-center gap-2 text-[#060505] font-semibold">
              <AlertCircle className="w-4 h-4 text-[#c4622d]" />
              <span>To view order line-items here:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px]">
              <li>Open <strong>Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps</strong>.</li>
              <li>Select your storefront app and click <strong>Configuration</strong>.</li>
              <li>Under <strong>Admin API access scopes</strong>, enable <strong>read_orders</strong>.</li>
              <li>Click <strong>Save</strong>.</li>
            </ol>
          </div>

          <p className="text-xs text-[#8b7355] mb-6">
            A confirmation receipt with full tracking details was sent to <strong>{customerEmail}</strong>.
          </p>

          <div className="flex justify-center gap-4">
            <Link to="/account">
              <Button variant="outline" size="sm">
                Back to My Account
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="primary" size="sm">
                Contact Concierge
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Case 3: Order Not Found */
        <div className="max-w-2xl mx-auto py-12">
          <EmptyState
            icon={<HelpCircle className="w-10 h-10 text-[#8b7355]" />}
            title="Order Not Found"
            description={`We could not locate an order matching "${requestedId}". Please check your order reference number or view your account dashboard.`}
            actionText="Back to My Account"
            actionHref="/account"
          />
        </div>
      )}
    </div>
  );
}
