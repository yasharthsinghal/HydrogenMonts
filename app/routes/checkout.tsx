import {
  Form,
  useLoaderData,
  useNavigation,
  useActionData,
  type MetaFunction,
  Link,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useState } from 'react';
import { CUSTOMER_DETAILS_QUERY } from '~/graphql/CustomerAccountQueries';
import { shopifyCustomerService } from '~/services/shopify/customer.server';
import { locationService } from '~/services/location/location.server';
import { IndianAddressFields } from '~/components/address/IndianAddressFields';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { FormOverlayLoader } from '~/components/ui/FormOverlayLoader';
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
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Zap,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getHydrogenContext } from '~/lib/context.server';
import { createCodOrder } from '~/services/shopify/codOrder.server';
import {
  generateCheckoutSessionId,
  getCheckoutSession,
  setCheckoutSession,
  clearCheckoutSession,
} from '~/services/checkout/checkoutSession.server';
import { dispatchOrderConfirmationEmail } from '~/services/email/dispatcher.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Checkout & Payment | MONTS' },
    { name: 'description', content: 'Enter your delivery address and choose Cash on Delivery or Secure Prepaid Payment.' },
  ];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { session, cart, customerAccount, storefront, env } = await getHydrogenContext(context, request);

  // Helper to fetch authenticated customer profile in parallel with cart
  const fetchCustomerProfile = async () => {
    const customerEmail = session.get('customerEmail') as string | undefined;
    if (customerEmail) {
      try {
        return await shopifyCustomerService.getCustomerProfile(storefront, undefined, customerEmail, env);
      } catch (error) {
        return null;
      }
    }
    try {
      const isLoggedIn = await customerAccount.isLoggedIn();
      if (isLoggedIn) {
        const { data: customerData }: any = await customerAccount.query(CUSTOMER_DETAILS_QUERY);
        return customerData?.customer || null;
      }
    } catch (error) {
      return null;
    }
    return null;
  };

  // Parallelize cart retrieval and customer profile query
  const [cartData, customer] = await Promise.all([
    cart.get(),
    fetchCustomerProfile(),
  ]);

  const totalQuantity = cartData?.totalQuantity ?? 0;
  if (!cartData || totalQuantity <= 0) {
    return redirect('/cart');
  }

  return {
    cart: cartData,
    customer,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart, session, env } = await getHydrogenContext(context, request);

  const formData = await request.formData();
  const paymentMethod = ((formData.get('paymentMethod') as string) || 'PREPAID').toUpperCase();
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
  const subscribeNewsletter = formData.get('subscribeNewsletter') === 'true';

  // 1. Field validation
  if (!email || !firstName || !lastName || !phone || !address1 || !city || !province || !zip) {
    return data({ error: 'Please fill in all required contact and delivery address fields.' }, { status: 400 });
  }

  // 2. Server-Side Location Consistency Verification (Pincode + City + State)
  const isConsistent = await locationService.validateConsistency(zip, city, province);
  if (!isConsistent) {
    return data(
      {
        error: `Inconsistent delivery location: Pincode "${zip}" does not match "${city}, ${province}". Please check your address details.`,
      },
      { status: 400 },
    );
  }

  // 3. Process VIP Catalog & Newsletter Subscription if opted-in
  if (subscribeNewsletter && email) {
    shopifyCustomerService.subscribeCustomer(email, 'checkout', env).catch((subErr) => {
      console.warn('[Checkout Subscription Notice] Background sync warning:', subErr);
    });
  }

  // Retrieve existing or create new checkout session
  let checkoutSession = getCheckoutSession(session as any);
  if (!checkoutSession) {
    checkoutSession = {
      checkoutSessionId: generateCheckoutSessionId(),
      cartId: (await cart.get())?.id || '',
      customerEmail: email,
    };
    setCheckoutSession(session as any, checkoutSession);
  }

  // ─── CASE A: CASH ON DELIVERY (COD) ───
  if (paymentMethod === 'COD') {
    const cartData = await cart.get();
    const lines =
      cartData?.lines?.nodes ||
      (cartData?.lines?.edges ? cartData.lines.edges.map((e: any) => e.node) : null) ||
      (Array.isArray(cartData?.lines) ? cartData.lines : []);

    if (!cartData || lines.length === 0) {
      return data({ error: 'Your cart is empty. Please add items before placing an order.' }, { status: 400 });
    }

    const customerFields = {
      email,
      firstName,
      lastName,
      phone,
      address1,
      address2,
      city,
      province,
      zip,
      country,
    };

    // Place direct COD order via Shopify Admin API (Draft Order -> Complete Order)
    const codResult = await createCodOrder({
      cart: cartData,
      customerFields,
      sessionData: checkoutSession,
      env,
    });

    if (!codResult.success || !codResult.orderName) {
      return data(
        { error: codResult.errorMessage || 'Unable to place Cash on Delivery order. Please try again or choose online payment.' },
        { status: 400 },
      );
    }

    // Prepare itemized order items for confirmation email
    const orderItems = lines.map((line: any) => ({
      title: line.merchandise?.product?.title || line.merchandise?.title || 'Artisanal Piece',
      quantity: line.quantity || 1,
      price: line.cost?.totalAmount?.amount || line.merchandise?.price?.amount,
    }));

    const totalAmount = cartData.cost?.totalAmount?.amount || cartData.cost?.subtotalAmount?.amount;

    // Dispatch Order Confirmation Email via Gmail SMTP
    try {
      await dispatchOrderConfirmationEmail(
        {
          to: email,
          orderName: codResult.orderName,
          customerName: `${firstName} ${lastName}`,
          paymentMethod: 'COD',
          totalAmount: totalAmount ? `₹${parseFloat(totalAmount).toLocaleString('en-IN')}` : undefined,
          items: orderItems,
        },
        env,
      );
    } catch (emailErr) {
      console.warn('[Checkout COD] Notice dispatching confirmation email:', emailErr);
    }

    // Clear cart lines so customer's cart is cleanly emptied
    try {
      const lineIds = lines.map((l: any) => l.id).filter(Boolean);
      if (lineIds.length > 0) {
        await cart.removeLines(lineIds);
      }
    } catch (clearErr) {
      console.warn('[Checkout COD] Notice clearing cart lines:', clearErr);
    }

    // Clear checkout session
    clearCheckoutSession(session as any);

    // Redirect directly to Thank You confirmation page with COD details
    return redirect(`/thank-you?payment=cod&order=${encodeURIComponent(codResult.orderName)}`);
  }

  // ─── CASE B: PREPAID (ONLINE PAYMENT - UPI / CARDS / NETBANKING) ───
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

  // Retrieve checkout URL and redirect directly to Shopify Payment Gateway
  const updatedCart = await cart.get();
  const checkoutUrl = updatedCart?.checkoutUrl;

  if (checkoutUrl) {
    return redirect(checkoutUrl);
  }

  return data({ error: 'Unable to initialize online payment gateway. Please try again.' }, { status: 500 });
}

