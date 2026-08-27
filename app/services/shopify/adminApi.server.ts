/**
 * adminApi.server.ts
 * Shared Shopify Admin GraphQL API client for server-side mutations and queries.
 */

import { getAdminAccessToken } from './adminToken.server';

export async function adminGraphQL(
  queryName: string,
  query: string,
  variables: Record<string, any>,
  env: Env,
): Promise<any> {
  const storeDomain = env.PUBLIC_STORE_DOMAIN;
  if (!storeDomain) {
    throw new Error('[Shopify Admin API] PUBLIC_STORE_DOMAIN is missing in environment.');
  }
  const adminApiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
  const adminToken = await getAdminAccessToken(env);

  console.info(`\n🌐 [Shopify Admin API Request: ${queryName}]`);
  console.info(`📍 Endpoint: https://${storeDomain}/admin/api/${adminApiVersion}/graphql.json`);
  console.info(`🔑 Token in use: ${adminToken ? `${adminToken.substring(0, 10)}...` : 'NONE'}`);

  if (!adminToken) {
    console.error(`❌ [Shopify Admin API] No access token available.`);
    throw new Error(
      'Shopify Admin API credentials missing in .env (SHOPIFY_ADMIN_API_TOKEN or SHOPIFY_ADMIN_CLIENT_ID & SHOPIFY_ADMIN_CLIENT_SECRET required for server-side COD orders).',
    );
  }

  const res = await fetch(
    `https://${storeDomain}/admin/api/${adminApiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const json: any = await res.json();
  console.info(`📥 [Shopify Admin API Response: ${queryName}] Status: ${res.status}`);

  if (json.errors?.length) {
    console.warn(`⚠️ [Shopify Admin API GraphQL Notice in ${queryName}]:`, JSON.stringify(json.errors, null, 2));
  }

  return json;
}
