import { redirect, useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { useState } from 'react';
import { STOREFRONT_CUSTOMER_QUERY } from '~/graphql/StorefrontQueries';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { Tabs } from '~/components/ui/Tabs';
import { EmptyState } from '~/components/ui/EmptyState';
import { Package, MapPin, LogOut, Calendar, ShieldCheck, Mail } from 'lucide-react';
import { shopifyCustomerService } from '~/services/shopify/customer.server';

export const meta: MetaFunction = () => [
  { title: 'My Account | MONTS' },
  { name: 'description', content: 'Your orders, addresses and profile — all in one place.' },
];

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { session, storefront, env } = await getHydrogenContext(context, request);

  const customerEmail = session.get('customerEmail') as string | undefined;
  const customerAccessToken = session.get('customerAccessToken') as string | undefined;

  // Not authenticated → redirect to in-app OTP login
  if (!customerEmail) {
    return redirect('/account/login?return_to=/account');
  }

  // Fetch live customer data from Shopify (Storefront API token or Admin fallback)
  console.info(`\n📄 [Account Page Loader] Loading /account for customerEmail: ${customerEmail}`);
  const customer = await shopifyCustomerService.getCustomerProfile(
    storefront,
    customerAccessToken,
    customerEmail,
    env,
  );
  console.info(`📦 [Account Page Loader] Customer payload delivered to UI:`, JSON.stringify(customer, null, 2));

  return { customerEmail, customer };
}

export default function AccountIndexRoute() {
  const { customerEmail, customer } = useLoaderData<typeof loader>() as {
    customerEmail: string;
    customer: any;
  };
  const [activeTab, setActiveTab] = useState('orders');

  const orders = customer?.orders?.nodes ?? [];
  const addresses = customer?.addresses?.nodes ?? [];
  const defaultAddressId = customer?.defaultAddress?.id;
  const displayName =
    customer?.firstName ||
    customerEmail?.split('@')[0] ||
    'Member';

  const formatPrice = (amount: string, currency: string) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(parseFloat(amount) || 0);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account' }]} className="mb-8" />

      {/* Profile Banner */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 md:p-8 bg-[#faf8f5] rounded-[8px] border border-[#e8e4df] mb-10 shadow-sm"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#c4622d]/10 text-[#c4622d] flex items-center justify-center font-bold text-xl shrink-0 uppercase">
            {displayName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Welcome, {displayName}
              </h1>
              <span className="flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="w-3 h-3" />
                OTP Verified
              </span>
            </div>
            <p className="text-xs text-[#686764] mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#8b7355]" />
              {customerEmail}
            </p>
          </div>
        </div>

        <Link to="/account/logout">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'orders',
            label: 'Order History',
            count: orders.length,
            content: orders.length === 0 ? (
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="No Orders Yet"
                description="When you place an order it will appear here with live tracking."
                actionText="Start Shopping"
                actionHref="/collections/all"
              />
            ) : (
              <div className="flex flex-col gap-6">
                {orders.map((order: any) => (
                  <div key={order.id} className="bg-white rounded-[6px] border border-[#e8e4df] p-6 flex flex-col gap-4 shadow-sm">
                    {/* Meta */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e8e4df]">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-[#060505]">{order.name}</span>
                        <span className="flex items-center gap-1 text-xs text-[#686764]">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(order.processedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={order.financialStatus === 'PAID' ? 'default' : 'outline'}>
                          {order.financialStatus}
                        </Badge>
                        <Badge variant={order.fulfillmentStatus === 'FULFILLED' ? 'default' : 'outline'}>
                          {order.fulfillmentStatus}
                        </Badge>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="flex flex-col divide-y divide-[#e8e4df]">
                      {(order.lineItems?.nodes ?? []).map((item: any, idx: number) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {item.variant?.image?.url ? (
                              <img src={item.variant.image.url} alt={item.title}
                                className="w-12 h-12 rounded-[4px] object-cover bg-[#f5f0e8] border border-[#e8e4df]" />
                            ) : (
                              <div className="w-12 h-12 rounded-[4px] bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-[#060505]">{item.title}</p>
                              {item.variant?.title && item.variant.title !== 'Default Title' && (
                                <p className="text-[11px] text-[#686764]">{item.variant.title}</p>
                              )}
                              <p className="text-[11px] text-[#8b7355]">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          {item.variant?.price && (
                            <span className="text-xs font-bold text-[#060505]">
                              {formatPrice(item.variant.price.amount, item.variant.price.currencyCode)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-[#e8e4df] flex justify-between text-xs">
                      <span className="text-[#686764]">Order Total</span>
                      <span className="font-bold text-sm text-[#c4622d]">
                        {formatPrice(order.totalPrice?.amount ?? '0', order.totalPrice?.currencyCode ?? 'INR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            id: 'addresses',
            label: 'Saved Addresses',
            count: addresses.length,
            content: addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-8 h-8" />}
                title="No Saved Addresses"
                description="Your shipping addresses are saved automatically after your first checkout."
                actionText="Browse Collection"
                actionHref="/collections/all"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr: any) => (
                  <div key={addr.id} className="bg-white rounded-[6px] border border-[#e8e4df] p-5 flex flex-col gap-2 shadow-sm text-xs text-[#686764]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-[#060505]">{addr.firstName} {addr.lastName}</span>
                      {addr.id === defaultAddressId && <Badge variant="default">Default</Badge>}
                    </div>
                    {addr.address1 && <span>{addr.address1}</span>}
                    {addr.address2 && <span>{addr.address2}</span>}
                    <span>{addr.city}{addr.province ? `, ${addr.province}` : ''} {addr.zip}</span>
                    {addr.phone && <span className="text-[#060505] font-medium">📞 {addr.phone}</span>}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