export default function CheckoutPage() {
  const { cart, customer } = useLoaderData<typeof loader>() as { cart: any; customer: any };
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const defaultAddr = customer?.defaultAddress || {};
  const [isLocationValid, setIsLocationValid] = useState(() => {
    return Boolean(defaultAddr.zip && defaultAddr.city && (defaultAddr.province || defaultAddr.zoneCode));
  });
  const [paymentMethod, setPaymentMethod] = useState<'PREPAID' | 'COD'>('PREPAID');

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
      className="min-h-screen bg-[#f5f0e8] py-10 px-6 md:px-12 relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <FormOverlayLoader
        isLoading={isSubmitting}
        isFixed
        message={
          paymentMethod === 'COD'
            ? 'Securing & placing your Cash on Delivery order...'
            : 'Connecting to 256-bit SSL encrypted payment gateway...'
        }
      />
      <div className="max-w-[1280px] mx-auto">
        <Breadcrumb
          items={[
            { label: 'Cart', href: '/cart' },
            { label: 'Delivery & Payment' },
          ]}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ─── LEFT: Delivery & Payment Method Form (7 Cols) ─── */}
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
                  <ShieldCheck className="w-4 h-4 text-[#c4622d]" />
                  <span className="font-medium">Secure Checkout</span>
                </div>
              </div>

              {actionData?.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[6px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionData.error}</span>
                </div>
              )}

              <Form method="post" className="flex flex-col gap-6">
                {/* Hidden input for Payment Method */}
                <input type="hidden" name="paymentMethod" value={paymentMethod} />

                {/* 1. Contact Information */}
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#060505]">
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address (for order receipt & tracking)"
                      name="email"
                      type="email"
                      required
                      defaultValue={customerEmail}
                      placeholder="you@example.com"
                      startIcon={<Mail className="w-4 h-4 text-[#686764]" />}
                    />

                    <Input
                      label="Contact Phone (for courier delivery SMS)"
                      name="phone"
                      type="tel"
                      required
                      defaultValue={customerPhone || defaultAddr.phoneNumber || ''}
                      placeholder="+91 98765 43210"
                      startIcon={<Phone className="w-4 h-4 text-[#686764]" />}
                    />
                  </div>

                  {/* VIP Catalog & Secret Drops Subscription Checkbox */}
                  <label
                    htmlFor="subscribeNewsletter"
                    className="flex items-start gap-3 p-3.5 mt-1 rounded-[6px] bg-[#faf8f5] border border-[#e8e4df] hover:border-[#c4622d]/40 transition-colors cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      id="subscribeNewsletter"
                      name="subscribeNewsletter"
                      defaultChecked={true}
                      value="true"
                      className="mt-0.5 w-4 h-4 rounded border-[#e8e4df] text-[#c4622d] focus:ring-[#c4622d] accent-[#c4622d] cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col gap-0.5 text-xs select-none">
                      <span className="font-semibold text-[#060505] flex items-center gap-1.5 group-hover:text-[#c4622d] transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-[#c4622d] shrink-0" />
                        <span>Send me private previews, secret catalogs & seasonal privilege offers</span>
                      </span>
                      <p className="text-[11px] text-[#686764] leading-relaxed">
                        Be the first to access limited-batch hand-block releases, early-bird festive discounts, and digital lookbooks before public drops. Unsubscribe anytime in 1 click.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 2. Shipping Address */}
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

                  <IndianAddressFields
                    initialPincode={defaultAddr.zip || ''}
                    initialCity={defaultAddr.city || ''}
                    initialState={defaultAddr.province || defaultAddr.zoneCode || ''}
                    onValidityChange={setIsLocationValid}
                  />
                </div>

                {/* 3. Payment Method Selection (Prepaid vs COD) */}
                <div className="flex flex-col gap-4 pt-5 border-t border-[#e8e4df]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#060505]">
                      Select Payment Method
                    </h2>
                    <span className="text-[11px] text-[#8b7355] font-medium">
                      All transactions are 256-bit encrypted
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5">
                    {/* OPTION 1: PREPAID */}
                    <div
                      onClick={() => setPaymentMethod('PREPAID')}
                      className={clsx(
                        'relative p-4 md:p-5 rounded-[8px] border-2 cursor-pointer transition-all flex items-start justify-between gap-4',
                        paymentMethod === 'PREPAID'
                          ? 'border-[#c4622d] bg-[#fcf8f4] shadow-xs'
                          : 'border-[#e8e4df] bg-white hover:border-[#c4622d]/50 hover:bg-[#faf8f5]',
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                            paymentMethod === 'PREPAID'
                              ? 'border-[#c4622d] bg-[#c4622d]'
                              : 'border-[#afaba6] bg-white',
                          )}
                        >
                          {paymentMethod === 'PREPAID' && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#060505]">
                              Pay Online (UPI, Cards, NetBanking, Wallets)
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#c4622d] text-white rounded-full uppercase tracking-wider">
                              <Zap className="w-3 h-3 fill-current" /> Extra 15% Off
                            </span>
                          </div>

                          <p className="text-xs text-[#686764] leading-relaxed">
                            Pay securely via Shopify Payment Gateway (Google Pay, PhonePe, Paytm, Credit/Debit Cards, NetBanking).
                          </p>

                          <div className="flex items-center gap-2 pt-1 text-[#8b7355] text-[11px]">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Instant UPI</span>
                            <span>•</span>
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>All Cards</span>
                            <span>•</span>
                            <Truck className="w-3.5 h-3.5" />
                            <span>Priority Studio Dispatch</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OPTION 2: CASH ON DELIVERY */}
                    <div
                      onClick={() => setPaymentMethod('COD')}
                      className={clsx(
                        'relative p-4 md:p-5 rounded-[8px] border-2 cursor-pointer transition-all flex items-start justify-between gap-4',
                        paymentMethod === 'COD'
                          ? 'border-[#c4622d] bg-[#fcf8f4] shadow-xs'
                          : 'border-[#e8e4df] bg-white hover:border-[#c4622d]/50 hover:bg-[#faf8f5]',
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                            paymentMethod === 'COD'
                              ? 'border-[#c4622d] bg-[#c4622d]'
                              : 'border-[#afaba6] bg-white',
                          )}
                        >
                          {paymentMethod === 'COD' && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#060505]">
                              Cash on Delivery (COD)
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#f0edea] text-[#8b7355] border border-[#e8e4df] rounded-full uppercase tracking-wider">
                              <Banknote className="w-3 h-3 text-[#c4622d]" /> Pay on Doorstep
                            </span>
                          </div>

                          <p className="text-xs text-[#686764] leading-relaxed">
                            Direct order placement. Pay in cash or UPI when your parcel is delivered at your doorstep.
                          </p>

                          <div className="flex items-center gap-1.5 pt-1 text-[#8b7355] text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#c4622d]" />
                            <span>Zero advance payment needed. Studio concierge verification prior to dispatch.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit CTA Button */}
                <div className="pt-6 border-t border-[#e8e4df]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full h-14 text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !isLocationValid}
                    isLoading={isSubmitting}
                  >
                    <span>
                      {isSubmitting
                        ? paymentMethod === 'COD'
                          ? 'Placing Your Order...'
                          : 'Redirecting to Payment Gateway...'
                        : !isLocationValid
                        ? 'Verify Pincode & City to Proceed'
                        : paymentMethod === 'COD'
                        ? 'Confirm & Place Cash on Delivery Order →'
                        : 'Proceed to Payment (UPI / Cards / NetBanking) →'}
                    </span>
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
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
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#8b7355]" />
                      100% Authentic Handcrafted
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

              {/* Prepaid vs COD Context Card */}
              {paymentMethod === 'PREPAID' ? (
                <div className="p-3.5 bg-[#c4622d]/10 border border-[#c4622d]/20 rounded-[6px] flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-[#c4622d] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-[#c4622d]">Extra 15% Instant Discount</span>
                    <span className="text-[#686764] text-[11px]">
                      Auto-applied at Shopify payment step for all Prepaid orders (UPI / Cards).
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#8b7355]/10 border border-[#8b7355]/20 rounded-[6px] flex items-start gap-2.5">
                  <Banknote className="w-4 h-4 text-[#8b7355] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-[#060505]">Cash on Delivery Selected</span>
                    <span className="text-[#686764] text-[11px]">
                      Your order is placed directly without upfront payment. Pay exact cash upon delivery.
                    </span>
                  </div>
                </div>
              )}

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
                <div className="flex justify-between">
                  <span>Payment Mode</span>
                  <span className="font-semibold text-[#060505]">
                    {paymentMethod === 'PREPAID' ? 'Prepaid (UPI / Cards)' : 'Cash on Delivery (COD)'}
                  </span>
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

