import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, Link, type MetaFunction } from '@remix-run/react';
import { useState } from 'react';
import { CUSTOMER_DETAILS_QUERY } from '~/graphql/CustomerAccountQueries';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { Tabs } from '~/components/ui/Tabs';
import { EmptyState } from '~/components/ui/EmptyState';
import { User, Package, MapPin, LogOut, Calendar, CreditCard, Clock } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'My Account | MONTS' },
    { name: 'description', content: 'View order history, shipping addresses, and customer profile on MONTS.' },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { customerAccount } = context;

  // Check login status; if unauthenticated, redirect to OAuth login
  if (!(await customerAccount.isLoggedIn())) {
    return customerAccount.login();
  }

  let customer = null;
  try {
    const { data } = await customerAccount.query(CUSTOMER_DETAILS_QUERY);
    customer = data.customer;
  } catch (error) {
    console.error('Customer query error:', error);
  }

  if (!customer) {
    return customerAccount.login();
  }

  return json({ customer });
}

export default function AccountIndexRoute() {
  const { customer } = useLoaderData<typeof loader>() as { customer: any };
  const [activeTab, setActiveTab] = useState('orders');

  const orders = customer.orders?.nodes || [];
  const addresses = customer.addresses?.nodes || [];
  const defaultAddressId = customer.defaultAddress?.id;

  const formatPrice = (amount: string, currency: string) => {
    const numeric = parseFloat(amount);
    if (isNaN(numeric)) return `${currency} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'My Account' }]} className="mb-8" />

      {/* ─── Profile Header Banner ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 md:p-8 bg-white rounded-[6px] border border-[#e8e4df] mb-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#f0edea] text-[#c4622d] flex items-center justify-center font-bold text-xl shrink-0">
            {customer.firstName?.[0] || 'M'}
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Welcome, {customer.firstName || 'Valued Customer'}
            </h1>
            <p className="text-xs text-[#686764] mt-0.5">
              {customer.emailAddress?.emailAddress || customer.phoneNumber?.phoneNumber}
            </p>
          </div>
        </div>

        <Link to="/account/logout">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </Link>
      </div>

      {/* ─── Tabs: Orders & Addresses ─── */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'orders',
            label: 'Order History',
            count: orders.length,
            content: (
              <div>
                {orders.length === 0 ? (
                  <EmptyState
                    icon={<Package className="w-8 h-8" />}
                    title="No Orders Placed Yet"
                    description="When you place an order, its fulfillment status and tracking will appear here."
                    actionText="Start Shopping"
                    actionHref="/collections/all"
                  />
                ) : (
                  <div className="flex flex-col gap-6">
                    {orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-[6px] border border-[#e8e4df] p-6 flex flex-col gap-4"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {/* Order Meta Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e8e4df]">
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-sm text-[#060505]">
                              Order #{order.number || order.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[#686764]">
                              <Calendar className="w-3.5 h-3.5 text-[#8b7355]" />
                              {formatDate(order.processedAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={order.financialStatus === 'PAID' ? 'new' : 'outline'}>
                              {order.financialStatus || 'PAID'}
                            </Badge>
                            <Badge variant={order.fulfillmentStatus === 'FULFILLED' ? 'new' : 'default'}>
                              {order.fulfillmentStatus || 'UNFULFILLED'}
                            </Badge>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="flex flex-col divide-y divide-[#e8e4df]/60">
                          {order.lineItems?.nodes?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-3 text-sm">
                              <div>
                                <span className="font-semibold text-[#060505] block">
                                  {item.title}
                                </span>
                                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                  <span className="text-xs text-[#686764] block">
                                    Variant: {item.variantTitle}
                                  </span>
                                )}
                                <span className="text-xs text-[#8b7355]">Qty: {item.quantity}</span>
                              </div>
                              <span className="font-medium text-[#2c2c2c]">
                                {formatPrice(item.price?.amount || '0', item.price?.currencyCode || 'INR')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Total */}
                        <div className="pt-3 border-t border-[#e8e4df] flex justify-between items-center">
                          <span className="text-xs text-[#686764]">Total Paid</span>
                          <span className="text-base font-bold text-[#060505]">
                            {formatPrice(order.totalPrice?.amount || '0', order.totalPrice?.currencyCode || 'INR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'addresses',
            label: 'Saved Addresses',
            count: addresses.length,
            content: (
              <div>
                {addresses.length === 0 ? (
                  <EmptyState
                    icon={<MapPin className="w-8 h-8" />}
                    title="No Saved Addresses"
                    description="You can add and manage your shipping addresses during checkout."
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {addresses.map((address: any) => {
                      const isDefault = address.id === defaultAddressId;
                      return (
                        <div
                          key={address.id}
                          className="bg-white rounded-[6px] border border-[#e8e4df] p-6 flex flex-col justify-between"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-sm text-[#060505]">
                                {address.firstName} {address.lastName}
                              </span>
                              {isDefault && <Badge variant="new">Default</Badge>}
                            </div>
                            <p className="text-xs text-[#686764] leading-relaxed">
                              {address.address1}
                              {address.address2 && <>, {address.address2}</>}
                              <br />
                              {address.city}, {address.zoneCode} {address.zip}
                            </p>
                            {address.phoneNumber && (
                              <span className="text-xs text-[#686764] block mt-2">
                                Phone: {address.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
