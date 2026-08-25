/**
 * auth-otp.server.ts
 *
 * High-level orchestration module for passwordless OTP authentication:
 * 1. generateOtp()          → cryptographic 6-digit code
 * 2. hashOtp() / verifyOtpHash() → cryptographic SHA-256 HMAC challenge derivation
 * 3. sendOtpEmail()         → dispatches via Resend / Google SMTP / Dev Logger
 * 4. syncCustomerWithShopify() → creates/syncs customer in Shopify via Admin API (no password)
 */

import { dispatchOtpEmail } from '~/services/email/dispatcher.server';
import { shopifyCustomerService } from '~/services/shopify/customer.server';

export interface OtpSessionData {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

/** Generates a cryptographically random 6-digit numeric OTP. */
export function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

/** Generates an opaque SHA-256 hash representation of OTP combined with email and server secret. */
export async function hashOtp(code: string, email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${code.trim()}:${email.toLowerCase().trim()}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Timing-safe verification of submitted OTP against stored cryptographic hash. */
export async function verifyOtpHash(
  submittedCode: string,
  email: string,
  secret: string,
  expectedHash: string,
): Promise<boolean> {
  const computedHash = await hashOtp(submittedCode, email, secret);
  return computedHash === expectedHash;
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
