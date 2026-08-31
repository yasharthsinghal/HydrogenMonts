import { useState } from 'react';
import { Form } from 'react-router';
import { Button } from '~/components/ui/Button';
import {
  Banknote,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Check,
  Sparkles,
  Lock,
} from 'lucide-react';

export interface PaymentSelectorProps {
  onBack: () => void;
  isSubmitting: boolean;
  activeIntent: 'cod' | 'prepaid' | null;
  errorMessage?: string;
  prepaidDiscountPercent?: number;
  totalPayableFormatted?: string;
}

export function PaymentSelector({
  onBack,
  isSubmitting,
  activeIntent,
  errorMessage,
  prepaidDiscountPercent = 15,
  totalPayableFormatted,
}: PaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'prepaid' | 'cod'>('prepaid');

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between border-b border-[#e8e4df] pb-4">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-1">
            Step 2 of 2
          </span>
          <h2
            className="text-2xl font-bold text-[#060505]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Choose Payment Method
          </h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 text-xs text-[#8b7355] hover:text-[#060505] transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Edit Address</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[6px] flex items-center gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Payment Options Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* OPTION 1: PREPAID (15% OFF) */}
        <div
          onClick={() => !isSubmitting && setSelectedMethod('prepaid')}
          className={`relative p-5 rounded-[8px] border transition-all cursor-pointer ${
            selectedMethod === 'prepaid'
              ? 'bg-[#faf8f5] border-[#c4622d] shadow-sm ring-1 ring-[#c4622d]'
              : 'bg-white/60 border-[#e8e4df] hover:border-[#c4622d]/50 hover:bg-[#faf8f5]/50'
          } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  selectedMethod === 'prepaid'
                    ? 'bg-[#c4622d] text-white'
                    : 'bg-[#e8dfd5]/60 text-[#8b7355]'
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#060505]">
                    Pay Online (UPI / Cards / Net Banking)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c4622d] text-white">
                    <Sparkles className="w-3 h-3" />
                    Extra {prepaidDiscountPercent}% OFF
                  </span>
                </div>

                <p className="text-xs text-[#686764] leading-relaxed">
                  Fastest dispatch. Extra {prepaidDiscountPercent}% discount auto-applied directly on secure checkout.
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-[#8b7355]">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#c4622d]" />
                    Instant Confirmation
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#c4622d]" />
                    UPI / All Indian Cards
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                selectedMethod === 'prepaid'
                  ? 'border-[#c4622d] bg-[#c4622d] text-white'
                  : 'border-[#d0c9bf] bg-white'
              }`}
            >
              {selectedMethod === 'prepaid' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          {/* Form Action Button for Prepaid */}
          {selectedMethod === 'prepaid' && (
            <div className="mt-4 pt-4 border-t border-[#e8e4df]">
              <Form method="post">
                <input type="hidden" name="intent" value="prepaid" />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  isLoading={isSubmitting && activeIntent === 'prepaid'}
                  className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-md cursor-pointer"
                >
                  <span>
                    {isSubmitting && activeIntent === 'prepaid'
                      ? 'Applying 15% Discount & Connecting...'
                      : `Proceed to Pay Online (${prepaidDiscountPercent}% Off)`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Form>
            </div>
          )}
        </div>

        {/* OPTION 2: CASH ON DELIVERY (COD) */}
        <div
          onClick={() => !isSubmitting && setSelectedMethod('cod')}
          className={`relative p-5 rounded-[8px] border transition-all cursor-pointer ${
            selectedMethod === 'cod'
              ? 'bg-[#faf8f5] border-[#8b7355] shadow-sm ring-1 ring-[#8b7355]'
              : 'bg-white/60 border-[#e8e4df] hover:border-[#8b7355]/50 hover:bg-[#faf8f5]/50'
          } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  selectedMethod === 'cod'
                    ? 'bg-[#8b7355] text-white'
                    : 'bg-[#e8dfd5]/60 text-[#8b7355]'
                }`}
              >
                <Banknote className="w-5 h-5" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#060505]">
                    Cash on Delivery (COD)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8dfd5] text-[#060505]">
                    Doorstep Payment
                  </span>
                </div>

                <p className="text-xs text-[#686764] leading-relaxed">
                  Pay cash when your order arrives. Studio concierge will contact you to verify before dispatch.
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-[#8b7355]">
                  <span>Exact cash upon delivery</span>
                  <span>·</span>
                  <span>Free shipping across India</span>
                </div>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                selectedMethod === 'cod'
                  ? 'border-[#8b7355] bg-[#8b7355] text-white'
                  : 'border-[#d0c9bf] bg-white'
              }`}
            >
              {selectedMethod === 'cod' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          {/* Form Action Button for COD */}
          {selectedMethod === 'cod' && (
            <div className="mt-4 pt-4 border-t border-[#e8e4df]">
              <Form method="post">
                <input type="hidden" name="intent" value="cod" />
                <Button
                  type="submit"
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting}
                  isLoading={isSubmitting && activeIntent === 'cod'}
                  className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 border-2 border-[#060505] text-[#060505] hover:bg-[#060505] hover:text-white transition-all cursor-pointer"
                >
                  <span>
                    {isSubmitting && activeIntent === 'cod'
                      ? 'Creating Your Artisanal Order...'
                      : 'Confirm & Place Order (Cash on Delivery)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Form>
            </div>
          )}
        </div>
      </div>

      {/* Trust & Back Section */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#686764] border-t border-[#e8e4df]">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 hover:text-[#060505] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Delivery Details</span>
        </button>

        <div className="flex items-center gap-2 text-[11px] text-[#8b7355]">
          <Lock className="w-3.5 h-3.5" />
          <span>All orders backed by MONTS Jaipur Artisan Guarantee</span>
        </div>
      </div>
    </div>
  );
}
