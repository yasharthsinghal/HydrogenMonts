# MONTS Storefront - Shopify Hydrogen

This repository contains the public MONTS storefront: a Shopify Hydrogen application running on React Router v7, Vite, Tailwind CSS v4, and Node 22.

The storefront is safe to share and deploy. Private Shopify Admin scripts, raw catalog CSVs, and Admin credentials live outside this git repository in `../monts-admin`.

---

## Current Status

Verified on 2026-09-03:

- `main` is clean and points to the public storefront repository at `https://github.com/yasharthsinghal/HydrogenMonts.git`.
- `npm run typecheck` passes with 0 TypeScript errors.
- Shopify Storefront API returns 115 visible products.
- Shopify Storefront API returns exactly 10 visible parent collections.
- All 10 parent collections have live Shopify CDN cover images.
- Admin operations are isolated in `../monts-admin` and are not tracked by this storefront git repository.

Known code gap to fix next:

- `app/components/cart/CartDrawer.tsx` still links directly to `cart.checkoutUrl`. The cart page and PDP Buy Now path route through `/checkout`, but the drawer currently bypasses the custom Prepaid/COD selector.

---

## Technology Stack

| Area | Technology |
|---|---|
| App framework | Shopify Hydrogen, React Router v7 SSR |
| UI | React 18, Tailwind CSS v4, lucide-react |
| Runtime | Node 22, React Router server build |
| Deployment config | Vercel via `@vercel/react-router` and `vercel.json` |
| Shopify catalog | Shopify Storefront GraphQL API `2025-01` |
| Shopify mutations | Shopify Admin GraphQL API `2025-01`, server-only |
| Cart | Hydrogen cart handler, signed HTTP-only `__session` cookie |
| Customer auth | Passwordless email OTP stored in signed session |
| Email | Gmail SMTP through dynamic Nodemailer import |
| Location validation | India Post pincode API through server-side location service |

Oxygen scripts remain available for Hydrogen compatibility: `dev:oxygen`, `build:oxygen`, and `preview`.

The active deployment configuration in this repo is Vercel:

- `react-router.config.ts` uses `vercelPreset()`.
- `vercel.json` declares `"framework": "react-router"`.

---

## 🎨 Design System: Pipeline "Clean"

The storefront implements the authentic Pipeline theme design system:
- **Body Typography**: Cormorant (serif)
- **Heading Typography**: Playfair Display (serif)
- **UI / Buttons / Navigation**: DM Sans (sans-serif)
- **Palette**:
  - Background: Warm Cream (`#f5f0e8`)
  - Primary Brand Accent: Burnt Orange (`#c4622d` / hover `#923f12`)
  - Secondary Accent: Warm Linen (`#f0edea` / hover `#dac7b4`)
  - Announcement Bar & Main Footer: Near-Black (`#1a1a1a`)
  - Sub-Footer: Deep Black (`#0d0d0d`)
- **Product Media**: 1:1 Square aspect ratios with hover actions.
- **Button Radii**: 6px border radius.

---

## Quick Start

### 1. Install Dependencies
```bash
cd monts-hydrogen
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`. Never commit `.env`.

Required storefront variables:
```env
SESSION_SECRET="replace_with_a_long_random_secret"
PUBLIC_STORE_DOMAIN="47751d.myshopify.com"
PUBLIC_STOREFRONT_API_TOKEN="replace_with_storefront_token"
PRIVATE_STOREFRONT_API_TOKEN="optional_private_storefront_token"
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID="replace_with_customer_account_client_id"
PUBLIC_CUSTOMER_ACCOUNT_API_URL="https://shopify.com/47751d"
SHOP_ID="47751d"
```

Required for COD orders, customer sync, profile updates, addresses, and newsletter subscription:

```env
SHOPIFY_ADMIN_API_VERSION="2025-01"
SHOPIFY_ADMIN_CLIENT_ID="replace_with_admin_client_id"
SHOPIFY_ADMIN_CLIENT_SECRET="replace_with_admin_client_secret"
# or static fallback:
SHOPIFY_ADMIN_API_TOKEN="shpat_or_shpss_value"
```

Required for OTP, order confirmation, and contact form email:

