# 📚 MONTS Shopify Hydrogen Storefront — API Reference & Specifications

> **System**: MONTS Luxury Artisanal Storefront  
> **Framework**: Shopify Hydrogen (React Router v7 / Remix on Oxygen / Node 22)  
> **Shopify Storefront API Version**: `2025-01`  
> **Shopify Admin API Version**: `2025-01`  
> **Document Status**: Production-Ready  

---

## 📑 Table of Contents

1. [Architectural Overview & API Topology](#1-architectural-overview--api-topology)
2. [Authentication, Sessions & Security](#2-authentication-sessions--security)
3. [Layer 1: Storefront Application HTTP APIs (Route Loaders & Actions)](#3-layer-1-storefront-application-http-apis-route-loaders--actions)
   - [Cart Lifecycle APIs (`POST /cart`, `GET /cart`)](#31-cart-lifecycle-apis)
   - [Checkout Handoff APIs (`POST /checkout`, `GET /checkout`)](#32-checkout-handoff-apis)
   - [Passwordless OTP Authentication (`POST /account/login`, `GET /account/login`)](#33-passwordless-otp-authentication)
   - [Customer Account APIs (`GET /account`, `GET /account/orders/:id`)](#34-customer-account-apis)
   - [Customer Session & OAuth (`GET /account/authorize`, `POST|GET /account/logout`)](#35-customer-session--oauth-apis)
   - [Catalog & Product Route APIs (`/`, `/collections`, `/collections/:handle`, `/products/:handle`, `/search`)](#36-catalog--product-route-apis)
   - [Content & Policy APIs (`/pages/:handle`, `/policies/:handle`, `/order/success`, `/thank-you`)](#37-content--policy-apis)
   - [SEO & Crawling APIs (`/sitemap.xml`, `/robots.txt`)](#38-seo--crawling-apis)
4. [Layer 2: Shopify Storefront GraphQL Operations](#4-layer-2-shopify-storefront-graphql-operations)
   - [Catalog Queries (`Homepage`, `Collections`, `AllProducts`, `CollectionByHandle`, `ProductByHandle`, `RecommendedProducts`, `SearchProducts`)](#41-catalog-queries)
   - [Cart Mutations (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cartBuyerIdentityUpdate`)](#42-cart-mutations)
   - [Customer Account Storefront Operations](#43-customer-account-storefront-operations)
5. [Layer 3: Shopify Admin GraphQL Operations (Server Services)](#5-layer-3-shopify-admin-graphql-operations-server-services)
   - [Admin Token Exchange (`/admin/oauth/access_token`)](#51-admin-token-exchange)
   - [Admin Customer Operations (`searchCustomer`, `adminCustomerCreate`, `getAdminCustomerWithOrders`, `getAdminCustomerProfileOnly`)](#52-admin-customer-operations)
6. [Layer 4: Email & Notification Services](#6-layer-4-email--notification-services)
   - [Resend Email API (`POST https://api.resend.com/emails`)](#61-resend-email-api)
   - [Google SMTP Service (Nodemailer)](#62-google-smtp-service)
7. [Master API Reference Matrix](#7-master-api-reference-matrix)

---

## 1. Architectural Overview & API Topology

The MONTS storefront operates on a layered API architecture designed for high edge performance, sub-second caching, and complete type safety:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Client (Browser / PWA)                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP Requests (GET / POST)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Layer 1: Storefront Application Server (Remix / Oxygen)        │
│    • Route Loaders (SSR Data Fetching)                                      │
│    • Route Actions (Form Mutations, Cart Ops, OTP Engine)                   │
│    • In-Memory Cookie Session Store (__session)                             │
└──────────────┬───────────────────────┬─────────────────────────┬────────────┘
               │                       │                         │
      Storefront GraphQL       Admin API GraphQL        External HTTP / SMTP
               │                       │                         │
               ▼                       ▼                         ▼
┌────────────────────────┐  ┌────────────────────┐   ┌────────────────────────┐
│ Layer 2: Shopify       │  │ Layer 3: Shopify   │   │ Layer 4: Email Services│
│ Storefront API         │  │ Admin API          │   │                        │
│ • Catalog & Search     │  │ • Customer Sync    │   │ • Resend HTTP API      │
│ • Cart & Buyer Identity│  │ • Order Profiles   │   │ • Google SMTP Relay    │
│ • Checkout URLs        │  │ • Dynamic Auth     │   │ • Local Dev Logger     │
└────────────────────────┘  └────────────────────┘   └────────────────────────┘
```

---

## 2. Authentication, Sessions & Security

### 2.1 Session Storage: `__session`
- **Cookie Name**: `__session`
- **Security Flags**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production).
- **Session Keys**:
  - `cartId`: Authoritative Shopify Cart GID (`gid://shopify/Cart/...`).
  - `customerEmail`: Verified email address of the authenticated customer.
  - `customerAccessToken`: Shopify Storefront Customer Access Token (optional / legacy).
  - `otpData`: Transient cryptographic state for passwordless login challenge:
    ```typescript
    interface OtpSessionData {
      email: string;
      codeHash: string;      // SHA-256(code:email:SESSION_SECRET)
      expiresAt: number;     // 10 minutes from dispatch
      sentAt: number;        // Epoch ms (for 60s cooldown)
      attempts: number;      // Max 5 attempts allowed
      used?: boolean;        // Replay attack prevention
    }
    ```

### 2.2 Security Controls
- **Timing-Safe OTP Validation**: SHA-256 HMAC derivation with non-enumerable session hashes.
- **Brute-Force Rate Limiting**: Maximum 5 attempts per challenge, enforced 60-second cooldown between resend requests.
- **IDOR Protection**: Customer order routes (`/account/orders/:id`, `/order/success`) strictly enforce ownership verification against the authenticated profile.
- **Open Redirect Protection**: `sanitizeRedirect()` validates all `return_to` URLs to ensure navigation stays within the storefront domain.

---

## 3. Layer 1: Storefront Application HTTP APIs (Route Loaders & Actions)

### 3.1 Cart Lifecycle APIs

#### `POST /cart` — Cart Item Mutation Action
Handles all asynchronous mutations on the customer's cart (add items, update quantities, remove line items).

- **Method**: `POST`
- **URL**: `/cart`
- **Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`
- **Headers**:
  ```http
  Cookie: __session=...
  Content-Type: application/x-www-form-urlencoded
  ```

##### Request Body Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cartFormInput` | `string` (JSON) | Yes | Serialized JSON object detailing the action and its inputs. |

##### `cartFormInput` Schemas

**1. LinesAdd (Add Item to Cart)**
```json
{
  "action": "LinesAdd",
  "inputs": {
    "lines": [
      {
        "merchandiseId": "gid://shopify/ProductVariant/47260580970725",
        "quantity": 1
      }
    ]
  }
}
```

**2. LinesUpdate (Modify Line Item Quantity)**
```json
{
  "action": "LinesUpdate",
  "inputs": {
    "lines": [
      {
        "id": "gid://shopify/CartLine/6618d3e9-74d1-4171-8bc6-559d81dce2ec?cart=hWNG5jR9HVx",
        "quantity": 3
      }
    ]
  }
}
```

**3. LinesRemove (Remove Item from Cart)**
```json
{
  "action": "LinesRemove",
  "inputs": {
    "lineIds": [
      "gid://shopify/CartLine/6618d3e9-74d1-4171-8bc6-559d81dce2ec?cart=hWNG5jR9HVx"
    ]
  }
}
```

##### Success Response (`200 OK`)
```json
{
  "cart": {
    "id": "gid://shopify/Cart/hWNG5jR9HVx89P0v2Q1s7Y",
    "checkoutUrl": "https://47751d.myshopify.com/checkouts/c/hWNG5jR9HVx89P0v2Q1s7Y",
    "totalQuantity": 3,
    "cost": {
      "totalAmount": { "amount": "360.0", "currencyCode": "INR" },
      "subtotalAmount": { "amount": "360.0", "currencyCode": "INR" },
      "totalTaxAmount": null,
      "totalDutyAmount": null
    },
    "lines": {
      "nodes": [
        {
          "id": "gid://shopify/CartLine/6618d3e9-74d1-4171-8bc6-559d81dce2ec?cart=hWNG5jR9HVx",
          "quantity": 3,
          "cost": {
            "totalAmount": { "amount": "360.0", "currencyCode": "INR" }
          },
          "merchandise": {
            "id": "gid://shopify/ProductVariant/47260580970725",
            "title": "Default Title",
            "price": { "amount": "120.0", "currencyCode": "INR" },
            "product": {
              "title": "Small Blue Floral Tote And Pouch Combo",
              "handle": "small-blue-floral-tote-and-pouch-combo"
            }
          }
        }
      ]
    }
  },
  "userErrors": []
}
```
**Response Headers**:
```http
Set-Cookie: __session=...; Path=/; HttpOnly; SameSite=Lax
```

##### Error Responses
- **`400 Bad Request`**: Missing payload or invalid action.
  ```json
  { "error": "Invalid cart input" }
  ```
  ```json
  { "error": "Unknown cart action" }
  ```
- **`500 Internal Server Error`**:
  ```json
  { "error": "Cart operation failed" }
  ```

---

#### `GET /cart` — Cart Loader
Fetches the current customer's cart state from the session.

- **Method**: `GET`
- **URL**: `/cart`
- **Headers**: `Cookie: __session=...`

##### Success Response (`200 OK`)
```json
{
  "cart": {
    "id": "gid://shopify/Cart/hWNG5jR9HVx89P0v2Q1s7Y",
    "checkoutUrl": "https://47751d.myshopify.com/checkouts/c/hWNG5jR9HVx89P0v2Q1s7Y",
    "totalQuantity": 2,
    "cost": {
      "subtotalAmount": { "amount": "240.0", "currencyCode": "INR" },
      "totalAmount": { "amount": "240.0", "currencyCode": "INR" }
    },
    "lines": {
      "nodes": [
        {
          "id": "gid://shopify/CartLine/...",
          "quantity": 2,
          "merchandise": {
            "id": "gid://shopify/ProductVariant/47260580970725",
            "title": "Default Title",
            "price": { "amount": "120.0", "currencyCode": "INR" }
          }
        }
      ]
    }
  }
}
```

---

### 3.2 Checkout Handoff APIs

#### `POST /checkout` — Delivery Address & Checkout Action
Validates the delivery address, updates the Shopify Cart Buyer Identity, and redirects to the Shopify Hosted Checkout (CCAvenue gateway integration).

- **Method**: `POST`
- **URL**: `/checkout`
- **Content-Type**: `application/x-www-form-urlencoded`

##### Request Form Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | Customer's email address |
| `firstName` | `string` | Yes | First name of recipient |
| `lastName` | `string` | Yes | Last name / surname |
| `phone` | `string` | Yes | Mobile number for order SMS/WhatsApp updates |
| `address1` | `string` | Yes | Street address, flat/house number |
| `address2` | `string` | No | Apartment, suite, unit, landmark |
| `city` | `string` | Yes | City / town |
| `province` | `string` | Yes | State / province (e.g., `Rajasthan`, `Maharashtra`) |
| `zip` | `string` | Yes | PIN / Postal code |

##### Success Response (`302 Found` / Redirect)
```http
HTTP/1.1 302 Found
Location: https://47751d.myshopify.com/checkouts/c/hWNG5jR9HVx89P0v2Q1s7Y
```

##### Error Responses
- **`400 Bad Request`**: Missing required fields.
  ```json
  { "error": "Please fill in all required contact and delivery address fields." }
  ```
- **`500 Internal Server Error`**:
  ```json
  { "error": "Unable to initialize payment gateway. Please try again." }
  ```

---

#### `GET /checkout` — Checkout Loader
Pre-populates delivery fields if the customer is logged in, and validates that the cart is not empty.

- **Method**: `GET`
- **URL**: `/checkout`

##### Success Response (`200 OK`)
```json
{
  "cart": {
    "id": "gid://shopify/Cart/hWNG5jR9HVx89P0v2Q1s7Y",
    "totalQuantity": 1,
    "checkoutUrl": "https://47751d.myshopify.com/checkouts/c/...",
    "cost": {
      "subtotalAmount": { "amount": "120.0", "currencyCode": "INR" }
    }
  },
  "customer": {
    "id": "gid://shopify/Customer/7123984128",
    "firstName": "Abhinav",
    "lastName": "Sharma",
    "email": "customer@example.com",
    "phone": "+919876543210",
    "defaultAddress": {
      "id": "gid://shopify/MailingAddress/...",
      "address1": "42 Civil Lines",
      "city": "Jaipur",
      "province": "Rajasthan",
      "zip": "302006",
      "country": "India"
    }
  }
}
```

##### Redirect Behavior
- If cart is empty (`totalQuantity === 0` or `null`), redirects with `302 Found` to `/cart`.

---

### 3.3 Passwordless OTP Authentication

#### `POST /account/login` — OTP Dispatch & Verification Action
Manages the complete lifecycle of passwordless login: sending OTP, verifying OTP, and resetting input.

- **Method**: `POST`
- **URL**: `/account/login`
- **Content-Type**: `application/x-www-form-urlencoded`

---

#### Flow A: Dispatch OTP (`intent = 'send_otp'`)

##### Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `intent` | `string` | Yes | Constant value: `"send_otp"` |
| `email` | `string` | Yes | Customer's email address |
| `return_to` | `string` | No | Post-login redirect path (default: `/account`) |

##### Success Response (`200 OK`)
```json
{
  "step": "verify",
  "email": "abhinav@example.com",
  "successMessage": "A 6-digit verification code has been sent to abhinav@example.com. Check your inbox."
}
```
**Response Headers**:
```http
Set-Cookie: __session=...; Path=/; HttpOnly; SameSite=Lax
```

##### Error Responses
- **`400 Bad Request`**: Invalid email.
  ```json
  {
    "error": "Please enter a valid email address.",
    "step": "email"
  }
  ```
- **`429 Too Many Requests`**: Rate limit active (60-second cooldown).
  ```json
  {
    "error": "Please wait 42s before requesting a new code.",
    "step": "verify",
    "email": "abhinav@example.com"
  }
  ```
- **`500 Internal Server Error`**: Delivery provider failure.
  ```json
  {
    "error": "Could not deliver OTP email: SMTP connection timeout. Please try again.",
    "step": "email"
  }
  ```

---

#### Flow B: Verify OTP (`intent = 'verify_otp'`)

##### Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `intent` | `string` | Yes | Constant value: `"verify_otp"` |
| `email` | `string` | Yes | The email address being verified |
| `otp` | `string` | Yes | 6-digit numeric verification code (e.g., `"742918"`) |
| `return_to` | `string` | No | Post-login redirect destination |

##### Success Response (`302 Found` / Redirect)
```http
HTTP/1.1 302 Found
Location: /account
Set-Cookie: __session=...; Path=/; HttpOnly; SameSite=Lax
```
*(On successful OTP match, the server automatically syncs or creates the customer profile in Shopify Admin without passwords).*

##### Error Responses
- **`400 Bad Request`**: Incorrect code.
  ```json
  {
    "error": "Incorrect code. 4 attempts remaining.",
    "step": "verify",
    "email": "abhinav@example.com"
  }
  ```
- **`400 Bad Request`**: Expired code or uninitialized challenge.
  ```json
  {
    "error": "Your code has expired. Please request a new one.",
    "step": "email"
  }
  ```
- **`429 Too Many Requests`**: Exhausted all 5 attempts.
  ```json
  {
    "error": "Too many incorrect attempts. Please request a new code.",
    "step": "email"
  }
  ```

---

#### Flow C: Reset Challenge (`intent = 'reset_email'`)
Allows the customer to change their entered email address.

##### Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `intent` | `string` | Yes | Constant value: `"reset_email"` |

##### Success Response (`200 OK`)
```json
{
  "step": "email"
}
```

---

#### `GET /account/login` — Login Loader
- **Method**: `GET`
- **URL**: `/account/login?return_to=/checkout`

##### Success Response (`200 OK`)
```json
{
  "returnTo": "/checkout",
  "hasActiveOtp": false,
  "activeEmail": ""
}
```
##### Redirect Behavior
- If `customerEmail` is present in session, immediately redirects (`302`) to `returnTo` (or `/account`).

---

### 3.4 Customer Account APIs

#### `GET /account` — Protected Customer Profile Dashboard Loader
- **Method**: `GET`
- **URL**: `/account`
- **Authentication**: Requires valid `customerEmail` session cookie.

##### Success Response (`200 OK`)
```json
{
  "customerEmail": "customer@example.com",
  "customer": {
    "id": "gid://shopify/Customer/7123984128",
    "firstName": "Abhinav",
    "lastName": "Sharma",
    "email": "customer@example.com",
    "phone": "+919876543210",
    "numberOfOrders": 2,
    "defaultAddress": {
      "id": "gid://shopify/MailingAddress/82736192",
      "address1": "42 Civil Lines",
      "address2": "Floor 2",
      "city": "Jaipur",
      "province": "Rajasthan",
      "zip": "302006",
      "country": "India",
      "phone": "+919876543210"
    },
    "addresses": {
      "nodes": [
        {
          "id": "gid://shopify/MailingAddress/82736192",
          "address1": "42 Civil Lines",
          "city": "Jaipur",
          "province": "Rajasthan",
          "zip": "302006",
          "country": "India"
        }
      ]
    },
    "orders": {
      "nodes": [
        {
          "id": "gid://shopify/Order/5982749120",
          "name": "#1002",
          "orderNumber": "1002",
          "processedAt": "2026-08-20T10:15:30Z",
          "financialStatus": "PAID",
          "fulfillmentStatus": "UNFULFILLED",
          "totalPrice": {
            "amount": "1490.0",
            "currencyCode": "INR"
          },
          "lineItems": {
            "nodes": [
              {
                "title": "Small Blue Floral Tote And Pouch Combo",
                "quantity": 1,
                "variant": {
                  "title": "Default Title",
                  "price": { "amount": "1490.0", "currencyCode": "INR" },
                  "image": {
                    "url": "https://cdn.shopify.com/s/files/1/0879/2928/2853/files/tote-combo.jpg",
                    "altText": "Tote Bag"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

##### Redirect Behavior
- If unauthenticated, redirects (`302`) to `/account/login?return_to=/account`.

---

#### `GET /account/orders/:id` — Single Order Detail Loader
Retrieves an individual order with strict verification that the order belongs to the requesting customer.

- **Method**: `GET`
- **URL**: `/account/orders/:id` (e.g. `/account/orders/1002`)
- **Authentication**: Requires authenticated session.

##### Success Response (`200 OK`)
```json
{
  "order": {
    "id": "gid://shopify/Order/5982749120",
    "name": "#1002",
    "orderNumber": "1002",
    "processedAt": "2026-08-20T10:15:30Z",
    "financialStatus": "PAID",
    "fulfillmentStatus": "FULFILLED",
    "totalPrice": { "amount": "1490.0", "currencyCode": "INR" },
    "statusUrl": "https://47751d.myshopify.com/orders/5982749120/authenticate?key=...",
    "lineItems": {
      "nodes": [
        {
          "title": "Small Blue Floral Tote And Pouch Combo",
          "quantity": 1,
          "variant": {
            "title": "Default Title",
            "price": { "amount": "1490.0", "currencyCode": "INR" }
          }
        }
      ]
    }
  },
  "customer": { "firstName": "Abhinav", "email": "customer@example.com" }
}
```

##### Error Responses
- **`404 Not Found`**: Order ID not found or customer is not the owner.
  ```json
  { "message": "Order Not Found" }
  ```

---

### 3.5 Customer Session & OAuth APIs

#### `GET /account/authorize` — Customer Account OAuth Callback Loader
Used when logging in via Shopify Headless Customer Account API (OAuth exchange).

- **Method**: `GET`
- **URL**: `/account/authorize`
- **Query Params**: Standard OAuth 2.0 query string from Shopify (`code`, `state`).
- **Response**: `302 Found` with redirect to the original destination (`return_to` or `/account`) and updated session headers.

---

#### `POST` / `GET /account/logout` — Customer Logout
Revokes the customer token in Shopify, invalidates all session credentials (`customerEmail`, `customerAccessToken`, `otpData`), and returns the user to the login screen.

- **Method**: `POST` or `GET`
- **URL**: `/account/logout`
- **Response**:
  ```http
  HTTP/1.1 302 Found
  Location: /account/login
  Set-Cookie: __session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly
  ```

---

### 3.6 Catalog & Product Route APIs

#### `GET /` — Homepage Data Loader
Fetches hero collections, best-selling products, and latest releases in a single subrequest.

- **Method**: `GET`
- **URL**: `/`
- **Subrequest Cache**: `CacheLong` (`public, max-age=3600, stale-while-revalidate=86400`)

##### Success Response (`200 OK`)
```json
{
  "baseUrl": "https://monts.in",
  "shop": {
    "name": "MONTS",
    "description": "Artisanal Handcrafted Storefront"
  },
  "collections": [
    {
      "id": "gid://shopify/Collection/474149060901",
      "title": "Wallet",
      "handle": "wallet",
      "description": "Artisanal wallets handcrafted with precision.",
      "image": null
    }
  ],
  "featuredProducts": [
    {
      "id": "gid://shopify/Product/884577884605",
      "title": "Small Blue Floral Tote And Pouch Combo",
      "handle": "small-blue-floral-tote-and-pouch-combo",
      "vendor": "MONTS",
      "featuredImage": {
        "id": "gid://shopify/ProductImage/428912",
        "url": "https://cdn.shopify.com/s/files/...",
        "altText": "Combo",
        "width": 1080,
        "height": 1080
      },
      "priceRange": {
        "minVariantPrice": { "amount": "120.0", "currencyCode": "INR" },
        "maxVariantPrice": { "amount": "120.0", "currencyCode": "INR" }
      },
      "compareAtPriceRange": {
        "minVariantPrice": { "amount": "0.0", "currencyCode": "INR" },
        "maxVariantPrice": { "amount": "0.0", "currencyCode": "INR" }
      },
      "variants": {
        "nodes": [
          {
            "id": "gid://shopify/ProductVariant/47260580970725",
            "title": "Default Title",
            "availableForSale": true,
            "price": { "amount": "120.0", "currencyCode": "INR" }
          }
        ]
      }
    }
  ],
  "allProducts": [...]
}
```

---

#### `GET /collections` — Collections Directory Loader
Returns all published collections.

- **Method**: `GET`
- **URL**: `/collections`
- **Subrequest Cache**: `CacheLong`

##### Success Response (`200 OK`)
```json
{
  "collections": [
    {
      "id": "gid://shopify/Collection/474149060901",
      "title": "Wallet",
      "handle": "wallet",
      "description": "Artisanal wallets handcrafted with precision.",
      "image": null
    }
  ]
}
```

---

#### `GET /collections/:handle` — Collection Detail Loader
Retrieves products for a specific collection or the virtual `/collections/all` catalog. Supports sorting and pagination.

- **Method**: `GET`
- **URL**: `/collections/:handle`
- **Query Parameters**:
  - `sort`: One of `best-selling` (default), `price-asc`, `price-desc`, `created-desc`, `title-asc`.

##### Success Response (`200 OK`)
```json
{
  "collection": {
    "id": "gid://shopify/Collection/474149060901",
    "title": "Wallet",
    "handle": "wallet",
    "description": "Handcrafted minimalist wallets."
  },
  "products": [
    {
      "id": "gid://shopify/Product/884577884605",
      "title": "Small Blue Floral Tote And Pouch Combo",
      "handle": "small-blue-floral-tote-and-pouch-combo",
      "priceRange": {
        "minVariantPrice": { "amount": "120.0", "currencyCode": "INR" }
      }
    }
  ],
  "currentSort": "best-selling",
  "canonicalUrl": "https://monts.in/collections/wallet"
}
```

##### Error Responses
- **`404 Not Found`**: When collection does not exist.

---

#### `GET /products/:handle` — Product Detail Page Loader
Retrieves full details for a product, its variants, media gallery, and paired recommendations.

- **Method**: `GET`
- **URL**: `/products/:handle` (e.g. `/products/small-blue-floral-tote-and-pouch-combo`)

##### Success Response (`200 OK`)
```json
{
  "product": {
    "id": "gid://shopify/Product/884577884605",
    "title": "Small Blue Floral Tote And Pouch Combo",
    "handle": "small-blue-floral-tote-and-pouch-combo",
    "vendor": "MONTS",
    "description": "Handmade with 100% pure organic cotton.",
    "descriptionHtml": "<p>Handmade with 100% pure organic cotton.</p>",
    "tags": ["cotton", "tote", "floral"],
    "options": [
      {
        "name": "Title",
        "values": ["Default Title"]
      }
    ],
    "featuredImage": {
      "id": "gid://shopify/ProductImage/428912",
      "url": "https://cdn.shopify.com/s/files/...",
      "altText": "Front View",
      "width": 1080,
      "height": 1080
    },
    "media": {
      "nodes": [
        {
          "id": "gid://shopify/MediaImage/987123",
          "mediaContentType": "IMAGE",
          "image": {
            "url": "https://cdn.shopify.com/s/files/...",
            "altText": "Front View"
          }
        }
      ]
    },
    "priceRange": {
      "minVariantPrice": { "amount": "120.0", "currencyCode": "INR" }
    },
    "compareAtPriceRange": {
      "minVariantPrice": { "amount": "0.0", "currencyCode": "INR" }
    },
    "variants": {
      "nodes": [
        {
          "id": "gid://shopify/ProductVariant/47260580970725",
          "title": "Default Title",
          "availableForSale": true,
          "sku": "MONTS-TOT-01",
          "price": { "amount": "120.0", "currencyCode": "INR" },
          "compareAtPrice": null,
          "selectedOptions": [
            { "name": "Title", "value": "Default Title" }
          ]
        }
      ]
    },
    "seo": {
      "title": "Small Blue Floral Tote | MONTS",
      "description": "Handcrafted cotton tote and pouch combo."
    }
  },
  "recommendedProducts": [],
  "canonicalUrl": "https://monts.in/products/small-blue-floral-tote-and-pouch-combo"
}
```

##### Error Responses
- **`404 Not Found`**: When the requested product handle is not found.

---

#### `GET /search` — Catalog Search Loader
Executes live search against published products.

- **Method**: `GET`
- **URL**: `/search?q=tote`

##### Success Response (`200 OK`)
```json
{
  "query": "tote",
  "totalCount": 4,
  "products": [
    {
      "id": "gid://shopify/Product/884577884605",
      "title": "Small Blue Floral Tote And Pouch Combo",
      "handle": "small-blue-floral-tote-and-pouch-combo",
      "priceRange": {
        "minVariantPrice": { "amount": "120.0", "currencyCode": "INR" }
      }
    }
  ]
}
```

---

### 3.7 Content & Policy APIs

#### `GET /pages/:handle` — Content Page Loader
Loads static Shopify pages (`about-us`, `artisans`, etc.).

- **Method**: `GET`
- **URL**: `/pages/:handle`
- **Success Response (`200 OK`)**:
  ```json
  {
    "page": {
      "id": "gid://shopify/Page/10928374",
      "title": "Artisanal Legacy",
      "handle": "artisanal-legacy",
      "body": "<div>Handcrafted in Jaipur since 2021...</div>",
      "seo": { "title": "Our Legacy", "description": "About our craft" }
    }
  }
  ```

---

#### `GET /policies/:handle` — Shop Legal Policy Loader
Resolves store legal policies dynamically.
- **Handled handles**: `privacy-policy`, `shipping-policy`, `terms-of-service`, `refund-policy`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "policy": {
      "id": "gid://shopify/ShopPolicy/PrivacyPolicy",
      "title": "Privacy Policy",
      "body": "<p>Your privacy is important to MONTS...</p>"
    }
  }
  ```

---

#### `GET /order/success` — Post-Checkout Order Confirmation Loader
Verifies order completion and presents purchase confirmation.
- **URL**: `/order/success?order_id=5982749120`
- **Authentication**: Strictly enforces ownership against `customerAccessToken`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "customer": { "id": "...", "email": "customer@example.com" },
    "order": {
      "id": "gid://shopify/Order/5982749120",
      "name": "#1002",
      "financialStatus": "PAID",
      "fulfillmentStatus": "UNFULFILLED",
      "totalPrice": { "amount": "1490.0", "currencyCode": "INR" }
    }
  }
  ```

---

#### `GET /thank-you` — Confirmation Return Loader
- **URL**: `/thank-you?order=1002`
- **Success Response (`200 OK`)**:
  ```json
  {
    "storeDomain": "47751d.myshopify.com"
  }
  ```

---

### 3.8 SEO & Crawling APIs

#### `GET /sitemap.xml` — Dynamic XML Sitemap
Generates an XML sitemap of all static pages, active collections, and visible products.

- **Method**: `GET`
- **URL**: `/sitemap.xml`
- **Headers**:
  ```http
  Content-Type: application/xml
  Cache-Control: max-age=86400
  ```
- **Response Payload**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://monts.in/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://monts.in/collections/wallet</loc>
      <lastmod>2026-08-25T14:30:00Z</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
    <url>
      <loc>https://monts.in/products/small-blue-floral-tote-and-pouch-combo</loc>
      <lastmod>2026-08-25T16:00:00Z</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
    </url>
  </urlset>
  ```

---

#### `GET /robots.txt` — Crawler Directive
- **Method**: `GET`
- **URL**: `/robots.txt`
- **Response**:
  ```text
  User-agent: *
  Disallow: /account/
  Disallow: /cart
  Disallow: /search?*
  Allow: /

  Sitemap: https://monts.in/sitemap.xml
  ```

---

## 4. Layer 2: Shopify Storefront GraphQL Operations

All Storefront API operations target:  
`POST https://{PUBLIC_STORE_DOMAIN}/api/2025-01/graphql.json`  
**Header**: `X-Shopify-Storefront-Access-Token: {PUBLIC_STOREFRONT_API_TOKEN}`

---

### 4.1 Catalog Queries

#### 1. `Homepage` (`HOMEPAGE_QUERY`)
```graphql
query Homepage(
  $country: CountryCode
  $language: LanguageCode
  $collectionsFirst: Int = 3
  $productsFirst: Int = 8
) @inContext(country: $country, language: $language) {
  shop { name description }
  collections(first: $collectionsFirst, sortKey: UPDATED_AT, reverse: true) {
    nodes { ...CollectionCardFragment }
  }
  featuredProducts: products(first: $productsFirst, sortKey: BEST_SELLING) {
    nodes { ...ProductCardFragment }
  }
  allProducts: products(first: $productsFirst, sortKey: CREATED_AT, reverse: true) {
    nodes { ...ProductCardFragment }
  }
}
```

##### Response Format
```json
{
  "data": {
    "shop": {
      "name": "MONTS",
      "description": "Artisanal Handcrafted Storefront"
    },
    "collections": {
      "nodes": [
        {
          "id": "gid://shopify/Collection/474149060901",
          "title": "Wallet",
          "handle": "wallet",
          "description": "Handcrafted minimalist wallets.",
          "image": null
        }
      ]
    },
    "featuredProducts": {
      "nodes": [
        {
          "id": "gid://shopify/Product/884577884605",
          "title": "Small Blue Floral Tote And Pouch Combo",
          "handle": "small-blue-floral-tote-and-pouch-combo",
          "vendor": "MONTS",
          "priceRange": {
            "minVariantPrice": { "amount": "120.0", "currencyCode": "INR" },
            "maxVariantPrice": { "amount": "120.0", "currencyCode": "INR" }
          }
        }
      ]
    },
    "allProducts": { "nodes": [...] }
  }
}
```

---

#### 2. `ProductByHandle` (`PRODUCT_BY_HANDLE_QUERY`)
```graphql
query ProductByHandle($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    vendor
    description
    descriptionHtml
    tags
    options { name values }
    featuredImage { url altText width height }
    media(first: 10) {
      nodes {
        ... on MediaImage {
          id
          image { url altText }
        }
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    variants(first: 50) {
      nodes {
        id
        title
        availableForSale
        sku
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
      }
    }
    seo { title description }
  }
}
```

---

#### 3. `SearchProducts` (`SEARCH_QUERY`)
```graphql
query SearchProducts($query: String!, $first: Int = 24) {
  search(query: $query, first: $first, types: [PRODUCT]) {
    totalCount
    nodes {
      ... on Product {
        id
        title
        handle
        priceRange {
          minVariantPrice { amount currencyCode }
        }
      }
    }
  }
}
```

---

### 4.2 Cart Mutations

#### 1. `CartCreate` Mutation
```graphql
mutation CartCreate {
  cartCreate {
    cart {
      id
      checkoutUrl
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}
```
##### Response Example
```json
{
  "data": {
    "cartCreate": {
      "cart": {
        "id": "gid://shopify/Cart/hWNG5jPZLp3x98",
        "checkoutUrl": "https://47751d.myshopify.com/checkouts/c/hWNG5jPZLp3x98",
        "totalQuantity": 0
      },
      "userErrors": []
    }
  }
}
```

---

#### 2. `CartLinesAdd` Mutation
```graphql
mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
      lines(first: 10) {
        nodes {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
            }
          }
        }
      }
      cost {
        subtotalAmount { amount currencyCode }
      }
    }
    userErrors { field message }
  }
}
```

---

#### 3. `CartBuyerIdentityUpdate` Mutation
```graphql
mutation CartBuyerIdentityUpdate(
  $cartId: ID!
  $buyerIdentity: CartBuyerIdentityInput!
) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
    cart {
      id
      checkoutUrl
      buyerIdentity {
        email
        phone
      }
    }
    userErrors { field message }
  }
}
```

---

## 5. Layer 3: Shopify Admin GraphQL Operations (Server Services)

Admin GraphQL API operations execute exclusively server-side via `app/services/shopify/customer.server.ts`.

---

### 5.1 Admin Token Exchange

Used when exchanging `SHOPIFY_ADMIN_CLIENT_ID` and `SHOPIFY_ADMIN_CLIENT_SECRET` for short-lived (~24h) cached admin tokens via Client Credentials Grant.

- **Endpoint**: `POST https://{PUBLIC_STORE_DOMAIN}/admin/oauth/access_token`
- **Request Body**:
  ```json
  {
    "client_id": "c198e3b78...",
    "client_secret": "shpss_91823...",
    "grant_type": "client_credentials"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "access_token": "shpat_a81239841...",
    "scope": "read_customers,write_customers,read_orders",
    "expires_in": 86400
  }
  ```

---

### 5.2 Admin Customer Operations

#### 1. Search Customer (`ADMIN_CUSTOMER_SEARCH`)
```graphql
query searchCustomer($query: String!) {
  customers(first: 1, query: $query) {
    nodes {
      id
      firstName
      lastName
      email
      phone
    }
  }
}
```
- **Variables**: `{ "query": "email:customer@example.com" }`
- **Response**:
  ```json
  {
    "data": {
      "customers": {
        "nodes": [
          {
            "id": "gid://shopify/Customer/7123984128",
            "firstName": "Abhinav",
            "lastName": "Sharma",
            "email": "customer@example.com",
            "phone": "+919876543210"
          }
        ]
      }
    }
  }
  ```

---

#### 2. Create Passwordless Customer (`ADMIN_CUSTOMER_CREATE`)
Creates a new verified customer record in Shopify upon first-time OTP verification.

```graphql
mutation adminCustomerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer {
      id
      email
      firstName
    }
    userErrors {
      field
      message
    }
  }
}
```
- **Variables**:
  ```json
  {
    "input": {
      "email": "customer@example.com",
      "firstName": "Abhinav",
      "lastName": "Customer",
      "emailMarketingConsent": {
        "marketingState": "NOT_SUBSCRIBED",
        "marketingOptInLevel": "SINGLE_OPT_IN"
      }
    }
  }
  ```

---

#### 3. Fetch Full Profile with Orders (`ADMIN_CUSTOMER_WITH_ORDERS`)
Fetches default shipping address, secondary addresses, and up to 20 past orders.

```graphql
query getAdminCustomerWithOrders($query: String!) {
  customers(first: 1, query: $query) {
    nodes {
      id
      firstName
      lastName
      email
      phone
      numberOfOrders
      defaultAddress {
        id
        address1
        address2
        city
        province
        zip
        country
        phone
      }
      addresses {
        id
        address1
        city
        province
        zip
        country
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          lineItems(first: 10) {
            nodes {
              title
              quantity
              variant {
                title
                price
                image { url altText }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 6. Layer 4: Email & Notification Services

Used for one-click passwordless verification codes dispatched via `app/services/email/dispatcher.server.ts`.

### 6.1 Resend Email API
- **Endpoint**: `POST https://api.resend.com/emails`
- **Authorization**: `Bearer {RESEND_API_KEY}`
- **Payload**:
  ```json
  {
    "from": "MONTS <onboarding@resend.dev>",
    "to": ["customer@example.com"],
    "subject": "742918 is your MONTS Verification Code",
    "html": "<!DOCTYPE html><html>...</html>"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  { "id": "49a3999c-0ce1-4ea6-ab68-af69fced79ad" }
  ```

### 6.2 Google SMTP Service
- **Transport**: `nodemailer`
- **Host**: `smtp.gmail.com:465` (SSL)
- **Auth**: App Password (`SMTP_USER`, `SMTP_PASS`)
- **Sender**: `MONTS <orders@monts.in>`

---

## 7. Master API Reference Matrix

| Route / Endpoint | Protocol / Type | Auth Required | Purpose | Primary Responses |
| :--- | :--- | :--- | :--- | :--- |
| `POST /cart` | HTTP Action | Cookie Session | Add/update/remove cart line items | `200 OK` (Cart), `400 Bad Request` |
| `GET /cart` | HTTP Loader | Cookie Session | Retrieve active cart | `200 OK` (Cart) |
| `POST /checkout` | HTTP Action | No | Save delivery prefs & jump to checkout | `302 Redirect` to Hosted Checkout, `400` |
| `GET /checkout` | HTTP Loader | No | Pre-populate customer details | `200 OK` (Cart + Profile), `302` (if empty) |
| `POST /account/login` | HTTP Action | Session (OTP) | Dispatch / verify 6-digit OTP | `200 OK` (Step), `302` (Verified), `429` |
| `GET /account/login` | HTTP Loader | Public | Check auth status / redirect if logged in | `200 OK`, `302` (if logged in) |
| `GET /account` | HTTP Loader | Session (`customerEmail`) | Customer dashboard & past orders | `200 OK` (Profile + Orders), `302` (Login) |
| `GET /account/orders/:id` | HTTP Loader | Session (`customerAccessToken`) | Single order tracking | `200 OK`, `404 Not Found` |
| `GET /account/authorize` | HTTP Loader | OAuth 2.0 | Complete Shopify Customer Account OAuth | `302 Found` (Cookie handoff) |
| `POST /account/logout` | HTTP Action | Session | Invalidate session & Shopify token | `302 Redirect` to `/account/login` |
| `GET /` | HTTP Loader | Public | Homepage products & collections | `200 OK` (Hero, Carousels) |
| `GET /collections` | HTTP Loader | Public | Collections directory | `200 OK` (All Collections) |
| `GET /collections/:handle` | HTTP Loader | Public | Collection products & sorting | `200 OK` (Products), `404 Not Found` |
| `GET /products/:handle` | HTTP Loader | Public | Product detail & recommendations | `200 OK` (PDP), `404 Not Found` |
| `GET /search` | HTTP Loader | Public | Live product search | `200 OK` (Search Results) |
| `GET /pages/:handle` | HTTP Loader | Public | Static CMS page body | `200 OK`, `404 Not Found` |
| `GET /policies/:handle` | HTTP Loader | Public | Legal policy text | `200 OK`, `404 Not Found` |
| `GET /order/success` | HTTP Loader | Session | Order confirmation after payment | `200 OK` (Order Details) |
| `GET /thank-you` | HTTP Loader | Public | Thank you confirmation screen | `200 OK` |
| `GET /sitemap.xml` | HTTP Loader | Public | XML search engine index | `200 OK` (`application/xml`) |
| `GET /robots.txt` | HTTP Loader | Public | Crawler instructions | `200 OK` (`text/plain`) |
| Storefront API | GraphQL | Public Token | Catalog, recommendations, cart mutations | `200 OK` (GraphQL JSON) |
| Admin API | GraphQL | Server Token | Passwordless customer create & full sync | `200 OK` (Admin JSON) |
