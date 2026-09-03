#!/usr/bin/env node

/**
 * sync-prices-and-collections.mjs
 * 
 * Sets the correct prices, compareAtPrices, and SKUs using productVariantsBulkUpdate,
 * and ensures all 108 products are linked to their respective collections.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Load env
const envPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) process.env[key.trim()] = val;
    }
  }
}

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
  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const data = await res.json();
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
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function sanitize(str) {
  if (!str) return '';
  return str.replace(/\x92/g, "’").replace(/\x96/g, "–").replace(/\x97/g, "—").trim();
}

async function main() {
  console.log('\n================================================================');
  console.log('🏷️  SYNCING PRODUCT PRICES & COLLECTION LINKS');
  console.log('================================================================\n');

  // Load collections map
  const colRes = await adminGraphQL(`
    query {
      collections(first: 50) {
        nodes { id title handle }
      }
    }
  `);
  const collections = colRes?.collections?.nodes || [];
  const colHandleMap = new Map();
  for (const c of collections) {
    colHandleMap.set(c.handle, c.id);
  }

  // Load CSV
  const csvPath = path.resolve(projectRoot, 'assets', 'monts_products.csv');
  const rawText = fs.readFileSync(csvPath, 'latin1');
  const [headerRow, ...dataRows] = parseCSV(rawText);

  const colIdx = {};
  headerRow.forEach((c, i) => { colIdx[c.trim()] = i; });

  const productData = new Map();
  for (const r of dataRows) {
    const handle = sanitize(r[colIdx['URL handle']]);
    if (!handle || productData.has(handle)) continue;

    productData.set(handle, {
      handle,
      title: sanitize(r[colIdx['Title']]),
      price: r[colIdx['Price']] || '0.00',
      compareAtPrice: r[colIdx['Compare-at price']] || null,
      sku: r[colIdx['SKU']] || '',
      type: sanitize(r[colIdx['Type']]),
    });
  }

  console.log(`Loaded ${productData.size} products from CSV.\n`);

  let updatedCount = 0;
  let mappedColCount = 0;
  let idx = 0;

  for (const [handle, data] of productData.entries()) {
    idx++;
    try {
      // 1. Get product & variant ID
      const prodRes = await adminGraphQL(`
        query GetProduct($handle: String!) {
          productByHandle(handle: $handle) {
            id
            variants(first: 1) {
              nodes { id price compareAtPrice sku }
            }
          }
        }
      `, { handle });

      const product = prodRes?.productByHandle;
      if (!product) {
        console.warn(`[${idx}/${productData.size}] ⚠️ Product ${handle} not found in store.`);
        continue;
      }

      const variant = product.variants?.nodes?.[0];
      if (variant) {
        // Update variant pricing via productVariantsBulkUpdate
        await adminGraphQL(`
          mutation BulkUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              userErrors { field message }
            }
          }
        `, {
          productId: product.id,
          variants: [{
            id: variant.id,
            price: data.price,
            compareAtPrice: data.compareAtPrice || null,
            inventoryItem: data.sku ? { sku: data.sku } : undefined,
          }]
        });
        updatedCount++;
      }

      // Map to collection
      let colHandle = data.type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (data.type.includes('Kids')) colHandle = 'kids-soft-toys';
      else if (data.type.includes('Tote')) colHandle = 'tote-bags';
      else if (data.type.includes('Pouch')) colHandle = 'pouch-bags-toiletry-sets';
      else if (data.type.includes('Sling')) colHandle = 'mobile-sling-bags';
      else if (data.type.includes('Duffle')) colHandle = 'duffle-bags';
      else if (data.type.includes('Sunglass')) colHandle = 'sunglasses-covers';
      else if (data.type.includes('Organizer')) colHandle = 'multi-utility-organizers';
      else if (data.type.includes('Laptop')) colHandle = 'laptop-bags-office-essentials';
      else if (data.type.includes('Wallet') || data.type.includes('Clutch')) colHandle = 'wallets-clutches';
      else if (data.type.includes('Accessories')) colHandle = 'accessories';

      const colId = colHandleMap.get(colHandle);
      if (colId) {
        await adminGraphQL(`
          mutation AddToCollection($id: ID!, $productIds: [ID!]!) {
            collectionAddProductsV2(id: $id, productIds: $productIds) {
              userErrors { field message }
            }
          }
        `, { id: colId, productIds: [product.id] });
        mappedColCount++;
      }

      console.log(`[${idx}/${productData.size}] ✅ ${data.title} -> ₹${data.price} | Col: ${colHandle}`);
      await sleep(250);
    } catch (err) {
      console.error(`[${idx}/${productData.size}] ❌ Error for ${handle}: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 COMPLETED: ${updatedCount} variant prices updated, ${mappedColCount} collection links confirmed!`);
  console.log('================================================================\n');
}

main().catch(console.error);
