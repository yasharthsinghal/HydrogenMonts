# MONTS Storefront API Documentation

This document describes the current Hydrogen storefront API and service architecture.

Last synchronized on 2026-09-03.

## System Overview

MONTS is a Shopify Hydrogen storefront using React Router v7 SSR. Public catalog reads use the Shopify Storefront GraphQL API. Server-side business operations use Shopify Admin GraphQL through private runtime credentials.

Current verified live state:

- Storefront-visible products: 115.
- Storefront-visible collections: 10.
- Storefront collections with cover images: 10.
- Admin product count: 115.
- Admin collection count: 10.
- TypeScript check: `npm run typecheck` passes.

## Runtime Layers

| Layer | Role | Important Files |
|---|---|---|
| React Router routes | SSR loaders and form actions | `app/routes/*.tsx`, `app/routes/*.ts` |
| Hydrogen context | Storefront, Customer Account, cart, session, env | `app/lib/context.server.ts`, `server.ts` |
| Storefront GraphQL | Products, collections, pages, policies, search, cart checkout URL | `app/graphql/StorefrontQueries.ts`, `app/graphql/StorefrontFragments.ts` |
| Shopify Admin GraphQL | COD orders, customer sync, profile, address, newsletter, order reads | `app/services/shopify/*.ts` |
| Checkout services | Checkout session and validation primitives | `app/services/checkout/*.ts` |
| Email services | OTP, COD order confirmation, contact inquiry | `app/services/email/*.ts` |
| Location services | India pincode lookup and consistency validation | `app/services/location/*.ts` |

## Session Model

The storefront uses a signed HTTP-only cookie named `__session`.

Important session keys:

| Key | Purpose |
|---|---|
| `cartId` | Shopify Cart GID managed by Hydrogen cart handler |
| `customerEmail` | Verified OTP customer identity |
| `customerAccessToken` | Legacy/optional Shopify customer token |
| `otpData` | Temporary OTP challenge data |
| `emailChangeData` | Temporary OTP challenge for account email changes |
| `__monts_checkout_session` | Checkout session metadata for COD flow |

OTP challenge data contains:

```ts
interface OtpSessionData {
  email: string;
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  used?: boolean;
}
```

Codes expire after 10 minutes, have a 60-second resend cooldown, and allow 5 attempts.

## Public Route Matrix

| Route | Method | Purpose | Primary Backend |
|---|---|---|---|
| `/` | GET | Homepage catalog sections | Storefront API |
| `/collections` | GET | All parent collections | Storefront API |
| `/collections/:handle` | GET | Collection product grid and sorting | Storefront API |
| `/collections/all` | GET | Virtual all-products collection | Storefront API |
| `/products/:handle` | GET | Product details, variants, media, recommendations | Storefront API |
| `/search?q=` | GET | Search results page | Storefront API |
| `/cart` | GET | Full cart page | Hydrogen cart |
| `/cart` | POST | Add/update/remove cart lines | Hydrogen cart |
| `/checkout` | GET | Delivery and payment selector | Hydrogen cart, Storefront/Admin customer reads |
| `/checkout` | POST | Prepaid or COD checkout action | Hydrogen cart, Admin API, SMTP |
| `/thank-you` | GET | Branded post-order confirmation | Session/query params |
| `/account/login` | GET/POST | Passwordless OTP login/register | Session, SMTP, Admin API |
| `/account/logout` | GET/POST | Clears account session | Session, optional Storefront token revoke |
| `/account` | GET | Customer dashboard | Admin API |
| `/account/orders/:id` | GET | Customer order detail | Storefront token or Admin API |
| `/contact` | GET/POST | Contact form | SMTP |
| `/wholesale` | GET | Coming Soon page | Static route |
| `/pages/:handle` | GET | Shopify page content | Storefront API |
| `/policies/:handle` | GET | Shopify policy content | Storefront API |
| `/sitemap.xml` | GET | Dynamic XML sitemap | Storefront API |
| `/robots.txt` | GET | Crawler rules | Static route |

## Internal API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/location?pincode=400001` | GET | Resolve Indian pincode to city/state |
| `/api/search?q=tote` | GET | Header autocomplete product suggestions |
| `/api/subscribe` | POST | Subscribe customer to newsletter/VIP catalog in Shopify |
| `/api/account/profile` | POST | Update first name, last name, phone |
| `/api/account/address` | POST | Add, edit, delete, or set default customer address |
| `/api/account/email-change` | POST | Send and verify OTP for email change |

## Cart API

### `GET /cart`

Loads the current Hydrogen cart using the cart ID stored in the session cookie.

### `POST /cart`

Accepts `cartFormInput`, a JSON string with an action and inputs.

Supported actions:

