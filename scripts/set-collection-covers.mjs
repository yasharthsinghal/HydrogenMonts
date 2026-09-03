#!/usr/bin/env node

/**
 * set-collection-covers.mjs
 * 
 * Automatically sets the collection cover image on Shopify for each collection
 * using the featured image of its first product!
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
  console.log('🖼️  SETTING COLLECTION COVER IMAGES FROM PRODUCTS');
  console.log('================================================================\n');

  // Fetch all collections with their products' featured images
  const colRes = await adminGraphQL(`
    query {
      collections(first: 20) {
        nodes {
          id
          title
          handle
          image { url }
          products(first: 5) {
            nodes {
              id
              title
              featuredMedia {
                preview {
                  image { url }
                }
              }
              media(first: 1) {
                nodes {
                  ... on MediaImage {
                    image { url }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  const collections = colRes?.collections?.nodes || [];

  for (const col of collections) {
    // Find the first product with a valid image
    let productImageUrl = null;
    for (const p of col.products?.nodes || []) {
      productImageUrl = p.featuredMedia?.preview?.image?.url || p.media?.nodes?.[0]?.image?.url;
      if (productImageUrl) break;
    }

    if (!productImageUrl) {
      console.log(`[COLLECTION] ${col.title} (${col.handle}) -> No product image found to set as cover.`);
      continue;
    }

    console.log(`[COLLECTION] Setting cover for "${col.title}"...`);
    console.log(`   └─ Image: ${productImageUrl.split('?')[0]}`);

    try {
      const updateRes = await adminGraphQL(`
        mutation UpdateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              image { url }
            }
            userErrors { field message }
          }
        }
      `, {
        input: {
          id: col.id,
          image: {
            src: productImageUrl,
            altText: `${col.title} Collection`,
          }
        }
      });

      const errs = updateRes?.collectionUpdate?.userErrors || [];
      if (errs.length > 0) {
        console.warn(`   ⚠️ Notice: ${errs[0].message}`);
      } else {
        console.log(`   ✅ Successfully updated cover image!`);
      }
      await sleep(250);
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 COMPLETED: Collection cover images updated on Shopify!');
  console.log('================================================================\n');
}

main().catch(console.error);
