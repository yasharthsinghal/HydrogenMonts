/**
 * discount.server.ts
 * Manages applying and verifying prepaid discount codes on the Shopify cart.
 */

import { logger } from '~/utils/logger.server';
import type { CheckoutErrorCode } from '~/services/checkout/validation.server';

export interface ApplyPrepaidDiscountResult {
  success: boolean;
  checkoutUrl?: string;
  appliedCode?: string;
  errorCode?: CheckoutErrorCode;
  errorMessage?: string;
}

export async function applyPrepaidDiscount(
  cart: any,
  env: Env,
): Promise<ApplyPrepaidDiscountResult> {
  const prepaidCode = env.PREPAID_DISCOUNT_CODE || 'PREPAID15';

  logger.info(`Applying prepaid discount code: ${prepaidCode}`);

  try {
    // 1. Update discount codes on cart (replaces any existing codes with the 15% prepaid code)
    const result = await cart.updateDiscountCodes([prepaidCode]);
    const updatedCart = result?.cart || (await cart.get());

    if (!updatedCart?.checkoutUrl) {
      logger.error('Failed to retrieve updated checkout URL after applying discount');
      return {
        success: false,
        errorCode: 'SHOPIFY_UNAVAILABLE',
        errorMessage: 'Unable to retrieve checkout link. Please try again.',
      };
    }

    const discountCodes = updatedCart?.discountCodes || [];
    const isCodeApplicable = discountCodes.some(
      (dc: any) => dc.code?.toUpperCase() === prepaidCode.toUpperCase() && dc.applicable !== false,
    );

    logger.info(`Prepaid discount update status:`, {
      code: prepaidCode,
      isCodeApplicable,
      discountCodes,
      checkoutUrl: updatedCart.checkoutUrl,
    });

    return {
      success: true,
      checkoutUrl: updatedCart.checkoutUrl,
      appliedCode: prepaidCode,
    };
  } catch (err: any) {
    logger.error('Exception applying prepaid discount to cart', err);
    // Fallback: retrieve the latest cart checkoutUrl directly
    try {
      const fallbackCart = await cart.get();
      if (fallbackCart?.checkoutUrl) {
        return {
          success: true,
          checkoutUrl: fallbackCart.checkoutUrl,
        };
      }
    } catch {
      // Ignored
    }

    return {
      success: false,
      errorCode: 'PREPAID_DISCOUNT_FAILED',
      errorMessage: 'Could not apply prepaid discount. Please try again.',
    };
  }
}