```json
{
  "action": "LinesAdd",
  "inputs": {
    "lines": [
      {
        "merchandiseId": "gid://shopify/ProductVariant/...",
        "quantity": 1
      }
    ]
  }
}
```

```json
{
  "action": "LinesUpdate",
  "inputs": {
    "lines": [
      {
        "id": "gid://shopify/CartLine/...",
        "quantity": 2
      }
    ]
  }
}
```

```json
{
  "action": "LinesRemove",
  "inputs": {
    "lineIds": ["gid://shopify/CartLine/..."]
  }
}
```

On success, the route returns Hydrogen cart mutation output and updates the cart ID cookie through `cart.setCartId()`.

## Checkout API

### `GET /checkout`

Loads:

- Current cart.
- OTP-authenticated customer profile by `customerEmail`, if present.
- Shopify Customer Account profile if that legacy login path is active.

Redirects to `/cart` when the cart is empty.

### `POST /checkout`

Required form fields:

| Field | Required | Notes |
|---|---:|---|
| `paymentMethod` | Yes | `PREPAID` or `COD`; defaults to `PREPAID` |
| `email` | Yes | Used for checkout/order confirmation |
| `firstName` | Yes | Shipping address |
| `lastName` | Yes | Shipping address |
| `phone` | Yes | Shipping/contact phone |
| `address1` | Yes | Street/building/house |
| `address2` | No | Apartment/landmark |
| `city` | Yes | Validated against pincode |
| `province` | Yes | Indian state/union territory |
| `zip` | Yes | 6-digit Indian pincode |
| `subscribeNewsletter` | No | `true` syncs marketing consent through Admin API |

Common validation:

1. Required fields must be present.
2. `locationService.validateConsistency(zip, city, province)` must pass.
3. Newsletter opt-in is attempted in the background.
4. A checkout session object is stored if not already present.

### Prepaid Branch

When `paymentMethod` is `PREPAID`:

1. `cart.updateBuyerIdentity()` saves email, phone, and delivery address to Shopify cart.
2. The route fetches the updated cart.
3. If `checkoutUrl` exists, the customer is redirected to Shopify Hosted Checkout.
4. Shopify Hosted Checkout handles CCAvenue/UPI/cards/netbanking.

Discount note:

- `app/services/shopify/discount.server.ts` contains `applyPrepaidDiscount()`.
- The current `/checkout` action does not call it.
- Treat prepaid discount application as Shopify-side configuration until code wiring is added.

### COD Branch

When `paymentMethod` is `COD`:

1. The route reads cart lines.
2. `createCodOrder()` builds Shopify draft order line items from cart variants.
3. Admin GraphQL `draftOrderCreate` creates the draft order.
4. Admin GraphQL `draftOrderComplete` completes the draft with `paymentPending: true`.
5. `dispatchOrderConfirmationEmail()` sends the COD confirmation email.
6. Cart lines are removed with `cart.removeLines()`.
7. Checkout session data is cleared.
8. Customer is redirected to `/thank-you?payment=cod&order=...`.

COD failure returns a 400 response with a customer-facing error.

## Customer Auth API

### `GET /account/login`

If `customerEmail` is already present in the session, redirects to the sanitized `return_to` destination. Otherwise returns login state for the OTP UI.

Allowed `return_to` values are currently limited by `sanitizeRedirect()` to:

- `/checkout`
- `/account`
- `/cart`

This means routes like `/account/orders/:id` currently fall back to `/account` after login.

### `POST /account/login`

Supported intents:

| Intent | Behavior |
|---|---|
| `send_otp` | Generates and emails a 6-digit OTP |
| `verify_otp` | Verifies OTP, syncs customer to Shopify, stores `customerEmail` |
| `reset_email` | Clears current OTP challenge |

Security behavior:

- OTP is hashed with email and `SESSION_SECRET`.
- Raw OTP is not persisted.
- Challenge is marked `used` before customer sync to reduce replay risk.
- Customer sync uses Admin API; no password is generated.

## Customer Account APIs

Authenticated account routes use the OTP session key `customerEmail`.

### Profile

`POST /api/account/profile`:

- Resolves Shopify customer by current session email.
- Updates first name, last name, and phone through Admin API.
- Phone values are normalized toward Indian E.164 format.

### Addresses

`POST /api/account/address` supports:

- `intent=add`
- `intent=edit`
- `intent=delete`
- `intent=set-default`

Address mutations use Shopify Admin API customer address mutations.

### Email Change

`POST /api/account/email-change` supports:

- `intent=send_otp`
- `intent=verify_otp`

The new email must be verified before Shopify customer email and session `customerEmail` are updated.

### Orders

Order reads try:

1. Storefront customer token order list, if a legacy `customerAccessToken` exists.
2. Admin customer profile lookup by OTP `customerEmail`.
3. Direct Admin order lookup for GIDs or numeric IDs.

The service enforces email ownership on direct Admin order lookup to avoid IDOR exposure.

