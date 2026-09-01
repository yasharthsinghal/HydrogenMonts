#!/usr/bin/env node

/**
 * sync-shopify-collections.mjs
 * 
 * Synchronizes Shopify Collections and Product-to-Collection mappings from CSV files
 * into Shopify using the Shopify Admin GraphQL API.
 * 
 * Safe, idempotent, respects rate limits, supports dry-run mode.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// 1. CONFIGURATION & ENVIRONMENT LOADING
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

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

const COLLECTIONS_CSV_PATH = path.resolve(projectRoot, 'monts_collections.csv');
const MAPPINGS_CSV_PATH = path.resolve(projectRoot, 'monts_collection_products.csv');

// Global token caching
let cachedAdminToken = null;
let cachedTokenExpiresAt = 0;

/**
 * Obtain an Admin API access token (static or dynamic client-credentials).
 */
async function getAdminToken() {
  if (process.env.SHOPIFY_ADMIN_API_TOKEN && process.env.SHOPIFY_ADMIN_API_TOKEN.startsWith('shpat_')) {
    return process.env.SHOPIFY_ADMIN_API_TOKEN;
  }

  if (cachedAdminToken && cachedTokenExpiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedAdminToken;
  }

  const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret =
    process.env.SHOPIFY_ADMIN_CLIENT_SECRET ||
    (process.env.SHOPIFY_ADMIN_API_TOKEN?.startsWith('shpss_') ? process.env.SHOPIFY_ADMIN_API_TOKEN : null);

  if (!clientId || !clientSecret) {
    if (process.env.SHOPIFY_ADMIN_API_TOKEN) {
      return process.env.SHOPIFY_ADMIN_API_TOKEN;
    }
    throw new Error('Missing Shopify Admin credentials in .env (SHOPIFY_ADMIN_API_TOKEN or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET).');
  }

  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to exchange Admin API token (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const token = data.access_token;
  const expiresInSeconds = Number(data.expires_in) || 86400;

  if (!token) {
    throw new Error('No access_token received from Shopify Admin token exchange.');
  }

  cachedAdminToken = token;
  cachedTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  return token;
}

/**
 * Execute a Shopify Admin GraphQL query/mutation with rate limiting and exponential backoff.
 */
async function adminGraphQL(queryName, query, variables = {}, attempt = 1) {
  const token = await getAdminToken();

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  // Handle Rate Limiting headers
  const callLimit = res.headers.get('X-Shopify-Shop-Api-Call-Limit');
  if (callLimit) {
    const [used, max] = callLimit.split('/').map(Number);
    if (used / max >= 0.8) {
      await sleep(600);
    }
  }

  if (res.status === 429) {
    if (attempt <= 4) {
      const retryAfter = Number(res.headers.get('Retry-After')) || (attempt * 2);
      console.warn(`[RATE LIMIT] Throttled on ${queryName}. Retrying in ${retryAfter}s (attempt ${attempt}/4)...`);
      await sleep(retryAfter * 1000);
      return adminGraphQL(queryName, query, variables, attempt + 1);
    }
    throw new Error(`HTTP 429 Too Many Requests on ${queryName} after ${attempt} attempts.`);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Shopify Admin API HTTP ${res.status} on ${queryName}: ${errorBody}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    const isThrottled = json.errors.some((e) => e.message?.toLowerCase().includes('throttled'));
    if (isThrottled && attempt <= 4) {
      console.warn(`[RATE LIMIT] GraphQL query throttled on ${queryName}. Waiting ${attempt * 2}s (attempt ${attempt}/4)...`);
      await sleep(attempt * 2000);
      return adminGraphQL(queryName, query, variables, attempt + 1);
    }
    throw new Error(`Shopify GraphQL Error in ${queryName}: ${json.errors.map((e) => e.message).join('; ')}`);
  }

  return json.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 2. CSV PARSER (RFC 4180 COMPLIANT)
// ============================================================================

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === '') continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] !== undefined ? row[c].trim() : '';
    }
    records.push(obj);
  }

  return { headers, records };
}

