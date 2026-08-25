/**
 * Comprehensive API Test Suite for MONTS Shopify Hydrogen Storefront
 * Tests all Storefront API queries, mutations, cart lifecycle, and catalog access.
 */

import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';

// Helper to load .env if process.env values are not set
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...rest] = trimmed.split('=');
          const val = rest.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

loadEnv();

const domain = process.env.PUBLIC_STORE_DOMAIN || '47751d.myshopify.com';
const apiVersion = process.env.PUBLIC_STOREFRONT_API_VERSION || '2025-01';
const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;
const token = process.env.PUBLIC_STOREFRONT_API_TOKEN;

if (!token) {
  console.error('❌ Error: PUBLIC_STOREFRONT_API_TOKEN is missing in environment/.env');
  process.exit(1);
}

// Core Fragments
const MONEY_FRAGMENT = `
  fragment MoneyFragment on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE_FRAGMENT = `
  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCardFragment on Product {
    id
    title
    handle
    vendor
    publishedAt
    featuredImage {
      ...ImageFragment
    }
    images(first: 2) {
      nodes {
        ...ImageFragment
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        price {
          ...MoneyFragment
        }
        compareAtPrice {
          ...MoneyFragment
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

const COLLECTION_CARD_FRAGMENT = `
  fragment CollectionCardFragment on Collection {
    id
    title
    handle
    description
    image {
      ...ImageFragment
    }
  }
`;

const PRODUCT_DETAIL_FRAGMENT = `
  fragment ProductDetailFragment on Product {
    id
    title
    handle
    vendor
    description
    descriptionHtml
    tags
    options {
      name
      values
    }
    featuredImage {
      ...ImageFragment
    }
    media(first: 10) {
      nodes {
        ... on MediaImage {
          id
          mediaContentType
          image {
            ...ImageFragment
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFragment
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFragment
      }
    }
    variants(first: 50) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        image {
          ...ImageFragment
        }
        price {
          ...MoneyFragment
        }
        compareAtPrice {
          ...MoneyFragment
        }
        unitPrice {
          ...MoneyFragment
        }
        sku
      }
    }
    seo {
      title
      description
    }
  }
`;

async function storefrontFetch(query, variables = {}) {
  const start = performance.now();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const durationMs = Math.round(performance.now() - start);
  const json = await res.json();
  return { status: res.status, json, durationMs };
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🛍️  MONTS SHOPIFY HYDROGEN: COMPREHENSIVE API TEST SUITE');
  console.log(`🌐 Endpoint: ${endpoint}`);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;
  let sampleProduct = null;
  let sampleCollection = null;
  let testCartId = null;
  let testLineId = null;
  let sampleVariantId = null;

  async function test(name, testFn) {
    process.stdout.write(`⏳ Testing: ${name.padEnd(45, ' ')} `);
    try {
      const details = await testFn();
      passed++;
      console.log(`✅ PASSED (${details.durationMs}ms)`);
      if (details.note) {
        console.log(`   └─ ℹ️  ${details.note}`);
      }
    } catch (err) {
      failed++;
      console.log(`❌ FAILED`);
      console.log(`   └─ 🚨 Error: ${err.message}`);
    }
  }

  // 1. Basic Shop Info
  await test('Storefront Connectivity & Shop Metadata', async () => {
    const { status, json, durationMs } = await storefrontFetch(`{ shop { name description } }`);
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    return { durationMs, note: `Store name: "${json.data?.shop?.name}"` };
  });

  // 2. Homepage Query
  await test('Homepage Query (Hero & Product Carousels)', async () => {
    const query = `
      query Homepage($collectionsFirst: Int = 3, $productsFirst: Int = 8) {
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
      ${COLLECTION_CARD_FRAGMENT}
      ${PRODUCT_CARD_FRAGMENT}
      ${IMAGE_FRAGMENT}
      ${MONEY_FRAGMENT}
    `;
    const { status, json, durationMs } = await storefrontFetch(query, { collectionsFirst: 3, productsFirst: 8 });
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    sampleProduct = json.data?.allProducts?.nodes?.[0];
    sampleCollection = json.data?.collections?.nodes?.[0];
    sampleVariantId = sampleProduct?.variants?.nodes?.[0]?.id;
    return {
      durationMs,
      note: `Fetched ${json.data?.collections?.nodes?.length} collections, ${json.data?.featuredProducts?.nodes?.length} featured products`,
    };
  });

  // 3. Collections Directory
  await test('Collections Index Query', async () => {
    const query = `
      query Collections($first: Int = 20) {
        collections(first: $first, sortKey: TITLE) {
          nodes { ...CollectionCardFragment }
        }
      }
      ${COLLECTION_CARD_FRAGMENT}
      ${IMAGE_FRAGMENT}
    `;
    const { status, json, durationMs } = await storefrontFetch(query, { first: 20 });
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    return { durationMs, note: `Found ${json.data?.collections?.nodes?.length} active collections` };
  });

  // 4. Single Collection Detail by Handle
  if (sampleCollection) {
    await test(`Collection by Handle ("${sampleCollection.handle}")`, async () => {
      const query = `
        query CollectionByHandle($handle: String!, $first: Int = 24) {
          collection(handle: $handle) {
            id
            title
            handle
            description
            image { ...ImageFragment }
            products(first: $first, sortKey: BEST_SELLING) {
              nodes { ...ProductCardFragment }
            }
          }
        }
        ${PRODUCT_CARD_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `;
      const { status, json, durationMs } = await storefrontFetch(query, { handle: sampleCollection.handle, first: 24 });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      return {
        durationMs,
        note: `"${json.data?.collection?.title}" contains ${json.data?.collection?.products?.nodes?.length} products`,
      };
    });
  }

  // 5. Single Product Detail by Handle
  if (sampleProduct) {
    await test(`Product Detail by Handle ("${sampleProduct.handle}")`, async () => {
      const query = `
        query ProductByHandle($handle: String!) {
          product(handle: $handle) {
            ...ProductDetailFragment
          }
        }
        ${PRODUCT_DETAIL_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `;
      const { status, json, durationMs } = await storefrontFetch(query, { handle: sampleProduct.handle });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      return {
        durationMs,
        note: `"${json.data?.product?.title}" has ${json.data?.product?.variants?.nodes?.length} variants, ${json.data?.product?.media?.nodes?.length} media images`,
      };
    });

    // 6. Product Recommendations
    await test('Product Recommendations Query', async () => {
      const query = `
        query RecommendedProducts($productId: ID!) {
          productRecommendations(productId: $productId) {
            ...ProductCardFragment
          }
        }
        ${PRODUCT_CARD_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `;
      const { status, json, durationMs } = await storefrontFetch(query, { productId: sampleProduct.id });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      return {
        durationMs,
        note: `Returned ${json.data?.productRecommendations?.length || 0} paired recommendations`,
      };
    });
  }

  // 7. Storefront Search
  await test('Storefront Live Search Query ("tote")', async () => {
    const query = `
      query SearchProducts($query: String!, $first: Int = 24) {
        search(query: $query, first: $first, types: [PRODUCT]) {
          totalCount
          nodes {
            ... on Product {
              ...ProductCardFragment
            }
          }
        }
      }
      ${PRODUCT_CARD_FRAGMENT}
      ${IMAGE_FRAGMENT}
      ${MONEY_FRAGMENT}
    `;
    const { status, json, durationMs } = await storefrontFetch(query, { query: 'tote', first: 24 });
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    return { durationMs, note: `Found ${json.data?.search?.totalCount || 0} matching search items` };
  });

  // 8. Sitemap Bulk Query
  await test('Sitemap Generation Query (Products & Collections)', async () => {
    const query = `
      query Sitemap {
        products(first: 250, query: "published_status:online_store:visible") {
          nodes { handle updatedAt }
        }
        collections(first: 100) {
          nodes { handle updatedAt }
        }
      }
    `;
    const { status, json, durationMs } = await storefrontFetch(query);
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    return {
      durationMs,
      note: `Indexed ${json.data?.products?.nodes?.length} products and ${json.data?.collections?.nodes?.length} collections`,
    };
  });

  // 9. Cart Lifecycle: cartCreate
  await test('Cart Lifecycle: cartCreate Mutation', async () => {
    const mutation = `
      mutation CartCreate {
        cartCreate {
          cart {
            id
            checkoutUrl
            totalQuantity
          }
          userErrors { field message }
        }
      }
    `;
    const { status, json, durationMs } = await storefrontFetch(mutation);
    if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
    if (json.data?.cartCreate?.userErrors?.length) throw new Error(json.data.cartCreate.userErrors[0].message);
    testCartId = json.data?.cartCreate?.cart?.id;
    return { durationMs, note: `Created Cart ID: ${testCartId.slice(0, 30)}...` };
  });

  // 10. Cart Lifecycle: cartLinesAdd
  if (testCartId && sampleVariantId) {
    await test('Cart Lifecycle: cartLinesAdd Mutation', async () => {
      const mutation = `
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
      `;
      const { status, json, durationMs } = await storefrontFetch(mutation, {
        cartId: testCartId,
        lines: [{ merchandiseId: sampleVariantId, quantity: 2 }],
      });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      if (json.data?.cartLinesAdd?.userErrors?.length) throw new Error(json.data.cartLinesAdd.userErrors[0].message);
      testLineId = json.data?.cartLinesAdd?.cart?.lines?.nodes?.[0]?.id;
      return {
        durationMs,
        note: `Added merchandise line. Total qty: ${json.data?.cartLinesAdd?.cart?.totalQuantity}, Subtotal: Rs. ${json.data?.cartLinesAdd?.cart?.cost?.subtotalAmount?.amount}`,
      };
    });
  }

  // 11. Cart Lifecycle: cartLinesUpdate
  if (testCartId && testLineId) {
    await test('Cart Lifecycle: cartLinesUpdate Mutation', async () => {
      const mutation = `
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              totalQuantity
            }
            userErrors { field message }
          }
        }
      `;
      const { status, json, durationMs } = await storefrontFetch(mutation, {
        cartId: testCartId,
        lines: [{ id: testLineId, quantity: 5 }],
      });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      if (json.data?.cartLinesUpdate?.userErrors?.length) throw new Error(json.data.cartLinesUpdate.userErrors[0].message);
      return {
        durationMs,
        note: `Updated line quantity to ${json.data?.cartLinesUpdate?.cart?.totalQuantity}`,
      };
    });

    // 12. Cart Lifecycle: cartLinesRemove
    await test('Cart Lifecycle: cartLinesRemove Mutation', async () => {
      const mutation = `
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              id
              totalQuantity
            }
            userErrors { field message }
          }
        }
      `;
      const { status, json, durationMs } = await storefrontFetch(mutation, {
        cartId: testCartId,
        lineIds: [testLineId],
      });
      if (status !== 200 || json.errors) throw new Error(json.errors?.[0]?.message || `HTTP ${status}`);
      if (json.data?.cartLinesRemove?.userErrors?.length) throw new Error(json.data.cartLinesRemove.userErrors[0].message);
      return {
        durationMs,
        note: `Removed line item. Remaining total qty: ${json.data?.cartLinesRemove?.cart?.totalQuantity}`,
      };
    });
  }

  console.log('\n===============================================================');
  console.log(`📊 API TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