```env
ENABLE_GOOGLE_SMTP="true"
OTP_EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your_gmail_address"
SMTP_PASS="your_16_character_google_app_password"
SMTP_FROM="MONTS <your_gmail_address>"
CONTACT_EMAIL_RECIPIENT="support_recipient"
```

Optional:

```env
PREPAID_DISCOUNT_CODE="PREPAID15"
LOCATION_PROVIDER="postal_pincode"
LOCATION_API_BASE_URL="https://api.postalpincode.in"
LOCATION_API_TIMEOUT_MS="5000"
```

### 3. Run Local Edge Development Server
```bash
npm run dev
```
Use the URL printed by React Router dev server.

> **Note**: For GraphQL schema code generation, you can run `npm run codegen` after installing `@graphql-codegen/cli` if type generation is desired.

---

## Production Build & Verification

```bash
# Typecheck
npm run typecheck

# Build for the React Router/Vercel target
npm run build

# Optional Hydrogen/Oxygen preview
npm run preview
```

---

## Deployment

The current repo is configured for Vercel:

1. Create or select the Vercel project for `monts-hydrogen`.
2. Set the framework to React Router if it is not auto-detected.
3. Add all required storefront, Admin API, SMTP, and location environment variables in Vercel project settings.
4. Run `npm run build` locally before deployment.
5. Deploy from the `main` branch.

Shopify Oxygen remains a possible Hydrogen runtime because Oxygen scripts are still present, but the checked-in deployment preset is Vercel.

---

## Project Architecture

```
monts-hydrogen/
├── app/
│   ├── components/
│   │   ├── account/      # Profile, email, and address modals
│   │   ├── address/      # Indian pincode/city/state fields
│   │   ├── cart/         # CartDrawer, CartItem
│   │   ├── common/       # Header, Footer, AnnouncementBar, MobileNav, Navigation
│   │   ├── products/     # ProductCard, ProductGrid
│   │   └── ui/           # Shared design primitives
│   ├── graphql/          # Storefront and Customer Account GraphQL documents
│   ├── lib/              # Hydrogen context, session, OTP, redirect helpers
│   ├── routes/           # React Router file-based routes
│   │   ├── _index.tsx            # Homepage
│   │   ├── collections._index.tsx # All collections
│   │   ├── collections.$handle.tsx# Collection detail & products
│   │   ├── products.$handle.tsx   # PDP gallery, variants, Add to Bag, Buy Now
│   │   ├── cart.tsx               # Server cart actions & cart page
│   │   ├── checkout.tsx           # Custom Prepaid/COD delivery and payment selector
│   │   ├── search.tsx             # Catalog search
│   │   ├── about.tsx              # Brand story
│   │   ├── contact.tsx            # Concierge & SMTP contact form
│   │   ├── wholesale.tsx          # Coming Soon; original form preserved in comments
│   │   ├── faq.tsx                # Accordion FAQ
│   │   ├── [sitemap.xml].tsx      # Dynamic edge sitemap
│   │   ├── robots[.]txt.tsx       # Dynamic robots.txt
│   │   ├── account.login.tsx      # Passwordless OTP login
│   │   ├── account.authorize.tsx  # Legacy Customer Account API OAuth callback
│   │   ├── account.logout.tsx     # Session logout
│   │   ├── account._index.tsx     # Protected customer dashboard
│   │   └── $.tsx                  # 404 Catch-all
│   ├── services/
│   │   ├── checkout/     # Checkout session and validation helpers
│   │   ├── email/        # SMTP dispatch and email templates
│   │   ├── location/     # India pincode provider and cache
│   │   └── shopify/      # Admin token, Admin GraphQL, COD, customer service
│   ├── styles/
│   │   └── app.css       # Tailwind v4 & Pipeline design tokens
│   ├── entry.client.tsx  # Hydration client
│   ├── entry.server.tsx  # Streaming SSR edge handler
│   ├── root.tsx          # HTML shell & global layout
│   └── server.ts         # Universal fetch handler
├── package.json
├── tsconfig.json
├── react-router.config.ts
├── vercel.json
└── vite.config.ts
```

---

## Key Routes

