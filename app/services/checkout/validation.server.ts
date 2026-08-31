/**
 * validation.server.ts
 * Validation rules and error codes for the checkout workflow.
 */

export type CheckoutErrorCode =
  | 'CHECKOUT_INVALID'
  | 'CHECKOUT_EXPIRED'
  | 'CART_EMPTY'
  | 'CART_CHANGED'
  | 'INVALID_PAYMENT_INTENT'
  | 'PREPAID_DISCOUNT_FAILED'
  | 'COD_ORDER_CREATION_FAILED'
  | 'COD_ORDER_COMPLETION_FAILED'
  | 'ORDER_ALREADY_EXISTS'
  | 'SHOPIFY_UNAVAILABLE'
  | 'RATE_LIMITED';

export const CHECKOUT_ERROR_MESSAGES: Record<CheckoutErrorCode, string> = {
  CHECKOUT_INVALID: 'Please fill in all required contact and delivery address fields.',
  CHECKOUT_EXPIRED: 'Your checkout session has expired. Please restart checkout from your cart.',
  CART_EMPTY: 'Your bag is empty. Please add items before checking out.',
  CART_CHANGED: 'Your cart items or prices have changed. Please review and try again.',
  INVALID_PAYMENT_INTENT: 'Invalid payment method selected. Please choose Cash on Delivery or Pay Online.',
  PREPAID_DISCOUNT_FAILED: 'Could not apply the 15% prepaid discount code. Please try again.',
  COD_ORDER_CREATION_FAILED: 'Unable to place Cash on Delivery order right now. Please try again or contact concierge.',
  COD_ORDER_COMPLETION_FAILED: 'Order was created but confirmation is pending. Please check your email or contact support.',
  ORDER_ALREADY_EXISTS: 'This order has already been placed.',
  SHOPIFY_UNAVAILABLE: 'Storefront payment services are temporarily unavailable. Please try again in a moment.',
  RATE_LIMITED: 'Please wait a few seconds before trying again.',
};

export interface CustomerDeliveryFields {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country?: string;
}

export type PaymentIntent = 'cod' | 'prepaid';

export interface ValidationResult<T = void> {
  isValid: boolean;
  errorCode?: CheckoutErrorCode;
  errorMessage?: string;
  data?: T;
}

/**
 * Validates delivery contact and address form inputs.
 */
export function validateCustomerDeliveryFields(
  formData: FormData,
): ValidationResult<CustomerDeliveryFields> {
  const email = (formData.get('email') as string)?.trim().toLowerCase() || '';
  const firstName = (formData.get('firstName') as string)?.trim() || '';
  const lastName = (formData.get('lastName') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const address1 = (formData.get('address1') as string)?.trim() || '';
  const address2 = (formData.get('address2') as string)?.trim() || '';
  const city = (formData.get('city') as string)?.trim() || '';
  const province = (formData.get('province') as string)?.trim() || '';
  const zip = (formData.get('zip') as string)?.trim() || '';
  const country = 'IN';

  if (!email || !firstName || !lastName || !phone || !address1 || !city || !province || !zip) {
    return {
      isValid: false,
      errorCode: 'CHECKOUT_INVALID',
      errorMessage: CHECKOUT_ERROR_MESSAGES.CHECKOUT_INVALID,
    };
  }

  // Basic email syntax check
  if (!email.includes('@') || !email.includes('.')) {
    return {
      isValid: false,
      errorCode: 'CHECKOUT_INVALID',
      errorMessage: 'Please enter a valid email address.',
    };
  }

  return {
    isValid: true,
    data: {
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
    },
  };
}

/**
 * Validates the payment intent.
 */
export function validatePaymentIntent(intent: unknown): intent is PaymentIntent {
  return intent === 'cod' || intent === 'prepaid';
}

/**
 * Validates the cart existence and non-empty line items.
 */
export function validateCart(cart: any): ValidationResult {
  if (!cart) {
    return {
      isValid: false,
      errorCode: 'CART_EMPTY',
      errorMessage: CHECKOUT_ERROR_MESSAGES.CART_EMPTY,
    };
  }

  const lines =
    cart?.lines?.nodes ||
    (cart?.lines?.edges ? cart.lines.edges.map((e: any) => e.node) : null) ||
    (Array.isArray(cart?.lines) ? cart.lines : []);

  const totalQuantity = cart?.totalQuantity ?? lines.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);

  if (lines.length === 0 || totalQuantity <= 0) {
    return {
      isValid: false,
      errorCode: 'CART_EMPTY',
      errorMessage: CHECKOUT_ERROR_MESSAGES.CART_EMPTY,
    };
  }

  return { isValid: true };
}
