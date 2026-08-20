# MONTS Storefront — Shopify Hydrogen (Remix + Oxygen)

This repository contains the production-grade **Shopify Hydrogen** storefront for **MONTS**, powered by Remix, Tailwind CSS v4, and deployed to Shopify Oxygen.

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

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
cd monts-hydrogen
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and provide your Shopify Storefront credentials:
```env
SESSION_SECRET="your_secure_session_secret_key"
PUBLIC_STOREFRONT_API_TOKEN="your_public_storefront_token"
PRIVATE_STOREFRONT_API_TOKEN="your_private_storefront_token"
PUBLIC_STORE_DOMAIN="47751d.myshopify.com"
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID="your_customer_account_client_id"
PUBLIC_CUSTOMER_ACCOUNT_API_URL="https://shopify.com/47751d/auth"
```

### 3. Run Local Edge Development Server
```bash
npm run dev
```
The application will boot on `http://localhost:3000` running within the Oxygen edge worker emulator (`@shopify/mini-oxygen`).

> **Note**: For GraphQL schema code generation, you can run `npm run codegen` after installing `@graphql-codegen/cli` if type generation is desired.

---

## 🏗️ Production Build & Verification

```bash
# Typecheck
npm run typecheck

# Build for Oxygen Edge
npm run build

# Preview Production Build locally
npm run preview
```

---

## 🌐 Deployment to Shopify Oxygen

1. In your **Shopify Admin**, navigate to:
   **Sales Channels** > **Headless** > **Storefronts**.
2. Click **Create storefront** (or select your existing storefront).
3. Connect your GitHub repository and point to the `monts-hydrogen` folder / repository.
4. Under **Storefront Settings** > **Environment Variables**, add:
   - `SESSION_SECRET` (Encrypted)
   - `PUBLIC_STOREFRONT_API_TOKEN`
   - `PRIVATE_STOREFRONT_API_TOKEN` (Encrypted)
   - `PUBLIC_STORE_DOMAIN`
   - `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`
   - `PUBLIC_CUSTOMER_ACCOUNT_API_URL`
5. Deployments will trigger automatically on git push with instant edge CDN distribution.

---

## 📁 Project Architecture

```
monts-hydrogen/
├── app/
│   ├── components/
│   │   ├── cart/         # CartDrawer, CartItem
│   │   ├── common/       # Header, Footer, AnnouncementBar, MobileNav, Navigation
│   │   ├── products/     # ProductCard (1:1 square), ProductGrid
│   │   └── ui/           # Button, Badge, Input, Breadcrumb, Skeleton, EmptyState, Tabs, Accordion, Modal
│   ├── graphql/          # StorefrontFragments.ts, StorefrontQueries.ts, CustomerAccountQueries.ts
│   ├── routes/           # Remix file-based routes
│   │   ├── _index.tsx            # Homepage
│   │   ├── collections._index.tsx # All collections
│   │   ├── collections.$handle.tsx# Collection detail & products
│   │   ├── products.$handle.tsx   # PDP (5/8 gallery, purchase column, accordions)
│   │   ├── cart.tsx               # Server cart actions & cart page
│   │   ├── search.tsx             # Catalog search
│   │   ├── about.tsx              # Brand story
│   │   ├── contact.tsx            # Concierge & contact form
│   │   ├── wholesale.tsx          # B2B application
│   │   ├── faq.tsx                # Accordion FAQ
│   │   ├── [sitemap.xml].tsx      # Dynamic edge sitemap
│   │   ├── robots[.]txt.tsx       # Dynamic robots.txt
│   │   ├── account.login.tsx      # OAuth login
│   │   ├── account.authorize.tsx  # OAuth callback
│   │   ├── account.logout.tsx     # OAuth logout
│   │   ├── account._index.tsx     # Protected customer dashboard
│   │   └── $.tsx                  # 404 Catch-all
│   ├── styles/
│   │   └── app.css       # Tailwind v4 & Pipeline design tokens
│   ├── entry.client.tsx  # Hydration client
│   ├── entry.server.tsx  # Streaming SSR edge handler
│   ├── root.tsx          # HTML shell & global layout
│   └── server.ts         # Oxygen worker entrypoint
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Scope & Architecture Boundary

- **In Scope (Completed)**: Full edge SSR, file-based routing, edge subrequest caching, Pipeline design system, server-managed cart sessions, Shopify Customer Account API (OAuth), dynamic sitemaps, and JSON-LD structured data.
- **Post-Migration (Out of Scope)**: Subscriptions, CCAvenue payment gateway, Shopify Checkout UI extensions, Cash on Delivery (COD), 15% prepaid discounts, custom shipping/GST logic, and Headless CMS integrations.
