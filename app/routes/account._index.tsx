import { redirect, useLoaderData, useRevalidator, useFetcher, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { useState, useEffect } from 'react';
import { STOREFRONT_CUSTOMER_QUERY } from '~/graphql/StorefrontQueries';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { Tabs } from '~/components/ui/Tabs';
import { EmptyState } from '~/components/ui/EmptyState';
import {
  Package,
  MapPin,
  LogOut,
  Calendar,
  ShieldCheck,
  Mail,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Edit3,
  Plus,
} from 'lucide-react';
import { shopifyCustomerService } from '~/services/shopify/customer.server';
import { ProfileEditModal } from '~/components/account/ProfileEditModal';
import { EmailChangeModal } from '~/components/account/EmailChangeModal';
import { AddressFormModal } from '~/components/account/AddressFormModal';

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
  const revalidator = useRevalidator();
  const addressActionFetcher = useFetcher<{ success?: boolean; error?: string }>();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState<'add' | 'edit'>('add');
  const [selectedAddress, setSelectedAddress] = useState<any>(undefined);

  useEffect(() => {
    if (addressActionFetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [addressActionFetcher.data]);

  const handleSetDefaultAddress = (addressId: string) => {
    addressActionFetcher.submit(
      { intent: 'set-default', addressId },
      { method: 'POST', action: '/api/account/address' },
    );
  };

  const orders = customer?.orders?.nodes ?? [];
  const recordedOrderCount = Number(customer?.numberOfOrders) || 0;
  const isOrdersRestricted = Boolean(customer?.ordersPermissionDenied || (recordedOrderCount > 0 && orders.length === 0));
  const tabOrderCount = orders.length > 0 ? orders.length : recordedOrderCount;

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
      <Breadcrumb items={[{ label: 'My Account' }]} className="mb-8" />

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
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-xs text-[#686764]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8b7355]" />
                {customerEmail}
              </span>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="text-[11px] text-[#c4622d] hover:text-[#923f12] underline cursor-pointer font-medium"
              >
                Change Email
              </button>
              {customer?.phone && (
                <span className="text-[#686764]">
                  • 📞 {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-center justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer bg-white text-[#060505] hover:bg-[#f0edea]"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#c4622d]" />
            Edit Profile
          </Button>

          <Link to="/account/logout">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 cursor-pointer text-[#686764] hover:text-[#060505]">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'orders',
            label: 'Order History',
            count: tabOrderCount,
            content: orders.length === 0 ? (
              isOrdersRestricted ? (
                <div className="bg-[#faf8f5] rounded-[8px] border border-[#e8e4df] p-8 md:p-10 text-center max-w-xl mx-auto shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#c4622d]/10 text-[#c4622d] flex items-center justify-center mx-auto mb-4">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#060505] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {recordedOrderCount} Order{recordedOrderCount !== 1 ? 's' : ''} on Record
                  </h3>
                  <p className="text-xs text-[#686764] mb-5 leading-relaxed">
                    Your orders are securely registered in Shopify. To display itemized order history and live tracking on this storefront, the custom app requires the <code className="bg-[#f0edea] px-1.5 py-0.5 rounded text-[#c4622d] font-mono">read_orders</code> access scope in Shopify Admin.
                  </p>
                  <div className="p-4 bg-white rounded-[6px] border border-[#e8e4df] text-left text-xs text-[#686764] mb-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#060505] font-semibold">
                      <ShieldCheck className="w-4 h-4 text-[#c4622d]" />
                      <span>How to enable in Shopify Admin:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#686764]">
                      <li>Open <strong>Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps</strong>.</li>
                      <li>Select your custom storefront app.</li>
                      <li>Under <strong>Configuration &gt; Admin API access scopes</strong>, enable <strong>read_orders</strong>.</li>
                      <li>Click <strong>Save</strong>.</li>
                    </ol>
                  </div>
                  <p className="text-xs text-[#8b7355] mb-6">
                    Invoices and tracking numbers are also sent to <strong>{customerEmail}</strong>.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link to="/collections/all">
                      <Button variant="primary" size="sm">
                        Continue Shopping
                      </Button>
                    </Link>
                    <Link to="/contact">
                      <Button variant="outline" size="sm">
                        Contact Concierge
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Package className="w-8 h-8" />}
                  title="No Orders Yet"
                  description="When you place an order it will appear here with live tracking."
                  actionText="Start Shopping"
                  actionHref="/collections/all"
                />
              )
            ) : (
              <div className="flex flex-col gap-6">
                {orders.map((order: any) => {
                  const orderRef = order.orderNumber || order.name?.replace('#', '') || order.id;
                  return (
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

                      {/* Total & Action */}
                      <div className="pt-3 border-t border-[#e8e4df] flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-[#686764]">Order Total: </span>
                          <span className="font-bold text-sm text-[#c4622d]">
                            {formatPrice(order.totalPrice?.amount ?? '0', order.totalPrice?.currencyCode ?? 'INR')}
                          </span>
                        </div>
                        <Link to={`/account/orders/${orderRef}`}>
                          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 cursor-pointer">
                            View Order Details
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
          {
            id: 'addresses',
            label: 'Saved Addresses',
            count: addresses.length,
            content: (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e4df]">
                  <div>
                    <h2 className="text-base font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Shipping Addresses
                    </h2>
                    <p className="text-xs text-[#686764]">
                      Manage saved delivery addresses for faster checkout.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAddress(undefined);
                      setAddressModalMode('add');
                      setIsAddressModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 cursor-pointer text-xs bg-white text-[#060505] hover:bg-[#f0edea]"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#c4622d]" />
                    <span>Add Address</span>
                  </Button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white rounded-[8px] border border-[#e8e4df] p-8 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#c4622d]/10 text-[#c4622d] flex items-center justify-center">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      No Saved Addresses Yet
                    </h3>
                    <p className="text-xs text-[#686764] max-w-sm">
                      Add your preferred delivery address now so future orders are seamless and quick.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedAddress(undefined);
                        setAddressModalMode('add');
                        setIsAddressModalOpen(true);
                      }}
                      className="mt-2 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Shipping Address</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr: any) => (
                      <div
                        key={addr.id}
                        className="bg-white rounded-[6px] border border-[#e8e4df] p-5 flex flex-col justify-between gap-3 shadow-sm text-xs text-[#686764] transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-[#060505]">
                              {addr.firstName} {addr.lastName}
                            </span>
                            {addr.id === defaultAddressId && (
                              <Badge variant="default">Default</Badge>
                            )}
                          </div>
                          {addr.address1 && <span className="text-[#2c2c2c]">{addr.address1}</span>}
                          {addr.address2 && <span>{addr.address2}</span>}
                          <span>
                            {addr.city}
                            {addr.province ? `, ${addr.province}` : ''} {addr.zip}
                          </span>
                          {addr.phone && (
                            <span className="text-[#060505] font-medium pt-1">
                              📞 {addr.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#e8e4df] mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddress({
                                ...addr,
                                isDefault: addr.id === defaultAddressId,
                              });
                              setAddressModalMode('edit');
                              setIsAddressModalOpen(true);
                            }}
                            className="text-xs text-[#c4622d] hover:text-[#923f12] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Address</span>
                          </button>

                          {addr.id !== defaultAddressId && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[11px] text-[#686764] hover:text-[#060505] underline cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Modals for Profile, Email, and Address Updates */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialFirstName={customer?.firstName || ''}
        initialLastName={customer?.lastName || ''}
        initialPhone={customer?.phone || ''}
        onSuccess={() => revalidator.revalidate()}
      />

      <EmailChangeModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={customerEmail}
        onSuccess={() => revalidator.revalidate()}
      />

      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        mode={addressModalMode}
        address={selectedAddress}
        onSuccess={() => revalidator.revalidate()}
      />
    </div>
  );
}
