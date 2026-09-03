#!/usr/bin/env node

/**
 * post-products-to-shopify.mjs
 * 
 * Reads products from assets/monts_products.csv, converts encoding to UTF-8,
 * normalizes S3 image URLs to CloudFront URLs (ContentType: image/jpeg),
 * creates/updates products on Shopify with variants, prices, inventory, tags,
 * and automatically assigns them to their respective Shopify collections.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeImageUrl } from './helpers/image-url-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

// 1. Load environment variables
function loadEnv() {
  const envPath = path.resolve(projectRoot, '.env');
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
}
loadEnv();

const STORE_DOMAIN = process.env.PUBLIC_STORE_DOMAIN || '47751d.myshopify.com';
const ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

let cachedToken = null;
async function getAdminToken() {
  if (cachedToken) return cachedToken;
  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN?.trim().replace(/^["']|["']$/g, '');
  if (staticToken && (staticToken.startsWith('shpat_') || staticToken.startsWith('shpss_'))) {
    cachedToken = staticToken;
    return cachedToken;
  }

  const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID?.trim().replace(/^["']|["']$/g, '');
  const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET?.trim().replace(/^["']|["']$/g, '');

  if (!clientId || !clientSecret) {
    throw new Error('Missing Shopify Admin credentials in .env');
  }

  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  cachedToken = data.access_token;
  return cachedToken;
}

async function adminGraphQL(query, variables = {}) {
  const token = await getAdminToken();
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 2. CSV Parser (Handles Multiline Strings & Windows-1252 / latin1 cleanly)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      rows.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length) {
    row.push(currentField);
    rows.push(row);
  }
  return rows;
}

// Windows-1252 to clean UTF-8 string sanitizer
function sanitizeWindows1252(str) {
  if (!str) return '';
  return str
    .replace(/\x91/g, "‘")
    .replace(/\x92/g, "’")
    .replace(/\x93/g, "“")
    .replace(/\x94/g, "”")
    .replace(/\x96/g, "–")
    .replace(/\x97/g, "—")
    .replace(/\x85/g, "…")
    .trim();
}

async function main() {
  console.log('\n================================================================');
  console.log('🚀 MONTS SHOPIFY PRODUCT CREATION & PUBLISHING PIPELINE');
  console.log(`🌐 Store Domain: ${STORE_DOMAIN}`);
  console.log(`⚡ Admin API Version: ${ADMIN_API_VERSION}`);
  console.log(`🔧 Mode: ${isDryRun ? 'DRY RUN (Simulation)' : 'PRODUCTION (Live Creation)'}`);
  console.log('================================================================\n');

  // Load publication sales channels
  let publicationIds = [];
  try {
    const pubRes = await adminGraphQL(`
      query GetPublications {
        publications(first: 10) {
          nodes { id name autoPublish }
        }
      }
    `);
    const pubNodes = pubRes?.publications?.nodes || [];
    publicationIds = pubNodes.map((p) => p.id);
    console.log(`[CHANNELS] Targeting sales channels: ${pubNodes.map((p) => p.name).join(', ')}`);
  } catch (err) {
    console.warn(`⚠️ [CHANNELS] Warning getting publications: ${err.message}`);
  }

  // Load collections map (Handle -> ID)
  console.log('[COLLECTIONS] Fetching collections for automatic product mapping...');
  const colRes = await adminGraphQL(`
    query {
      collections(first: 50) {
        nodes { id title handle }
      }
    }
  `);
  const collections = colRes?.collections?.nodes || [];
  const colHandleMap = new Map();
  const colTitleMap = new Map();
  for (const c of collections) {
    colHandleMap.set(c.handle, c.id);
    colTitleMap.set(c.title.toLowerCase().trim(), c.id);
  }
  console.log(`[COLLECTIONS] Found ${collections.length} collections in store.\n`);

  // Read CSV
  const csvPath = path.resolve(projectRoot, 'assets', 'monts_products.csv');
  console.log(`[CSV] Reading product dataset: ${csvPath}`);
  const rawText = fs.readFileSync(csvPath, 'latin1');
  const [headerRow, ...dataRows] = parseCSV(rawText);

  const colIdx = {};
  headerRow.forEach((col, idx) => {
    colIdx[col.trim()] = idx;
  });

  // Group rows by product handle
  const productGroups = new Map();
  for (const r of dataRows) {
    if (!r || r.length <= 1) continue;
    const handle = sanitizeWindows1252(r[colIdx['URL handle']]);
    if (!handle) continue;

    if (!productGroups.has(handle)) {
      productGroups.set(handle, []);
    }
    productGroups.get(handle).push(r);
  }

  console.log(`[CSV] Loaded ${productGroups.size} unique products (${dataRows.length} total rows).\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Process products
  let idx = 0;
  for (const [handle, rows] of productGroups.entries()) {
    idx++;
    const primaryRow = rows[0];
    const title = sanitizeWindows1252(primaryRow[colIdx['Title']]);
    const descriptionHtml = sanitizeWindows1252(primaryRow[colIdx['Description']]);
    const vendor = sanitizeWindows1252(primaryRow[colIdx['Vendor']]) || 'MONTS';
    const productType = sanitizeWindows1252(primaryRow[colIdx['Type']]);
    const tags = sanitizeWindows1252(primaryRow[colIdx['Tags']])
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Collect all unique images for this product, transformed via image-url-helper
    const images = [];
    const seenUrls = new Set();
    for (const r of rows) {
      const rawImgUrl = r[colIdx['Product image URL']]?.trim();
      if (rawImgUrl && !seenUrls.has(rawImgUrl)) {
        seenUrls.add(rawImgUrl);
        const transformed = normalizeImageUrl(rawImgUrl);
        const alt = sanitizeWindows1252(r[colIdx['Image alt text']]) || title;
        images.push({ originalSource: transformed, alt, mediaContentType: 'IMAGE' });
      }
    }

    // Determine target collection ID
    let targetCollectionId = colHandleMap.get(productType.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    if (!targetCollectionId) {
      targetCollectionId = colTitleMap.get(productType.toLowerCase().trim());
    }
    // Fallback collection mappings
    if (!targetCollectionId) {
      if (productType.includes('Kids')) targetCollectionId = colHandleMap.get('kids-soft-toys');
      else if (productType.includes('Tote')) targetCollectionId = colHandleMap.get('tote-bags');
      else if (productType.includes('Pouch')) targetCollectionId = colHandleMap.get('pouch-bags-toiletry-sets');
      else if (productType.includes('Sling')) targetCollectionId = colHandleMap.get('mobile-sling-bags');
      else if (productType.includes('Duffle')) targetCollectionId = colHandleMap.get('duffle-bags');
      else if (productType.includes('Sunglass')) targetCollectionId = colHandleMap.get('sunglasses-covers');
      else if (productType.includes('Organizer')) targetCollectionId = colHandleMap.get('multi-utility-organizers');
      else if (productType.includes('Laptop')) targetCollectionId = colHandleMap.get('laptop-bags-office-essentials');
      else if (productType.includes('Wallet') || productType.includes('Clutch')) targetCollectionId = colHandleMap.get('wallets-clutches');
      else if (productType.includes('Accessories')) targetCollectionId = colHandleMap.get('accessories');
    }

    console.log(`[${idx}/${productGroups.size}] Product: "${title}" (${handle})`);
    console.log(`   └─ Type: "${productType}" | Images: ${images.length} | Target Col: ${targetCollectionId ? 'Matched' : 'Unmatched'}`);

    if (isDryRun) {
      console.log(`   └─ (Dry Run) Would create product with ${images.length} images.`);
      skippedCount++;
      continue;
    }

    try {
      // 1. Check if product already exists
      const checkData = await adminGraphQL(`
        query GetProduct($handle: String!) {
          productByHandle(handle: $handle) {
            id
            handle
            title
          }
        }
      `, { handle });

      let productId = checkData?.productByHandle?.id;

      if (productId) {
        console.log(`   └─ Already exists in Shopify (${productId}). Skipping duplicate creation.`);
        updatedCount++;
      } else {
        // Build product creation input
        const price = primaryRow[colIdx['Price']] || '0.00';
        const compareAtPrice = primaryRow[colIdx['Compare-at price']] || null;
        const sku = primaryRow[colIdx['SKU']] || '';

        const productInput = {
          title,
          handle,
          descriptionHtml,
          vendor,
          productType,
          tags,
          status: 'ACTIVE',
        };

        const createRes = await adminGraphQL(`
          mutation ProductCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
            productCreate(input: $input, media: $media) {
              product {
                id
                handle
                variants(first: 1) {
                  nodes { id }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `, { input: productInput, media: images.slice(0, 10) });

        const userErrors = createRes?.productCreate?.userErrors || [];
        if (userErrors.length > 0) {
          console.error(`   ❌ Creation error: ${userErrors[0].message}`);
          failedCount++;
          continue;
        }

        const newProduct = createRes?.productCreate?.product;
        productId = newProduct?.id;
        console.log(`   ✅ Created product: ${productId}`);
        createdCount++;

        // Update default variant pricing
        const firstVariantId = newProduct?.variants?.nodes?.[0]?.id;
        if (firstVariantId) {
          await adminGraphQL(`
            mutation UpdateVariant($input: ProductVariantInput!) {
              productVariantUpdate(input: $input) {
                userErrors { field message }
              }
            }
          `, {
            input: {
              id: firstVariantId,
              price: price,
              compareAtPrice: compareAtPrice || null,
              sku: sku,
            }
          });
        }
      }

      // Publish product to active sales channels
      if (productId && publicationIds.length > 0) {
        await adminGraphQL(`
          mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              userErrors { field message }
            }
          }
        `, {
          id: productId,
          input: publicationIds.map((pid) => ({ publicationId: pid })),
        });
      }

      // Add product to collection
      if (productId && targetCollectionId) {
        await adminGraphQL(`
          mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
            collectionAddProductsV2(id: $id, productIds: $productIds) {
              userErrors { field message }
            }
          }
        `, {
          id: targetCollectionId,
          productIds: [productId],
        });
      }

      // Respect rate limits
      await sleep(350);
    } catch (err) {
      console.error(`   ❌ Failed for ${handle}: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n================================================================');
  console.log('📊 POSTING SUMMARY');
  console.log('================================================================');
  console.log(`Products Processed: ${productGroups.size}`);
  console.log(`  - Created:        ${createdCount}`);
  console.log(`  - Existing/Skip:  ${updatedCount}`);
  console.log(`  - Failed:         ${failedCount}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