// ============================================================================
// 3. VALIDATION PHASE
// ============================================================================

function validateCSVs(collectionsData, mappingsData) {
  const errors = [];

  // 1. Validate collection headers
  const requiredCollectionHeaders = [
    'Collection Title',
    'Handle',
    'Description HTML',
    'Published',
    'Sort Order',
  ];
  for (const h of requiredCollectionHeaders) {
    if (!collectionsData.headers.includes(h)) {
      errors.push(`monts_collections.csv is missing required column: "${h}"`);
    }
  }

  // 2. Validate mapping headers
  const requiredMappingHeaders = [
    'Collection Title',
    'Collection Handle',
    'Published',
    'Product Handle',
    'Product Title',
  ];
  for (const h of requiredMappingHeaders) {
    if (!mappingsData.headers.includes(h)) {
      errors.push(`monts_collection_products.csv is missing required column: "${h}"`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  // 3. Validate collection rows
  const collectionHandles = new Set();
  collectionsData.records.forEach((row, idx) => {
    const lineNum = idx + 2;
    if (!row['Handle']) {
      errors.push(`monts_collections.csv row ${lineNum}: Missing Handle`);
    } else {
      if (collectionHandles.has(row['Handle'])) {
        errors.push(`monts_collections.csv row ${lineNum}: Duplicate collection handle "${row['Handle']}"`);
      }
      collectionHandles.add(row['Handle']);
    }
    if (!row['Collection Title']) {
      errors.push(`monts_collections.csv row ${lineNum}: Missing Collection Title`);
    }
  });

  // 4. Validate mappings rows
  const handlePattern = /^[a-z0-9-]+$/;
  mappingsData.records.forEach((row, idx) => {
    const lineNum = idx + 2;
    const colHandle = row['Collection Handle'];
    const prodHandle = row['Product Handle'];

    if (!colHandle) {
      errors.push(`monts_collection_products.csv row ${lineNum}: Missing Collection Handle`);
    } else if (!collectionHandles.has(colHandle)) {
      errors.push(`monts_collection_products.csv row ${lineNum}: Collection handle "${colHandle}" not found in monts_collections.csv`);
    }

    if (!prodHandle) {
      errors.push(`monts_collection_products.csv row ${lineNum}: Missing Product Handle`);
    } else if (!handlePattern.test(prodHandle)) {
      errors.push(`monts_collection_products.csv row ${lineNum}: Product handle "${prodHandle}" contains invalid characters`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    collectionHandles,
  };
}

// ============================================================================
// 4. GRAPHQL QUERIES & MUTATIONS
// ============================================================================

const GET_PUBLICATIONS_QUERY = `
  query GetPublications {
    publications(first: 10) {
      nodes {
        id
        name
        autoPublish
      }
    }
  }
`;

const GET_COLLECTION_BY_HANDLE_QUERY = `
  query GetCollectionByHandle($query: String!) {
    collections(first: 1, query: $query) {
      nodes {
        id
        title
        handle
        sortOrder
        products(first: 250) {
          nodes {
            id
            handle
          }
        }
      }
    }
  }
`;

const CREATE_COLLECTION_MUTATION = `
  mutation CreateCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PUBLISH_COLLECTION_MUTATION = `
  mutation PublishCollection($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        ... on Collection {
          id
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
    }
  }
`;

const COLLECTION_ADD_PRODUCTS_MUTATION = `
  mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProductsV2(id: $id, productIds: $productIds) {
      job {
        id
        done
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CHECK_JOB_QUERY = `
  query CheckJob($id: ID!) {
    job(id: $id) {
      id
      done
    }
  }
`;

// ============================================================================
// 5. SYNCHRONIZATION ENGINE
// ============================================================================

async function runSync() {
  const startTime = Date.now();

  console.log('\n================================================================');
  console.log(`🛍️  MONTS SHOPIFY COLLECTION & PRODUCT MAPPING SYNC`);
  console.log(`🌐 Store Domain: ${STORE_DOMAIN}`);
  console.log(`⚡ Admin API Version: ${ADMIN_API_VERSION}`);
  console.log(`🔧 Mode: ${isDryRun ? 'DRY RUN (Read-Only Simulation)' : 'PRODUCTION (Active Mutations)'}`);
  console.log('================================================================\n');

  // Summary Metrics
  const summary = {
    collections: { created: 0, existing: 0, failed: 0 },
    products: { found: 0, missing: 0 },
    mappings: { added: 0, alreadyMapped: 0, failed: 0 },
    missingProductHandles: [],
    failedCollections: [],
    failedMappings: [],
  };

  // --------------------------------------------------------------------------
  // Step 1: File Existence and CSV Parsing
  // --------------------------------------------------------------------------
  if (!fs.existsSync(COLLECTIONS_CSV_PATH)) {
    console.error(`❌ [VALIDATION] Missing file: ${COLLECTIONS_CSV_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(MAPPINGS_CSV_PATH)) {
    console.error(`❌ [VALIDATION] Missing file: ${MAPPINGS_CSV_PATH}`);
    process.exit(1);
  }

  const collectionsRaw = fs.readFileSync(COLLECTIONS_CSV_PATH, 'utf8');
  const mappingsRaw = fs.readFileSync(MAPPINGS_CSV_PATH, 'utf8');

  const collectionsData = parseCSV(collectionsRaw);
  const mappingsData = parseCSV(mappingsRaw);

  console.log(`[VALIDATION] Loaded ${collectionsData.records.length} collections from CSV.`);
  console.log(`[VALIDATION] Loaded ${mappingsData.records.length} product-collection mappings from CSV.`);

  // --------------------------------------------------------------------------
  // Step 2: CSV Validation
  // --------------------------------------------------------------------------
  const validation = validateCSVs(collectionsData, mappingsData);
  if (!validation.valid) {
    console.error(`\n❌ [VALIDATION FAILED] Critical errors found:`);
    validation.errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\nAborting synchronization to prevent inconsistent data.');
    process.exit(1);
  }
  console.log(`[VALIDATION] CSV validation passed successfully.\n`);

  // --------------------------------------------------------------------------
  // Step 3: Sales Channel / Publication Resolution
  // --------------------------------------------------------------------------
  let targetPublicationInputs = [];
  try {
    const pubData = await adminGraphQL('GetPublications', GET_PUBLICATIONS_QUERY);
    const nodes = pubData?.publications?.nodes || [];
    const relevantPubs = nodes.filter((p) => {
      const name = p.name?.toLowerCase() || '';
      return (
        name.includes('online store') ||
        name.includes('headless') ||
        name.includes('hydrogen') ||
        p.autoPublish === true
      );
    });

    const pubsToUse = relevantPubs.length > 0 ? relevantPubs : nodes;
    targetPublicationInputs = pubsToUse.map((p) => ({ publicationId: p.id }));
    console.log(
      `[PUBLICATION] Targeting sales channels: ${pubsToUse.map((p) => `"${p.name}" (${p.id})`).join(', ')}`
    );
  } catch (err) {
    console.warn(`⚠️ [PUBLICATION] Could not fetch publications: ${err.message}`);
  }

  console.log('\n--- PHASE 1: COLLECTIONS SETUP ---');

  // Cache of collection handle -> { id, title, existingProductGids: Set<string> }
  const collectionRegistry = new Map();

  for (const row of collectionsData.records) {
    const title = row['Collection Title'];
    const handle = row['Handle'];
    const descriptionHtml = row['Description HTML'];
    const isPublished = row['Published']?.toUpperCase() === 'TRUE';
    const sortOrder = row['Sort Order'] || 'BEST_SELLING';

    try {
      // Lookup existing collection by handle
      const existingData = await adminGraphQL(
        `GetCollection_${handle}`,
        GET_COLLECTION_BY_HANDLE_QUERY,
        { query: `handle:${handle}` }
      );

      const existingNode = existingData?.collections?.nodes?.find((n) => n.handle === handle) || existingData?.collections?.nodes?.[0];

      if (existingNode && existingNode.handle === handle) {
        console.log(`[COLLECTION] Existing: ${title} (${handle}) -> ${existingNode.id}`);
        summary.collections.existing++;

        // Ensure existing collection is published to all target channels
        if (!isDryRun && isPublished && targetPublicationInputs.length > 0) {
          try {
            const pubRes = await adminGraphQL(
              `PublishCollection_${handle}`,
              PUBLISH_COLLECTION_MUTATION,
              {
                id: existingNode.id,
                input: targetPublicationInputs,
              }
            );
            const pubErrors = pubRes?.publishablePublish?.userErrors || [];
            if (pubErrors.length > 0) {
              console.warn(`⚠️ [COLLECTION] Publish notice for ${title}: ${pubErrors[0].message}`);
            } else {
              console.log(`   └─ 📢 Published to Sales Channels`);
            }
          } catch (pubErr) {
            console.warn(`⚠️ [COLLECTION] Publish error for ${title}: ${pubErr.message}`);
          }
        }

        const productGids = new Set(
          (existingNode.products?.nodes || []).map((p) => p.id)
        );

        collectionRegistry.set(handle, {
          id: existingNode.id,
          title: existingNode.title,
          handle,
          existingProductGids: productGids,
        });
      } else {
        if (isDryRun) {
          console.log(`[COLLECTION] (Dry Run) Would create: ${title} (${handle})`);
          summary.collections.created++;
          collectionRegistry.set(handle, {
            id: `gid://shopify/Collection/mock-${handle}`,
            title,
            handle,
            existingProductGids: new Set(),
          });
        } else {
          console.log(`[COLLECTION] Creating: ${title} (${handle})...`);

          const createInput = {
            title,
            handle,
            descriptionHtml,
            sortOrder,
          };

          const createData = await adminGraphQL(
            `CreateCollection_${handle}`,
            CREATE_COLLECTION_MUTATION,
            { input: createInput }
          );

          const userErrors = createData?.collectionCreate?.userErrors || [];
          if (userErrors.length > 0) {
            const msg = userErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
            console.error(`❌ [COLLECTION] Failed to create ${title}: ${msg}`);
            summary.collections.failed++;
            summary.failedCollections.push({ handle, title, error: msg });
            continue;
          }

          const createdCol = createData?.collectionCreate?.collection;
          console.log(`✅ [COLLECTION] Created: ${title} -> ${createdCol.id}`);
          summary.collections.created++;

          // Publish collection to target sales channels if requested
          if (isPublished && targetPublicationInputs.length > 0 && createdCol?.id) {
            try {
              const pubRes = await adminGraphQL(
                `PublishCollection_${handle}`,
                PUBLISH_COLLECTION_MUTATION,
                {
                  id: createdCol.id,
                  input: targetPublicationInputs,
                }
              );
              const pubErrors = pubRes?.publishablePublish?.userErrors || [];
              if (pubErrors.length > 0) {
                console.warn(`⚠️ [COLLECTION] Publish notice for ${title}: ${pubErrors[0].message}`);
              } else {
                console.log(`   └─ 📢 Published to Sales Channels`);
              }
            } catch (pubErr) {
              console.warn(`⚠️ [COLLECTION] Publish error: ${pubErr.message}`);
            }
          }

          collectionRegistry.set(handle, {
            id: createdCol.id,
            title: createdCol.title,
            handle,
            existingProductGids: new Set(),
          });
        }
      }
    } catch (err) {
      console.error(`❌ [COLLECTION] Error processing ${title} (${handle}): ${err.message}`);
      summary.collections.failed++;
      summary.failedCollections.push({ handle, title, error: err.message });
    }
  }

  console.log('\n--- PHASE 2: PRODUCT LOOKUP ---');

  // Extract all unique product handles needed
  const uniqueProductHandles = Array.from(
    new Set(mappingsData.records.map((r) => r['Product Handle']))
  );

  const productRegistry = new Map(); // handle -> { id, title }

  for (const handle of uniqueProductHandles) {
    try {
      const prodData = await adminGraphQL(
        `GetProduct_${handle}`,
        GET_PRODUCT_BY_HANDLE_QUERY,
        { handle }
      );

      const prod = prodData?.productByHandle;
      if (prod && prod.id) {
        console.log(`[PRODUCT] Found: ${handle} -> ${prod.id} ("${prod.title}")`);
        productRegistry.set(handle, { id: prod.id, title: prod.title });
        summary.products.found++;
      } else {
        console.warn(`⚠️ [PRODUCT] Missing: ${handle} not found in Shopify catalog.`);
        summary.products.missing++;
        summary.missingProductHandles.push(handle);
      }
    } catch (err) {
      console.error(`❌ [PRODUCT] Error resolving product ${handle}: ${err.message}`);
      summary.products.missing++;
      summary.missingProductHandles.push(handle);
    }
  }

  console.log('\n--- PHASE 3: PRODUCT → COLLECTION MAPPING ---');

  // Group mappings by collection
  const mappingsByCollection = new Map();
  for (const row of mappingsData.records) {
    const colHandle = row['Collection Handle'];
    const prodHandle = row['Product Handle'];
    if (!mappingsByCollection.has(colHandle)) {
      mappingsByCollection.set(colHandle, []);
    }
    mappingsByCollection.get(colHandle).push({
      productHandle: prodHandle,
      productTitle: row['Product Title'],
      position: row['Position'],
    });
  }

  for (const [colHandle, mappings] of mappingsByCollection.entries()) {
    const colInfo = collectionRegistry.get(colHandle);
    if (!colInfo) {
      console.warn(`⚠️ [MAPPING] Skipping mappings for unknown/failed collection: ${colHandle}`);
      continue;
    }

    const newProductGidsToAdd = [];
    const newProductHandlesToAdd = [];

    for (const m of mappings) {
      const prod = productRegistry.get(m.productHandle);
      if (!prod) {
        console.warn(`⚠️ [MAPPING] Cannot map missing product "${m.productHandle}" to "${colInfo.title}"`);
        summary.mappings.failed++;
        summary.failedMappings.push({
          collection: colHandle,
          product: m.productHandle,
          reason: 'Product not found in Shopify',
        });
        continue;
      }

      // Check if product is already in collection
      if (colInfo.existingProductGids.has(prod.id)) {
        console.log(`[MAPPING] Already exists: ${m.productHandle} → ${colInfo.title}`);
        summary.mappings.alreadyMapped++;
      } else {
        if (isDryRun) {
          console.log(`[MAPPING] (Dry Run) Would add: ${m.productHandle} → ${colInfo.title}`);
          summary.mappings.added++;
          colInfo.existingProductGids.add(prod.id);
        } else {
          newProductGidsToAdd.push(prod.id);
          newProductHandlesToAdd.push(m.productHandle);
        }
      }
    }

    // Perform mutation for new products
    if (!isDryRun && newProductGidsToAdd.length > 0) {
      try {
        console.log(`[MAPPING] Adding ${newProductGidsToAdd.length} products to collection "${colInfo.title}"...`);
        const addData = await adminGraphQL(
          `AddProducts_${colHandle}`,
          COLLECTION_ADD_PRODUCTS_MUTATION,
          {
            id: colInfo.id,
            productIds: newProductGidsToAdd,
          }
        );

        const userErrors = addData?.collectionAddProductsV2?.userErrors || [];
        if (userErrors.length > 0) {
          const msg = userErrors.map((e) => `${e.field}: ${e.message}`).join(', ');
          console.error(`❌ [MAPPING] Failed to add products to ${colInfo.title}: ${msg}`);
          summary.mappings.failed += newProductGidsToAdd.length;
          newProductHandlesToAdd.forEach((ph) => {
            summary.failedMappings.push({ collection: colHandle, product: ph, reason: msg });
          });
          continue;
        }

        // Poll job if async job returned
        const job = addData?.collectionAddProductsV2?.job;
        if (job && !job.done) {
          let done = false;
          let pollAttempts = 0;
          while (!done && pollAttempts < 15) {
            await sleep(1000);
            pollAttempts++;
            const check = await adminGraphQL('CheckJob', CHECK_JOB_QUERY, { id: job.id });
            done = Boolean(check?.job?.done);
          }
        }

        newProductHandlesToAdd.forEach((ph) => {
          console.log(`✅ [MAPPING] Added: ${ph} → ${colInfo.title}`);
          summary.mappings.added++;
          const p = productRegistry.get(ph);
          if (p) colInfo.existingProductGids.add(p.id);
        });
      } catch (err) {
        console.error(`❌ [MAPPING] Error adding products to ${colInfo.title}: ${err.message}`);
        summary.mappings.failed += newProductGidsToAdd.length;
        newProductHandlesToAdd.forEach((ph) => {
          summary.failedMappings.push({ collection: colHandle, product: ph, reason: err.message });
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step 4: Verification Phase
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 4: VERIFICATION ---');
  let verificationPassed = true;

  if (!isDryRun) {
    for (const row of collectionsData.records) {
      const handle = row['Handle'];
      const expectedCount = parseInt(row['Product Count'] || '0', 10);
      try {
        const verifyData = await adminGraphQL(
          `Verify_${handle}`,
          GET_COLLECTION_BY_HANDLE_QUERY,
          { query: `handle:${handle}` }
        );
        const col = verifyData?.collections?.nodes?.find((n) => n.handle === handle) || verifyData?.collections?.nodes?.[0];
        if (!col) {
          console.error(`❌ [VERIFICATION] Collection not found on Shopify: ${handle}`);
          verificationPassed = false;
        } else {
          const actualCount = col.products?.nodes?.length || 0;
          console.log(`[VERIFICATION] Collection "${col.title}" (${handle}) exists with ${actualCount} products (CSV expects ${expectedCount})`);
        }
      } catch (err) {
        console.warn(`⚠️ [VERIFICATION] Verification query notice for ${handle}: ${err.message}`);
      }
    }
  } else {
    console.log('[VERIFICATION] Skipped verification queries in dry-run mode.');
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // --------------------------------------------------------------------------
  // Step 5: Final Summary Output
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 SYNCHRONIZATION SUMMARY ${isDryRun ? '(DRY RUN - No writes performed)' : ''}`);
  console.log('================================================================');
  console.log(`Duration: ${durationSec}s\n`);

  console.log(`Collections:`);
  console.log(`  - Created:        ${summary.collections.created}`);
  console.log(`  - Already existed: ${summary.collections.existing}`);
  console.log(`  - Failed:         ${summary.collections.failed}`);

  console.log(`\nProducts:`);
  console.log(`  - Found:          ${summary.products.found}`);
  console.log(`  - Missing:        ${summary.products.missing}`);
  if (summary.missingProductHandles.length > 0) {
    console.log(`    Missing handles: ${summary.missingProductHandles.join(', ')}`);
  }

  console.log(`\nProduct ↔ Collection Mappings:`);
  console.log(`  - Added:          ${summary.mappings.added}`);
  console.log(`  - Already mapped: ${summary.mappings.alreadyMapped}`);
  console.log(`  - Failed:         ${summary.mappings.failed}`);
  if (summary.failedMappings.length > 0) {
    console.log(`    Failed count:   ${summary.failedMappings.length}`);
  }

  console.log('================================================================\n');

  if (summary.collections.failed > 0 || summary.mappings.failed > 0) {
    console.warn(`⚠️ Completed with some failures. Review logs above.`);
  } else {
    console.log(`🎉 Synchronization finished successfully!`);
  }
}

// Execute
runSync().catch((err) => {
  console.error(`\n💥 Fatal execution error:`, err);
  process.exit(1);
});
