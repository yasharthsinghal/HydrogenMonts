import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { Form, useLoaderData, useNavigation, useActionData, type MetaFunction, Link } from '@remix-run/react';
import { CUSTOMER_DETAILS_QUERY } from '~/graphql/CustomerAccountQueries';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import {
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Package,
  Truck,
  ArrowRight,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Checkout & Delivery | MONTS' },
    { name: 'description', content: 'Enter your delivery address and proceed to secure Shopify payment.' },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { cart, customerAccount } = context;

  // 1. Retrieve single authoritative Shopify cart
  const cartData = await cart.get();
  const totalQuantity = cartData?.totalQuantity ?? 0;

  if (!cartData || totalQuantity <= 0) {
    return redirect('/cart');
  }

  // 2. Fetch authenticated customer profile if logged in (optional pre-fill)
  let customer: any = null;
  try {
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (isLoggedIn) {
      const { data }: any = await customerAccount.query(CUSTOMER_DETAILS_QUERY);
      customer = data?.customer;
    }
  } catch (error) {
    // Non-blocking for checkout
  }

  return json({
    cart: cartData,
    customer,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;

  const formData = await request.formData();
  const email = (formData.get('email') as string)?.trim();
  const firstName = (formData.get('firstName') as string)?.trim();
  const lastName = (formData.get('lastName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const address1 = (formData.get('address1') as string)?.trim();
  const address2 = (formData.get('address2') as string)?.trim();
  const city = (formData.get('city') as string)?.trim();
  const province = (formData.get('province') as string)?.trim();
  const zip = (formData.get('zip') as string)?.trim();
  const country = 'IN';

  if (!email || !firstName || !lastName || !phone || !address1 || !city || !province || !zip) {
    return json({ error: 'Please fill in all required contact and delivery address fields.' }, { status: 400 });
  }

  // 3. Update Shopify Cart Buyer Identity and Delivery Address
  try {
    await cart.updateBuyerIdentity({
      email,
      phone,
      deliveryAddressPreferences: [
        {
          deliveryAddress: {
            firstName,
            lastName,
            address1,
            address2: address2 || '',
            city,
            province,
            zip,
            country,
            phone,
          },
        },
      ],
    });
  } catch (error: any) {
    console.error('Cart buyer identity update notice:', error);
  }

  // 4. Retrieve checkout URL and redirect directly to Shopify Payment Gateway
  const updatedCart = await cart.get();
  const checkoutUrl = updatedCart?.checkoutUrl;

  if (checkoutUrl) {
    return redirect(checkoutUrl);
  }

  return json({ error: 'Unable to initialize payment gateway. Please try again.' }, { status: 500 });
}

export default function CheckoutPage() {
  const { cart, customer } = useLoaderData<typeof loader>() as { cart: any; customer: any };
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const defaultAddr = customer?.defaultAddress || {};
  const customerEmail = customer?.emailAddress?.emailAddress || customer?.email || '';
  const customerPhone = customer?.phoneNumber?.phoneNumber || defaultAddr?.phoneNumber || '';

  const lines =
    cart?.lines?.nodes ||
    (cart?.lines?.edges ? cart.lines.edges.map((e: any) => e.node) : null) ||
    (Array.isArray(cart?.lines) ? cart.lines : []);

  const subtotal = cart?.cost?.subtotalAmount?.amount
    ? parseFloat(cart.cost.subtotalAmount.amount)
    : cart?.cost?.totalAmount?.amount
    ? parseFloat(cart.cost.totalAmount.amount)
    : 0;

  const currencyCode =
    cart?.cost?.subtotalAmount?.currencyCode ||
    cart?.cost?.totalAmount?.currencyCode ||
    'INR';

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="min-h-screen bg-[#f5f0e8] py-10 px-6 md:px-12"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Cart', href: '/cart' },
            { label: 'Delivery & Checkout' },
          ]}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ─── LEFT: Delivery Information Form (7 Cols) ─── */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e8e4df] pb-4 mb-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-1">
                    Step 1 of 2
                  </span>
                  <h1
                    className="text-2xl font-bold text-[#060505]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Delivery & Contact Details
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#8b7355] bg-[#e8dfd5]/40 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-medium">Direct Shopify Gateway</span>
                </div>
              </div>

              {actionData?.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[6px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionData.error}</span>
                </div>
              )}

              <Form method="post" className="flex flex-col gap-5">
                {/* Contact Section */}
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#060505]">
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address (for order receipt & OTP)"
                      name="email"
                      type="email"
                      required
                      defaultValue={customerEmail}
                      placeholder="you@example.com"
                      startIcon={<Mail className="w-4 h-4 text-[#686764]" />}
                    />

                    <Input
                      label="Contact Phone (for delivery tracking SMS)"
                      name="phone"
                      type="tel"
                      required
                      defaultValue={customerPhone || defaultAddr.phoneNumber || ''}
                      placeholder="+91 98765 43210"
                      startIcon={<Phone className="w-4 h-4 text-[#686764]" />}
                    />
                  </div>
                </div>

                {/* Shipping Address Section */}
                <div className="flex flex-col gap-3 pt-4 border-t border-[#e8e4df]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#060505]">
                    Shipping Address
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      type="text"
                      required
                      defaultValue={defaultAddr.firstName || customer?.firstName || ''}
                      placeholder="First name"
                      startIcon={<User className="w-4 h-4 text-[#686764]" />}
                    />
                    <Input
                      label="Last Name"
                      name="lastName"
                      type="text"
                      required
                      defaultValue={defaultAddr.lastName || customer?.lastName || ''}
                      placeholder="Last name"
                    />
                  </div>

                  <Input
                    label="Street Address / House No."
                    name="address1"
                    type="text"
                    required
                    defaultValue={defaultAddr.address1 || ''}
                    placeholder="e.g. 102, Heritage Residency, MG Road"
                    startIcon={<MapPin className="w-4 h-4 text-[#686764]" />}
                  />

                  <Input
                    label="Apartment, suite, landmark (optional)"
                    name="address2"
                    type="text"
                    defaultValue={defaultAddr.address2 || ''}
                    placeholder="e.g. Near City Center Mall"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      name="city"
                      type="text"
                      required
                      defaultValue={defaultAddr.city || ''}
                      placeholder="e.g. Mumbai"
                    />
                    <Input
                      label="State / Province"
                      name="province"
                      type="text"
                      required
                      defaultValue={defaultAddr.zoneCode || ''}
                      placeholder="e.g. Maharashtra"
                    />
                    <Input
                      label="PIN / Postal Code"
                      name="zip"
                      type="text"
                      required
                      defaultValue={defaultAddr.zip || ''}
                      placeholder="e.g. 400001"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#e8e4df]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full h-14 text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-md cursor-pointer"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Redirecting to Payment Gateway...' : 'Proceed to Payment (CCAvenue / COD)'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-[11px] text-[#686764] pt-4">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#8b7355]" />
                      256-Bit SSL Encrypted
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#8b7355]" />
                      Fast Tracked Dispatch
                    </span>
                  </div>
                </div>
              </Form>
            </div>
          </div>

          {/* ─── RIGHT: Order Summary Sidebar (5 Cols) ─── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] p-6 md:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-[#e8e4df] pb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#8b7355]" />
                  <h2 className="text-base font-bold text-[#060505]">Order Summary ({lines.length})</h2>
                </div>
                <Link to="/cart" className="text-xs text-[#c4622d] hover:underline font-semibold">
                  Edit Cart
                </Link>
              </div>

              {/* Line Items List */}
              <div className="flex flex-col divide-y divide-[#e8e4df] max-h-[300px] overflow-y-auto pr-1">
                {lines.map((line: any) => {
                  const merchandise = line.merchandise;
                  const imgUrl = merchandise?.image?.url;
                  const linePrice = parseFloat(line.cost?.totalAmount?.amount || merchandise?.price?.amount || '0');

                  return (
                    <div key={line.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={merchandise?.product?.title || 'Product'}
                            className="w-14 h-14 rounded-[4px] object-cover bg-[#f5f0e8] border border-[#e8e4df]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-[4px] bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-[#060505] line-clamp-1">
                            {merchandise?.product?.title || 'MONTS Garment'}
                          </span>
                          {merchandise?.title && merchandise.title !== 'Default Title' && (
                            <span className="text-[11px] text-[#686764]">Size: {merchandise.title}</span>
                          )}
                          <span className="text-[11px] text-[#8b7355]">Qty: {line.quantity}</span>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-[#060505]">
                        {formatPrice(linePrice, currencyCode)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Instant Prepaid Discount Callout */}
              <div className="p-3.5 bg-[#c4622d]/10 border border-[#c4622d]/20 rounded-[6px] flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-[#c4622d] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold text-[#c4622d]">Extra 15% Instant Discount</span>
                  <span className="text-[#686764] text-[11px]">
                    Auto-applied at Shopify payment step for all Prepaid orders (UPI / Cards).
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-[#e8e4df] flex flex-col gap-2.5 text-xs text-[#686764]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#060505]">{formatPrice(subtotal, currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Domestic Shipping</span>
                  <span className="text-[#8b7355] font-semibold uppercase">Free</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#060505] pt-3 border-t border-[#e8e4df]">
                  <span>Total Payable</span>
                  <span className="text-[#c4622d]">{formatPrice(subtotal, currencyCode)}</span>
                </div>
                <p className="text-[10px] text-[#8b7355] text-right">
                  Inclusive of all taxes & duties
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
