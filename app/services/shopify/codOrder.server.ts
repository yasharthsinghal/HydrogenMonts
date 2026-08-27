/**
 * codOrder.server.ts
 * Server-side Shopify Draft Order creation & completion for Cash on Delivery (COD).
 */

import { adminGraphQL } from './adminApi.server';
import { logger } from '~/utils/logger.server';
import type { CustomerDeliveryFields, CheckoutErrorCode } from '~/services/checkout/validation.server';
import type { CheckoutSessionData } from '~/services/checkout/checkoutSession.server';

const DRAFT_ORDER_CREATE_MUTATION = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        status
        totalPrice
        currencyCode
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DRAFT_ORDER_COMPLETE_MUTATION = `
  mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
    draftOrderComplete(id: $id, paymentPending: $paymentPending) {
      draftOrder {
        id
        name
        status
        order {
          id
          name
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface CreateCodOrderParams {
  cart: any;
  customerFields: CustomerDeliveryFields;
  sessionData: CheckoutSessionData;
  env: Env;
}

export interface CreateCodOrderResult {
  success: boolean;
  orderId?: string;
  orderName?: string;
  draftOrderId?: string;
  errorCode?: CheckoutErrorCode;
  errorMessage?: string;
}

export async function createCodOrder({
  cart,
  customerFields,
  sessionData,
  env,
}: CreateCodOrderParams): Promise<CreateCodOrderResult> {
  const sessionId = sessionData.checkoutSessionId;

  logger.info(`Starting COD order placement for session: ${sessionId}`, {
    sessionId,
    cartId: cart.id,
    email: customerFields.email,
  });

  // 1. Extract cart line items for draft order
  const lines =
    cart?.lines?.nodes ||
    (cart?.lines?.edges ? cart.lines.edges.map((e: any) => e.node) : null) ||
    (Array.isArray(cart?.lines) ? cart.lines : []);

  if (lines.length === 0) {
    logger.warn('COD order failed: Cart has no line items', { sessionId });
    return {
      success: false,
      errorCode: 'CART_EMPTY',
      errorMessage: 'Cart is empty. Please add items before placing order.',
    };
  }

  const lineItems = lines.map((line: any) => {
    const variantId = line.merchandise?.id;
    return {
      variantId,
      quantity: line.quantity,
    };
  });

  let draftOrderId = sessionData.codDraftId;
  let draftOrderName: string | undefined;

  // 2. If no draft order was previously created in this session, create one
  if (!draftOrderId) {
    const shippingAddress = {
      firstName: customerFields.firstName,
      lastName: customerFields.lastName,
      address1: customerFields.address1,
      address2: customerFields.address2 || '',
      city: customerFields.city,
      province: customerFields.province,
      zip: customerFields.zip,
      country: customerFields.country || 'India',
      phone: customerFields.phone,
    };

    const draftInput: Record<string, any> = {
      email: customerFields.email,
      phone: customerFields.phone,
      shippingAddress,
      billingAddress: shippingAddress,
      lineItems,
      tags: ['cod', 'payment-pending', 'custom_checkout'],
      note: 'Payment Method: Cash on Delivery (COD) — MONTS Storefront',
      customAttributes: [
        { key: 'payment_method', value: 'cod' },
        { key: 'checkout_session_id', value: sessionId },
      ],
      shippingLine: {
        title: 'Complimentary Domestic Shipping (India)',
        price: '0.00',
      },
    };

    try {
      const createResponse = await adminGraphQL(
        'draftOrderCreate',
        DRAFT_ORDER_CREATE_MUTATION,
        { input: draftInput },
        env,
      );

      const userErrors = createResponse?.data?.draftOrderCreate?.userErrors || [];
      if (userErrors.length > 0) {
        logger.error('draftOrderCreate returned userErrors', {
          sessionId,
          userErrors,
        });
        return {
          success: false,
          errorCode: 'COD_ORDER_CREATION_FAILED',
          errorMessage: userErrors.map((e: any) => e.message).join(', '),
        };
      }

      const draftOrder = createResponse?.data?.draftOrderCreate?.draftOrder;
      if (!draftOrder?.id) {
        logger.error('draftOrderCreate returned no draftOrder ID', {
          sessionId,
          createResponse,
        });
        return {
          success: false,
          errorCode: 'COD_ORDER_CREATION_FAILED',
          errorMessage: 'Could not create order in Shopify store.',
        };
      }

      draftOrderId = draftOrder.id;
      draftOrderName = draftOrder.name;
      logger.info(`Shopify Draft Order created: ${draftOrderId} (${draftOrderName})`, {
        sessionId,
        draftOrderId,
        draftOrderName,
      });
    } catch (err: any) {
      logger.error('draftOrderCreate exception', err, { sessionId });
      return {
        success: false,
        errorCode: 'SHOPIFY_UNAVAILABLE',
        errorMessage: err?.message || 'Shopify order service is currently unreachable. Please try again.',
      };
    }
  } else {
    logger.info(`Reusing existing draft order from session: ${draftOrderId}`, {
      sessionId,
      draftOrderId,
    });
  }

  // 3. Complete Draft Order to turn it into an official Order with paymentPending: true
  try {
    const completeResponse = await adminGraphQL(
      'draftOrderComplete',
      DRAFT_ORDER_COMPLETE_MUTATION,
      { id: draftOrderId, paymentPending: true },
      env,
    );

    const userErrors = completeResponse?.data?.draftOrderComplete?.userErrors || [];
    if (userErrors.length > 0) {
      logger.error('draftOrderComplete returned userErrors', {
        sessionId,
        draftOrderId,
        userErrors,
      });
      return {
        success: false,
        draftOrderId,
        errorCode: 'COD_ORDER_COMPLETION_FAILED',
        errorMessage: userErrors.map((e: any) => e.message).join(', '),
      };
    }

    const orderData = completeResponse?.data?.draftOrderComplete?.draftOrder?.order;
    const finalOrderId = orderData?.id;
    const finalOrderName = orderData?.name || draftOrderName;

    if (!finalOrderId) {
      logger.error('draftOrderComplete returned no Order ID', {
        sessionId,
        draftOrderId,
        completeResponse,
      });
      return {
        success: false,
        draftOrderId,
        errorCode: 'COD_ORDER_COMPLETION_FAILED',
        errorMessage: 'Draft order created, but final order ID was not returned by Shopify.',
      };
    }

    logger.info(`🎉 COD Shopify Order completed successfully: ${finalOrderName} (${finalOrderId})`, {
      sessionId,
      orderId: finalOrderId,
      orderName: finalOrderName,
      financialStatus: orderData.displayFinancialStatus,
    });

    return {
      success: true,
      orderId: finalOrderId,
      orderName: finalOrderName,
      draftOrderId,
    };
  } catch (err: any) {
    logger.error('draftOrderComplete exception', err, {
      sessionId,
      draftOrderId,
    });
    return {
      success: false,
      draftOrderId,
      errorCode: 'COD_ORDER_COMPLETION_FAILED',
      errorMessage: 'Failed to complete order in Shopify. Please contact concierge.',
    };
  }
}
