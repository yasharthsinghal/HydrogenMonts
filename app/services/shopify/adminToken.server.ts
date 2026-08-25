/**
 * adminToken.server.ts
 *
 * Automatic dynamic token manager for Shopify Admin API using
 * Client Credentials Grant (Client ID + Client Secret).
 *
 * Automatically fetches and caches short-lived (~24h) Admin API tokens.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let cachedToken: CachedToken | null = null;

export async function getAdminAccessToken(env: Env): Promise<string | null> {
  // 1. If a static full token (shpat_...) is provided, use it directly
  if (env.SHOPIFY_ADMIN_API_TOKEN && env.SHOPIFY_ADMIN_API_TOKEN.startsWith('shpat_')) {
    return env.SHOPIFY_ADMIN_API_TOKEN;
  }

  // 2. Check if we have an active in-memory cached token (with 5 min safety buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  // 3. Extract Client ID & Secret
  const clientId = env.SHOPIFY_ADMIN_CLIENT_ID || 'c29ec1e24c353723dcb54cc0c6fbcba6';
  // Secret can come from SHOPIFY_ADMIN_CLIENT_SECRET or SHOPIFY_ADMIN_API_TOKEN if it begins with shpss_
  const clientSecret =
    env.SHOPIFY_ADMIN_CLIENT_SECRET ||
    (env.SHOPIFY_ADMIN_API_TOKEN?.startsWith('shpss_') ? env.SHOPIFY_ADMIN_API_TOKEN : null);

  if (!clientId || !clientSecret) {
    console.warn('[Shopify Admin Token] Missing SHOPIFY_ADMIN_CLIENT_ID or SHOPIFY_ADMIN_CLIENT_SECRET.');
    return null;
  }

  const storeDomain = env.PUBLIC_STORE_DOMAIN || '47751d.myshopify.com';

  try {
    const res = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
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
      console.error(`[Shopify Admin Token Error] HTTP ${res.status}:`, errorText);
      return null;
    }

    const data: any = await res.json();
    const token = data.access_token;
    const expiresInSeconds = Number(data.expires_in) || 86400; // default 24h

    if (token) {
      cachedToken = {
        accessToken: token,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      };
      console.info(`[Shopify Admin Token] Successfully exchanged dynamic Admin token (expires in ${Math.round(expiresInSeconds / 3600)}h)`);
      return token;
    }
  } catch (err: any) {
    console.error('[Shopify Admin Token Exception]', err?.message || err);
  }

  return null;
}