If the Admin app lacks `read_orders`, the UI shows a scoped access notice rather than failing the whole account page.

## Storefront GraphQL

Important Storefront operations live in `app/graphql/StorefrontQueries.ts`.

| Operation | Purpose |
|---|---|
| `HOMEPAGE_QUERY` | Shop info, featured collections, featured products, newest products |
| `COLLECTIONS_QUERY` | Collection directory cards |
| `ALL_PRODUCTS_QUERY` | Virtual all-products catalog |
| `COLLECTION_BY_HANDLE_QUERY` | Collection header and product grid |
| `PRODUCT_BY_HANDLE_QUERY` | PDP data, media, options, variants, SEO |
| `RECOMMENDED_PRODUCTS_QUERY` | Shopify product recommendations |
| `SEARCH_QUERY` | Product search and autocomplete |
| `STOREFRONT_CUSTOMER_QUERY` | Legacy Storefront customer/profile/order read |

## Shopify Admin GraphQL

Server-only Admin API helpers live in `app/services/shopify`.

| Service | Purpose |
|---|---|
| `adminToken.server.ts` | Static token or Client Credentials token exchange with in-memory cache |
| `adminApi.server.ts` | Shared Admin GraphQL request wrapper |
| `codOrder.server.ts` | COD draft order creation and completion |
| `customer.server.ts` | Customer search/create/sync, profile, addresses, orders, newsletter |
| `discount.server.ts` | Unused helper for applying prepaid cart discount codes |

Required Admin credentials:

```env
SHOPIFY_ADMIN_API_VERSION="2025-01"
SHOPIFY_ADMIN_CLIENT_ID="..."
SHOPIFY_ADMIN_CLIENT_SECRET="..."
# or
SHOPIFY_ADMIN_API_TOKEN="shpat_..."
```

## Email API

Email dispatch flows through `app/services/email/dispatcher.server.ts`.

Supported messages:

- OTP login codes.
- COD order confirmations.
- Contact form inquiries.

SMTP implementation:

- `GoogleSmtpEmailProvider`.
- Gmail SMTP defaults to `smtp.gmail.com:465`.
- Nodemailer is dynamically imported inside send methods.
- If SMTP is unavailable, dispatcher logs development-mode output and reports success for local development.

## Location API

`GET /api/location?pincode=400001` validates pincode format, calls `locationService.lookupByPincode()`, and returns normalized city/state/district data.

Provider:

- `PostalPincodeProvider`
- Default base URL: `https://api.postalpincode.in`
- Default timeout: 5000ms
- In-memory cache TTL: 24 hours
- Max cache entries: 1000

Checkout uses `validateConsistency()` server-side to ensure pincode, city, and state belong together.

## Catalog and Collection Contract

Only these 10 parent collection handles should be used:

1. `pouch-bags-toiletry-sets`
2. `tote-bags`
3. `mobile-sling-bags`
4. `duffle-bags`
5. `sunglasses-covers`
6. `multi-utility-organizers`
7. `laptop-bags-office-essentials`
8. `wallets-clutches`
9. `accessories`
10. `kids-soft-toys`

The old flat collection model should not be recreated.

## Known Current Gaps

| Gap | Impact | Likely Fix |
|---|---|---|
| Cart drawer links directly to Shopify `checkoutUrl` | Drawer users bypass COD/payment selector | Route drawer CTA to `/checkout` |
| Prepaid discount helper is unused | App does not prove discount was applied before redirect | Wire `applyPrepaidDiscount()` or document Shopify-side automatic discount as source of truth |
| Navigation fallback collection list is stale | If root collection query fails, fallback links point to old apparel handles | Replace fallback with the 10 parent collection handles |
| Redirect allowlist is narrow | Login return to `/account/orders/:id` falls back to `/account` | Extend `sanitizeRedirect()` safely for internal account order paths |
| Automated tests are missing | Checkout/account regressions rely on manual QA | Add focused route/service tests |

## Deployment Notes

Current checked-in deployment configuration:

- `react-router.config.ts` uses `vercelPreset()`.
- `vercel.json` uses `"framework": "react-router"`.

Required production setup:

1. Add all storefront environment variables.
2. Add Admin API credentials for COD/customer/account operations.
3. Add SMTP credentials for OTP, contact, and COD email.
4. Confirm Shopify CCAvenue production/sandbox mode as appropriate.
5. Run `npm run typecheck`.
6. Run `npm run build`.

## Do Not Break

- Do not expose `.env` files or Admin credentials.
- Do not move `../monts-admin` scripts/assets into this public repo.
- Do not bypass `codOrder.server.ts` for COD orders.
- Do not statically import Nodemailer.
- Do not recreate the old flat collection hierarchy.
- Do not send raw S3 image URLs directly to Shopify media creation.
