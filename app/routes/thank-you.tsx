import { Link, useSearchParams, useLoaderData, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Clock, Phone, Mail, Banknote } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { getHydrogenContext } from '~/lib/context.server';
import { getCheckoutSession } from '~/services/checkout/checkoutSession.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Thank You for Your Order | MONTS' },
    { name: 'description', content: 'Your MONTS handcrafted order has been received and is being prepared with care.' },
  ];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { session, env } = await getHydrogenContext(context, request);
  const checkoutSession = getCheckoutSession(session as any);

  return {
    storeDomain: env.PUBLIC_STORE_DOMAIN || '',
    sessionOrderName: checkoutSession?.codOrderName || null,
  };
}

export default function ThankYouRoute() {
  const { sessionOrderName } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const rawOrderNumber = searchParams.get('order') || searchParams.get('order_number') || sessionOrderName;
  const paymentType = searchParams.get('payment') || 'online';
  const isCod = paymentType === 'cod';

  // Format order number cleanly
  const displayOrder = rawOrderNumber
    ? rawOrderNumber.startsWith('#')
      ? rawOrderNumber
      : `#${rawOrderNumber}`
    : null;

  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-12 py-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-white rounded-[8px] border border-[#e8e4df] p-8 md:p-14 shadow-sm text-center flex flex-col items-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[#c4622d] mb-6">
          {isCod ? <Banknote className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
        </div>

        <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2">
          {isCod ? 'Cash on Delivery · Order Confirmed' : 'Payment & Order Confirmed'}
        </span>

        <h1
          className="text-3xl md:text-5xl font-bold text-[#060505] mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {isCod ? 'Your Artisanal Order Is Placed' : 'Thank You for Supporting Artisanal Craft'}
        </h1>

        {displayOrder && (
          <div className="inline-block px-4 py-1.5 bg-[#faf8f5] border border-[#e8e4df] rounded-[4px] text-xs font-semibold text-[#1a1a1a] mb-6">
            Order Reference: <span className="text-[#c4622d] font-mono">{displayOrder}</span>
          </div>
        )}

        <p className="text-base text-[#686764] max-w-xl mb-8 leading-relaxed" style={{ fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}>
          {isCod
            ? 'Your order has been recorded with payment pending. Our Jaipur studio concierge will contact you to verify before dispatch. Please keep cash ready upon doorstep delivery.'
            : 'Your payment was successfully received. We have sent a comprehensive receipt and tracking updates to your email.'}
        </p>

        {/* Dispatch Promise Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full my-8 p-6 bg-[#faf8f5] rounded-[6px] border border-[#e8e4df]/80 text-left">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#c4622d] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#060505] uppercase tracking-wider">Fast Dispatch</h3>
              <p className="text-xs text-[#686764] mt-1">Leaves our Jaipur studio within 24–48 hours.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-[#c4622d] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#060505] uppercase tracking-wider">Insured Delivery</h3>
              <p className="text-xs text-[#686764] mt-1">Tracked door-to-door transit across India.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#c4622d] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#060505] uppercase tracking-wider">Artisan Quality</h3>
              <p className="text-xs text-[#686764] mt-1">Hand-inspected before dispatch.</p>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center pt-4">
          <Link to="/collections/all" className="w-full sm:w-auto flex-1">
            <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Button>
          </Link>
          <Link to="/account" className="w-full sm:w-auto flex-1">
            <Button variant="outline" size="lg" className="w-full flex items-center justify-center gap-2 border-[#1a1a1a] text-[#1a1a1a]">
              <span>View Account</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Need Help Footer */}
        <div className="mt-12 pt-8 border-t border-[#e8e4df] w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#686764]">
          <span>Need help with your order?</span>
          <div className="flex items-center gap-6">
            <a href="tel:+918290985337" className="flex items-center gap-1.5 hover:text-[#c4622d] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              <span>+91 - 8290985337</span>
            </a>
            <a href="mailto:vastrabymonty@gmail.com" className="flex items-center gap-1.5 hover:text-[#c4622d] transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span>vastrabymonty@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
