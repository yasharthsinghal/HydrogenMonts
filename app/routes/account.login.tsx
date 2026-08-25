import {
  data,
  redirect,
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
  type MetaFunction,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { sanitizeRedirect } from '~/lib/redirect';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  sendOtpEmail,
  syncCustomerWithShopify,
  type OtpSessionData,
} from '~/lib/auth-otp.server';
import {
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const meta: MetaFunction = () => [
  { title: 'Sign In | MONTS' },
  {
    name: 'description',
    content: 'Sign in to your MONTS account — secure OTP via email.',
  },
];

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { session } = context;
  const url = new URL(request.url);
  const returnTo = sanitizeRedirect(url.searchParams.get('return_to'), '/account');

  // Already authenticated → skip login
  if (session.get('customerEmail')) {
    return redirect(returnTo);
  }

  const otpData = session.get('otpData') as OtpSessionData | undefined;
  return {
    returnTo,
    hasActiveOtp: Boolean(otpData && otpData.expiresAt > Date.now()),
    activeEmail: otpData?.email ?? '',
  };
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, context }: ActionFunctionArgs) {
  const { session, storefront, env } = context;
  const sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('[MONTS] SESSION_SECRET is required in environment for secure OTP hashing.');
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const returnTo = sanitizeRedirect(formData.get('return_to') as string, '/account');

  // ── SEND OTP ──────────────────────────────────────────────────────────────
  if (intent === 'send_otp') {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return data({ error: 'Please enter a valid email address.', step: 'email' }, { status: 400 });
    }

    // Check 60-second resend cooldown
    const existingOtp = session.get('otpData') as OtpSessionData | undefined;
    const RESEND_COOLDOWN_MS = 60 * 1000;
    if (
      existingOtp &&
      existingOtp.email === email &&
      existingOtp.expiresAt > Date.now() &&
      existingOtp.sentAt &&
      Date.now() - existingOtp.sentAt < RESEND_COOLDOWN_MS
    ) {
      const secondsLeft = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existingOtp.sentAt)) / 1000,
      );
      return data(
        {
          error: `Please wait ${secondsLeft}s before requesting a new code.`,
          step: 'verify',
          email,
        },
        { status: 429 },
      );
    }

    const code = generateOtp();
    const codeHash = await hashOtp(code, email, sessionSecret);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
    const sentAt = Date.now();

    const otpData: OtpSessionData = {
      email,
      codeHash,
      expiresAt,
      sentAt,
      attempts: 0,
      used: false,
    };
    session.set('otpData', otpData);

    // Dispatch OTP email via active provider (Google SMTP / Resend / Dev Logger)
    const { success, error: emailError } = await sendOtpEmail(email, code, env);

    if (!success) {
      return data(
        { error: `Could not deliver OTP email: ${emailError}. Please try again.`, step: 'email' },
        { status: 500 },
      );
    }

    return data(
      {
        step: 'verify',
        email,
        successMessage: `A 6-digit verification code has been sent to ${email}. Check your inbox.`,
      },
      { headers: { 'Set-Cookie': await session.commit() } },
    );
  }

  // ── VERIFY OTP ────────────────────────────────────────────────────────────
  if (intent === 'verify_otp') {
    const otpInput = (formData.get('otp') as string)?.replace(/\s/g, '');
    const emailInput = (formData.get('email') as string)?.trim().toLowerCase();
    const otpData = session.get('otpData') as OtpSessionData | undefined;

    if (!otpData || otpData.used) {
      return data(
        { error: 'Session expired or code already used. Please request a new code.', step: 'email' },
        { status: 400 },
      );
    }

    // Expiry check
    if (Date.now() > otpData.expiresAt) {
      session.unset('otpData');
      return data(
        { error: 'Your code has expired. Please request a new one.', step: 'email' },
        { status: 400, headers: { 'Set-Cookie': await session.commit() } },
      );
    }

    // Attempt limit
    if (otpData.attempts >= 5) {
      session.unset('otpData');
      return data(
        { error: 'Too many incorrect attempts. Please request a new code.', step: 'email' },
        { status: 429, headers: { 'Set-Cookie': await session.commit() } },
      );
    }

    // Wrong code check using secure hash comparison
    const isValid = await verifyOtpHash(otpInput, otpData.email, sessionSecret, otpData.codeHash);
    if (!isValid) {
      otpData.attempts += 1;
      session.set('otpData', otpData);
      const remaining = 5 - otpData.attempts;
      return data(
        {
          error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          step: 'verify',
          email: otpData.email,
        },
        { status: 400, headers: { 'Set-Cookie': await session.commit() } },
      );
    }

    // ✅ OTP correct — mark used immediately to prevent replay race conditions
    otpData.used = true;
    session.set('otpData', otpData);

    // Sync customer with Shopify via Admin API (fully passwordless)
    const verifiedEmail = emailInput || otpData.email;
    await syncCustomerWithShopify(storefront, verifiedEmail, sessionSecret, env);

    // Store verified email and clean up OTP challenge
    session.set('customerEmail', verifiedEmail);
    session.unset('otpData');

    return redirect(returnTo, {
      headers: { 'Set-Cookie': await session.commit() },
    });
  }

  // ── RESET (change email) ──────────────────────────────────────────────────
  if (intent === 'reset_email') {
    session.unset('otpData');
    return data(
      { step: 'email' },
      { headers: { 'Set-Cookie': await session.commit() } },
    );
  }

  return data({ error: 'Invalid request.' }, { status: 400 });
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const actionData = useActionData<{
    step?: string;
    email?: string;
    error?: string;
    successMessage?: string;
  }>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === 'submitting';
  const returnTo = searchParams.get('return_to') || '/account';

  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (actionData?.step) setStep(actionData.step as 'email' | 'verify');
    if (actionData?.email) setEmail(actionData.email);
  }, [actionData]);

  return (
    <div
      className="min-h-[75vh] bg-[#f5f0e8] py-14 px-6 flex flex-col justify-center items-center"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="w-full max-w-md">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: 'Account' }]}
          className="mb-8 justify-center"
        />

        <div className="bg-[#faf8f5] border border-[#e8e4df] p-8 md:p-10 rounded-[8px] shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-2">
              Passwordless Sign In
            </span>
            <h1
              className="text-3xl font-bold text-[#060505] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {step === 'email' ? 'Sign In / Register' : 'Enter Verification Code'}
            </h1>
            <p className="text-xs text-[#686764] leading-relaxed">
              {step === 'email'
                ? 'Enter your email — we will send a 6-digit code to your inbox.'
                : `We sent a code to ${email}. Enter it below to continue.`}
            </p>
          </div>

          {/* Alerts */}
          {actionData?.error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-[6px] flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionData.error}</span>
            </div>
          )}
          {actionData?.successMessage && step === 'verify' && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionData.successMessage}</span>
            </div>
          )}

          {/* ── Step 1: Email entry ── */}
          {step === 'email' && (
            <Form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="send_otp" />
              <input type="hidden" name="return_to" value={returnTo} />

              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={email}
                placeholder="you@example.com"
                startIcon={<Mail className="w-4 h-4 text-[#686764]" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-1 flex items-center justify-center gap-2 cursor-pointer"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                <span>{isSubmitting ? 'Sending code...' : 'Send Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Form>
          )}

          {/* ── Step 2: OTP entry ── */}
          {step === 'verify' && (
            <div className="flex flex-col gap-5">
              <Form method="post" className="flex flex-col gap-4">
                <input type="hidden" name="intent" value="verify_otp" />
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="return_to" value={returnTo} />

                <Input
                  label="6-Digit Verification Code"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="· · · · · ·"
                  className="text-center tracking-[0.5em] font-mono text-xl"
                  startIcon={<KeyRound className="w-4 h-4 text-[#686764]" />}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-1 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  <span>{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Form>

              <div className="flex items-center justify-between text-xs text-[#686764] pt-2 border-t border-[#e8e4df]">
                <Form method="post">
                  <input type="hidden" name="intent" value="reset_email" />
                  <button
                    type="submit"
                    className="text-[#8b7355] hover:text-[#c4622d] underline cursor-pointer"
                  >
                    Change Email
                  </button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="intent" value="send_otp" />
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1 text-[#c4622d] hover:underline font-medium cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Resend Code
                  </button>
                </Form>
              </div>
            </div>
          )}

          {/* Footer trust line */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8b7355] pt-5 mt-5 border-t border-[#e8e4df]/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Powered by Shopify Storefront API — No passwords, ever.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
