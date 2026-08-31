/**
 * checkoutSession.server.ts
 * Manages checkout session state, order reference security, and idempotency using AppSession.
 */

import type { AppSession } from '~/lib/context.server';

export interface CheckoutSessionData {
  checkoutSessionId: string;
  cartId: string;
  customerEmail: string;
  codOrderId?: string;
  codOrderName?: string;
  codDraftId?: string;
  lastCodAttempt?: number;
}

const CHECKOUT_SESSION_KEY = '__monts_checkout_session';

/**
 * Generates a cryptographically random checkout session ID.
 */
export function generateCheckoutSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Retrieves the current checkout session from AppSession.
 */
export function getCheckoutSession(session: AppSession): CheckoutSessionData | null {
  try {
    const raw = session.get(CHECKOUT_SESSION_KEY);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * Persists the checkout session data into AppSession.
 */
export function setCheckoutSession(
  session: AppSession,
  data: CheckoutSessionData,
): void {
  session.set(CHECKOUT_SESSION_KEY, JSON.stringify(data));
}

/**
 * Clears the checkout session data.
 */
export function clearCheckoutSession(session: AppSession): void {
  session.unset(CHECKOUT_SESSION_KEY);
}
