#!/usr/bin/env node

/**
 * publish-all-products.mjs
 * 
 * Publishes all products to all active sales channels (Online Store, Monts Headless).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n================================================================');
  console.log('📢 PUBLISHING ALL PRODUCTS TO ALL SALES CHANNELS');
  console.log('================================================================\n');

  // 1. Get publications
  const pubRes = await adminGraphQL(`
    query {
      publications(first: 10) {
        nodes { id name }
      }
    }
  `);
  const publications = pubRes?.publications?.nodes || [];
  console.log(`Targeting ${publications.length} channels: ${publications.map(p => `"${p.name}" (${p.id})`).join(', ')}\n`);

  const publicationInputs = publications.map(p => ({ publicationId: p.id }));

  // 2. Fetch all products (pagination)
  let allProducts = [];
  let cursor = null;
  do {
    const prodRes = await adminGraphQL(`
      query ($after: String) {
        products(first: 50, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id title handle }
        }
      }
    `, { after: cursor });

    const page = prodRes?.products;
    allProducts = allProducts.concat(page?.nodes || []);
    cursor = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  console.log(`Found ${allProducts.length} total products to publish.\n`);

  let published = 0;
  let idx = 0;
  for (const prod of allProducts) {
    idx++;
    try {
      const pubRes = await adminGraphQL(`
        mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            userErrors { field message }
          }
        }
      `, { id: prod.id, input: publicationInputs });

      const errs = pubRes?.publishablePublish?.userErrors || [];
      if (errs.length > 0) {
        console.warn(`[${idx}/${allProducts.length}] ⚠️ Notice for ${prod.title}: ${errs[0].message}`);
      } else {
        published++;
        console.log(`[${idx}/${allProducts.length}] 📢 Published: ${prod.title}`);
      }
      await sleep(150);
    } catch (err) {
      console.error(`[${idx}/${allProducts.length}] ❌ Error publishing ${prod.title}: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 COMPLETED: ${published} of ${allProducts.length} products published to Storefront!`);
  console.log('================================================================\n');
}

main().catch(console.error);
