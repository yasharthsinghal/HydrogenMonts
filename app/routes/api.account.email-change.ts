import { data, type ActionFunctionArgs } from 'react-router';
import { getHydrogenContext } from '~/lib/context.server';
import { shopifyCustomerService } from '~/services/shopify/customer.server';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  sendOtpEmail,
  type OtpSessionData,
} from '~/lib/auth-otp.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== 'POST') {
    return data({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const { session, env } = await getHydrogenContext(context, request);
  const currentEmail = session.get('customerEmail') as string | undefined;

  if (!currentEmail) {
    return data({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const sessionSecret = env.SESSION_SECRET || 'monts-fallback-session-secret-key-32-chars-min';
  const formData = await request.formData();
  const intent = (formData.get('intent') as string)?.trim();

  // ── STEP 1: SEND OTP TO NEW EMAIL ──────────────────────────────────────────
  if (intent === 'send_otp') {
    const newEmail = (formData.get('newEmail') as string)?.trim().toLowerCase();

    if (!newEmail || !newEmail.includes('@')) {
      return data({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (newEmail === currentEmail.toLowerCase()) {
      return data({ error: 'The new email is the same as your current email.' }, { status: 400 });
    }

    // Check if another customer already has this email in Shopify
    const existingId = await shopifyCustomerService.getCustomerIdByEmail(newEmail, env);
    if (existingId) {
      return data(
        { error: 'An account with this email address already exists. Please use a different email.' },
        { status: 400 },
      );
    }

    // Rate-limit resend: 60s cooldown
    const existingChange = session.get('emailChangeData') as OtpSessionData | undefined;
    const RESEND_COOLDOWN_MS = 60 * 1000;
    if (
      existingChange &&
      existingChange.email === newEmail &&
      existingChange.expiresAt > Date.now() &&
      existingChange.sentAt &&
      Date.now() - existingChange.sentAt < RESEND_COOLDOWN_MS
    ) {
      const secondsLeft = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existingChange.sentAt)) / 1000,
      );
      return data(
        {
          error: `Please wait ${secondsLeft}s before requesting a new code.`,
          step: 'verify',
          newEmail,
        },
        { status: 429 },
      );
    }

    const code = generateOtp();
    const codeHash = await hashOtp(code, newEmail, sessionSecret);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const sentAt = Date.now();

    const emailChangeData: OtpSessionData = {
      email: newEmail,
      codeHash,
      expiresAt,
      sentAt,
      attempts: 0,
      used: false,
    };
    session.set('emailChangeData', emailChangeData);

    const { success, error: emailError } = await sendOtpEmail(newEmail, code, env);
    if (!success) {
      return data(
        { error: `Could not deliver verification code: ${emailError}. Please try again.` },
        { status: 500 },
      );
    }

    return data({
      success: true,
      step: 'verify',
      newEmail,
      message: `A 6-digit verification code was sent to ${newEmail}.`,
    });
  }

  // ── STEP 2: VERIFY OTP AND COMMIT EMAIL CHANGE ─────────────────────────────
  if (intent === 'verify_otp') {
    const code = (formData.get('code') as string)?.trim().replace(/\s+/g, '');
    const newEmail = (formData.get('newEmail') as string)?.trim().toLowerCase();

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return data({ error: 'Please enter a valid 6-digit code.', step: 'verify', newEmail }, { status: 400 });
    }

    const emailChangeData = session.get('emailChangeData') as OtpSessionData | undefined;

    if (!emailChangeData) {
      return data(
        { error: 'No active email change request. Please request a new verification code.', step: 'input' },
        { status: 400 },
      );
    }

    if (Date.now() > emailChangeData.expiresAt) {
      session.unset('emailChangeData');
      return data(
        { error: 'Verification code has expired. Please request a new code.', step: 'input' },
        { status: 400 },
      );
    }

    if (emailChangeData.attempts >= 5) {
      session.unset('emailChangeData');
      return data(
        { error: 'Too many incorrect attempts. Please request a new code.', step: 'input' },
        { status: 429 },
      );
    }

    const isValid = await verifyOtpHash(code, newEmail, sessionSecret, emailChangeData.codeHash);

    if (!isValid) {
      emailChangeData.attempts += 1;
      session.set('emailChangeData', emailChangeData);
      const remaining = 5 - emailChangeData.attempts;
      return data(
        {
          error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          step: 'verify',
          newEmail,
        },
        { status: 400 },
      );
    }

    // OTP Verified! Commit email change in Shopify Admin API
    const customerId = await shopifyCustomerService.getCustomerIdByEmail(currentEmail, env);
    if (!customerId) {
      return data({ error: 'Customer account not found in Shopify.' }, { status: 404 });
    }

    const result = await shopifyCustomerService.updateCustomerEmail(customerId, newEmail, env);
    if (!result.success) {
      return data(
        { error: result.error || 'Failed to update email in Shopify.', step: 'verify', newEmail },
        { status: 400 },
      );
    }

    // Update active session with new email
    session.set('customerEmail', newEmail);
    session.unset('emailChangeData');

    return data({
      success: true,
      step: 'completed',
      newEmail,
      message: 'Email address updated successfully.',
    });
  }

  return data({ error: 'Invalid email change intent.' }, { status: 400 });
}
