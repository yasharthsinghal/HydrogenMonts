#!/usr/bin/env node
/**
 * delete-all-collections.mjs
 * Deletes ALL collections from the Shopify store.
 * Run ONCE before the clean sync to remove subcollections.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env
const envPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const [k, ...v] = t.split('=');
      if (!process.env[k.trim()]) process.env[k.trim()] = v.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

const STORE_DOMAIN = process.env.PUBLIC_STORE_DOMAIN || '47751d.myshopify.com';
const API_VERSION  = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
const ENDPOINT     = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

let _cachedToken = null;

async function token() {
  if (_cachedToken) return _cachedToken;

  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN?.trim().replace(/^["']|["']$/g, '');
  if (staticToken && (staticToken.startsWith('shpat_') || staticToken.startsWith('shpss_'))) {
    _cachedToken = staticToken;
    return _cachedToken;
  }

  // Fall back to client credentials OAuth grant
  const clientId     = process.env.SHOPIFY_ADMIN_CLIENT_ID?.trim().replace(/^["']|["']$/g, '');
  const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET?.trim().replace(/^["']|["']$/g, '');

  if (!clientId || !clientSecret) {
    throw new Error(
      'Could not find admin credentials. Set SHOPIFY_ADMIN_API_TOKEN or ' +
      'SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET in .env'
    );
  }

  console.log('[AUTH] Fetching access token via client credentials...');
  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  _cachedToken = data.access_token;
  console.log('[AUTH] Token obtained.\n');
  return _cachedToken;
}

async function gql(query, variables = {}) {
  const t = await token();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllCollections() {
  let all = [];
  let cursor = null;
  do {
    const data = await gql(`
      query ($after: String) {
        collections(first: 50, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id title handle }
        }
      }
    `, { after: cursor });
    const page = data?.collections;
    all = all.concat(page?.nodes || []);
    cursor = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return all;
}

async function main() {
  console.log('=== DELETE ALL SHOPIFY COLLECTIONS ===\n');
  const collections = await fetchAllCollections();
  console.log(`Found ${collections.length} collection(s) to delete.\n`);

  let deleted = 0, failed = 0;
  for (const col of collections) {
    try {
      const res = await gql(`
        mutation Delete($id: ID!) {
          collectionDelete(input: { id: $id }) {
            deletedCollectionId
            userErrors { field message }
          }
        }
      `, { id: col.id });
      const errs = res?.collectionDelete?.userErrors || [];
      if (errs.length) {
        console.warn(`⚠️  [SKIP] ${col.title} (${col.handle}): ${errs[0].message}`);
        failed++;
      } else {
        console.log(`✅ Deleted: ${col.title} (${col.handle})`);
        deleted++;
      }
    } catch (err) {
      console.error(`❌ Error deleting ${col.title}: ${err.message}`);
      failed++;
    }
    await sleep(300); // respect rate limit
  }

  console.log(`\n=== DONE ===`);
  console.log(`Deleted: ${deleted}  |  Failed/Skipped: ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
