/**
 * auth-otp.server.ts
 *
 * High-level orchestration module for passwordless OTP authentication:
 * 1. generateOtp()          → cryptographic 6-digit code
 * 2. sendOtpEmail()         → dispatches via Resend / Google SMTP / Dev Logger
 * 3. syncCustomerWithShopify() → creates customer in Shopify via Admin API (no password)
 */

import { dispatchOtpEmail } from '~/services/email/dispatcher.server';
import { shopifyCustomerService } from '~/services/shopify/customer.server';

export interface OtpSessionData {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

/** Generates a cryptographically random 6-digit numeric OTP. */
export function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

/** Sends OTP email using the active provider configured in environment variables. */
export async function sendOtpEmail(email: string, code: string, env: Env) {
  return dispatchOtpEmail({ to: email, code }, env);
}

/**
 * After OTP is verified in-app, syncs customer with Shopify via Admin API.
 * No password is generated or used. OTP is the sole authentication factor.
 */
export async function syncCustomerWithShopify(
  storefront: any,
  email: string,
  sessionSecret: string,
  env?: Env,
) {
  return shopifyCustomerService.syncCustomer(storefront, email, sessionSecret, env);
}