| Route | Purpose |
|---|---|
| `/` | Homepage with hero, featured collections, featured products, and catalog teasers |
| `/collections` | Directory of the 10 parent Shopify collections |
| `/collections/:handle` | Collection grid, including virtual `/collections/all` |
| `/products/:handle` | Product detail page with gallery, variants, Add to Bag, and Buy Now |
| `/cart` | Full cart page and cart line mutations |
| `/checkout` | Custom delivery and payment selector for Prepaid versus COD |
| `/thank-you` | Branded confirmation screen for prepaid and COD outcomes |
| `/account/login` | Passwordless OTP sign-in/register flow |
| `/account` | Authenticated customer dashboard |
| `/account/orders/:id` | Authenticated order detail view |
| `/api/location` | Server-side pincode lookup endpoint |
| `/api/search` | Header search suggestions |
| `/api/subscribe` | Newsletter/VIP catalog subscription |
| `/api/account/profile` | Authenticated profile update |
| `/api/account/address` | Authenticated address add/edit/delete/default |
| `/api/account/email-change` | OTP-gated account email change |
| `/contact` | Contact form dispatching to SMTP recipient |
| `/wholesale` | Temporary Coming Soon screen; old form is preserved in comments |
| `/sitemap.xml` | Dynamic sitemap from Shopify products and collections |
| `/robots.txt` | Search crawler rules |

## Checkout Architecture

MONTS currently uses a dual checkout engine.

### Prepaid Orders

1. Customer reviews cart.
2. Customer enters delivery details and chooses Prepaid on `/checkout`.
3. Server validates required fields and pincode/city/state consistency.
4. Server updates Shopify cart buyer identity.
5. Customer is redirected to Shopify Hosted Checkout for CCAvenue/UPI/cards/netbanking.

The UI advertises an extra 15% prepaid discount. A helper exists at `app/services/shopify/discount.server.ts`, but it is not currently called by `/checkout`; production behavior depends on Shopify-side automatic discount configuration until that helper is wired.

### Cash on Delivery Orders

1. Customer chooses COD on `/checkout`.
2. Server validates required fields and pincode/city/state consistency.
3. `createCodOrder()` creates a Shopify draft order through Admin GraphQL.
4. The draft order is completed with `paymentPending: true`.
5. A confirmation email is dispatched through Gmail SMTP.
6. Cart lines are removed.
7. Customer is redirected to `/thank-you?payment=cod&order=...`.

## Customer Accounts

The active account UX is passwordless OTP:

1. `/account/login` sends a 6-digit code by email.
2. The code is stored only as a SHA-256 hash in the signed `__session` cookie.
3. Codes expire after 10 minutes, have a 60-second resend cooldown, and allow 5 attempts.
4. After verification, the session stores `customerEmail`.
5. Customer records, profile fields, addresses, newsletter state, and order history are read or updated through Shopify Admin GraphQL.

Legacy Shopify Customer Account API scaffolding still exists in `account.authorize.tsx` and related GraphQL documents, but the visible storefront account path is OTP-first.

## Catalog Architecture

The storefront must preserve the 10 parent collection model:

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

Do not recreate the old flat subcollection structure. Size, shape, print, and product subtype distinctions belong in Shopify product data, variants, options, or filters.

## Private Admin Boundary

All catalog writes and Admin API scripts belong in:

```text
../monts-admin/
```

The storefront `.gitignore` intentionally excludes:

```text
.env
scripts/
assets/
*.csv
```

This prevents Admin credentials, raw CSVs, and ingestion scripts from entering the public storefront repository.

## Verification Checklist

Before deploying storefront changes:

```bash
npm run typecheck
npm run build
```

For catalog/admin verification, work in `../monts-admin` and prefer read-only inspection first:

```bash
cd ../monts-admin
npm run inspect
```

Only run sync or publish commands when you intentionally want to mutate Shopify data.

## Preserve These Rules

- Do not commit `.env` files.
- Do not move Admin scripts or raw CSVs back into `monts-hydrogen`.
- Do not bypass `codOrder.server.ts` for COD orders.
- Do not statically import Nodemailer at module top level.
- Do not recreate the old 39 flat collections.
- Do not send raw S3 image URLs directly to Shopify media creation; normalize through CloudFront first in `../monts-admin`.
- Do not remove the preserved wholesale form comments unless the merchant explicitly retires that flow.
