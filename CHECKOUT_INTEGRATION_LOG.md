# MONTS Checkout Integration Log

This document records the current checkout architecture for MONTS. It supersedes the older hosted-checkout-only "Plan A" notes.

Last synchronized on 2026-09-03.

## Current Summary

MONTS has a dual checkout engine:

- Prepaid online orders use Shopify Hosted Checkout with the merchant's CCAvenue/UPI/cards/netbanking payment setup.
- Cash on Delivery orders are created server-side through Shopify Admin GraphQL as draft orders, then completed with payment pending.
- Delivery address validation happens in the custom Hydrogen `/checkout` route before either branch continues.
- OTP/customer profile data can prefill checkout fields when the customer is signed in.

## Checkout Entry Points

| Entry point | Current behavior |
|---|---|
| `/cart` page | Links to `/checkout` |
| PDP Add to Bag | Adds line, then navigates to `/cart` |
| PDP Buy Now | Adds line, then navigates to `/checkout` |
| Cart drawer | Still links directly to `cart.checkoutUrl`; this bypasses the custom Prepaid/COD selector |

The cart drawer behavior is the next code fix to make checkout consistent.

## Prepaid Flow

1. Customer opens `/checkout`.
2. Loader fetches the Shopify cart and any authenticated customer profile.
3. Customer enters contact and delivery details.
4. Server validates required fields.
5. Server validates pincode/city/state consistency through `locationService.validateConsistency()`.
6. Server optionally syncs newsletter subscription through Shopify Admin API.
7. Server updates cart buyer identity with email, phone, and delivery address.
8. Server redirects to `updatedCart.checkoutUrl`.
9. Shopify Hosted Checkout handles CCAvenue/UPI/cards/netbanking payment.
10. Customer returns to `/thank-you` or Shopify confirmation depending on checkout configuration.

Relevant files:

- `app/routes/checkout.tsx`
- `app/services/location/location.server.ts`
- `app/services/shopify/customer.server.ts`
- `app/routes/thank-you.tsx`

## Prepaid Discount State

The storefront UI advertises an extra 15% prepaid discount.

Current code state:

- `app/services/shopify/discount.server.ts` contains `applyPrepaidDiscount()`.
- `/checkout` does not currently call `applyPrepaidDiscount()`.
- Therefore, discount application currently depends on Shopify checkout/discount configuration unless the helper is wired into the Prepaid branch.

Do not document the discount as app-applied until the checkout code actually applies it.

## Cash on Delivery Flow

1. Customer opens `/checkout`.
2. Customer enters contact and delivery details.
3. Customer selects COD.
4. Server validates required fields and location consistency.
5. Server creates or retrieves a checkout session object from the signed session cookie.
6. `createCodOrder()` converts current cart lines into Shopify draft order line items.
7. Shopify Admin GraphQL `draftOrderCreate` creates the draft order.
8. Shopify Admin GraphQL `draftOrderComplete` completes the draft with `paymentPending: true`.
9. Confirmation email is dispatched through Gmail SMTP.
10. Cart lines are removed.
11. Checkout session is cleared.
12. Customer is redirected to `/thank-you?payment=cod&order=...`.

Relevant files:

- `app/routes/checkout.tsx`
- `app/services/shopify/codOrder.server.ts`
- `app/services/shopify/adminApi.server.ts`
- `app/services/shopify/adminToken.server.ts`
- `app/services/checkout/checkoutSession.server.ts`
- `app/services/email/dispatcher.server.ts`
- `app/services/email/smtp.server.ts`

## Shopify Admin Requirements

COD, customer sync, newsletter subscription, profile updates, address management, and order-history reads require Admin API credentials in the runtime environment.

Supported token modes:

- Static `SHOPIFY_ADMIN_API_TOKEN` beginning with `shpat_`.
- Dynamic Client Credentials Grant using `SHOPIFY_ADMIN_CLIENT_ID` and `SHOPIFY_ADMIN_CLIENT_SECRET`.
- `SHOPIFY_ADMIN_API_TOKEN` beginning with `shpss_` can act as the client secret fallback in some code paths.

Order-history display may need the `read_orders` scope. The account UI already handles the restricted-scope case by showing a scoped access notice.

## Email Requirements

Checkout uses Gmail SMTP for COD order confirmation.

Required variables:

```env
ENABLE_GOOGLE_SMTP="true"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your_gmail_address"
SMTP_PASS="your_google_app_password"
SMTP_FROM="MONTS <your_gmail_address>"
```

Nodemailer must remain dynamically imported inside `smtp.server.ts`; static imports can break edge/worker bundling.

## Shopify Publications

Products and collections must be published to storefront-facing channels:

- Online Store: `gid://shopify/Publication/166954467621`
- Monts Headless: `gid://shopify/Publication/318794367269`

Verified live on 2026-09-03:

- Storefront API shows 115 visible products.
- Storefront API shows the 10 expected parent collections.
- All 10 collections have cover images.

## Verification

Read-only checks performed during documentation sync:

```bash
npm run typecheck
```

Result: TypeScript passed with 0 errors.

Read-only Shopify checks:

- Admin products count: 115.
- Admin collections count: 10.
- Storefront visible product nodes: 115.
- Storefront visible collection nodes: 10.
- Storefront collections with images: 10.

## Known Follow-Up

1. Route cart drawer checkout through `/checkout`.
2. Decide whether to wire `applyPrepaidDiscount()` into the Prepaid branch.
3. Add focused tests for COD draft order creation, prepaid handoff, pincode validation, and cart entrypoints.
4. Verify production Vercel environment variables before launch.
