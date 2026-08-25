import {
  CUSTOMER_CREATE_MUTATION,
  CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
} from '~/graphql/StorefrontQueries';
import { getAdminAccessToken } from './adminToken.server';

export interface ShopifyCustomerSyncResult {
  isNewCustomer: boolean;
  customerId?: string;
  error?: string;
}

// ─── Admin API Helper (Supports Dynamic & Static Tokens) ──────────────────────

async function adminGraphQL(
  queryName: string,
  query: string,
  variables: Record<string, any>,
  env: Env,
): Promise<any> {
  const storeDomain = env.PUBLIC_STORE_DOMAIN;
  if (!storeDomain) {
    throw new Error('[Shopify Customer Service] PUBLIC_STORE_DOMAIN is missing in environment.');
  }
  const adminApiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
  const adminToken = await getAdminAccessToken(env);

  console.info(`\n🌐 [Shopify Admin API Request: ${queryName}]`);
  console.info(`📍 Endpoint: https://${storeDomain}/admin/api/${adminApiVersion}/graphql.json`);
  console.info(`🔑 Token in use: ${adminToken ? `${adminToken.substring(0, 10)}...` : 'NONE'}`);
  console.info(`📦 Variables:`, JSON.stringify(variables));

  if (!adminToken) {
    console.error(`❌ [Shopify Admin API] No access token available.`);
    throw new Error('Could not acquire Shopify Admin API Access Token. Check Client ID / Secret in .env.');
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

// ─── Customer Queries ─────────────────────────────────────────────────────────

const ADMIN_CUSTOMER_SEARCH = `
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
`;

const ADMIN_CUSTOMER_CREATE = `
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
`;

const ADMIN_CUSTOMER_WITH_ORDERS = `
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
          address2
          city
          province
          zip
          country
          phone
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
`;

const ADMIN_CUSTOMER_PROFILE_ONLY = `
  query getAdminCustomerProfileOnly($query: String!) {
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
          address2
          city
          province
          zip
          country
          phone
        }
      }
    }
  }
`;

/**
 * Isolated Shopify Storefront customer synchronization service.
 * Fully passwordless — OTP is the authentication.
 * Uses Shopify Admin API to create/verify customer by email.
 */
export class ShopifyCustomerService {
  /**
   * After OTP is verified in-app:
   * 1. Check if customer exists in Shopify by email (Admin API).
   * 2. If not, create them (no password, Admin API).
   */
  async syncCustomer(
    storefront: any,
    email: string,
    sessionSecret: string,
    env?: Env,
  ): Promise<ShopifyCustomerSyncResult> {
    const normalizedEmail = email.trim().toLowerCase();
    console.info(`\n🔄 [Shopify Customer Sync] Starting sync for: ${normalizedEmail}`);

    if (env) {
      try {
        // 1. Check if customer exists
        const searchResult = await adminGraphQL(
          'searchCustomer',
          ADMIN_CUSTOMER_SEARCH,
          { query: `email:${normalizedEmail}` },
          env,
        );

        const existing = searchResult?.data?.customers?.nodes?.[0];
        if (existing) {
          console.info(`✅ [Shopify Customer Sync] Customer found in Shopify: ID = ${existing.id}`);
          return { isNewCustomer: false, customerId: existing.id };
        }

        // 2. Create new customer — no password needed via Admin API
        const firstName = normalizedEmail.split('@')[0] || 'Member';
        const createResult = await adminGraphQL(
          'adminCustomerCreate',
          ADMIN_CUSTOMER_CREATE,
          {
            input: {
              email: normalizedEmail,
              firstName,
              lastName: 'Customer',
              emailMarketingConsent: {
                marketingState: 'NOT_SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN',
              },
            },
          },
          env,
        );

        const newCustomer = createResult?.data?.customerCreate?.customer;
        const errors = createResult?.data?.customerCreate?.userErrors || [];
        if (errors.length > 0) {
          console.warn('⚠️ [Shopify Customer Sync] customerCreate userErrors:', errors);
        }

        if (newCustomer) {
          console.info(`🎉 [Shopify Customer Sync] New customer created in Shopify: ID = ${newCustomer.id}`);
        }

        return {
          isNewCustomer: true,
          customerId: newCustomer?.id,
        };
      } catch (err: any) {
        console.error('❌ [Shopify Customer Sync Exception]:', err?.message || err);
        return { isNewCustomer: false, error: err?.message };
      }
    }

    return { isNewCustomer: false };
  }

  /**
   * Fetches full customer profile, addresses, and order history by email.
   * Uses Shopify Admin API — resilient fallback if read_orders scope is missing.
   */
  async getCustomerProfile(
    storefront: any,
    customerAccessToken?: string,
    email?: string,
    env?: Env,
  ) {
    console.info(`\n👤 [Shopify Customer Profile Request] For email: ${email}`);

    if (env && email) {
      try {
        // 1. Try full query with orders
        let result = await adminGraphQL(
          'getAdminCustomerWithOrders',
          ADMIN_CUSTOMER_WITH_ORDERS,
          { query: `email:${email.trim().toLowerCase()}` },
          env,
        );

        // 2. If orders field is restricted (e.g. read_orders scope pending), fallback to profile-only query
        if (!result?.data?.customers && result?.errors?.some((e: any) => e.path?.includes('orders'))) {
          console.info('ℹ️ [Shopify Customer Profile] Retrying with profile-only query...');
          result = await adminGraphQL(
            'getAdminCustomerProfileOnly',
            ADMIN_CUSTOMER_PROFILE_ONLY,
            { query: `email:${email.trim().toLowerCase()}` },
            env,
          );
        }

        const found = result?.data?.customers?.nodes?.[0];
        if (found) {
          console.info(`✅ [Shopify Customer Profile Success] Found customer: ${found.firstName || ''} ${found.lastName || ''} (Orders: ${found.numberOfOrders || 0})`);
          
          return {
            id: found.id,
            firstName: found.firstName,
            lastName: found.lastName,
            email: found.email,
            phone: found.phone,
            numberOfOrders: found.numberOfOrders,
            defaultAddress: found.defaultAddress,
            addresses: {
              nodes: found.addresses || [],
            },
            orders: {
              nodes: (found.orders?.nodes || []).map((o: any) => ({
                id: o.id,
                name: o.name,
                orderNumber: o.name?.replace('#', ''),
                processedAt: o.processedAt,
                financialStatus: o.displayFinancialStatus || 'PENDING',
                fulfillmentStatus: o.displayFulfillmentStatus || 'UNFULFILLED',
                totalPrice: {
                  amount: o.totalPriceSet?.shopMoney?.amount || '0',
                  currencyCode: o.totalPriceSet?.shopMoney?.currencyCode || 'INR',
                },
                lineItems: {
                  nodes: (o.lineItems?.nodes || []).map((li: any) => ({
                    title: li.title,
                    quantity: li.quantity,
                    variant: li.variant
                      ? {
                          title: li.variant.title,
                          image: li.variant.image || null,
                          price: {
                            amount: String(li.variant.price || '0'),
                            currencyCode: o.totalPriceSet?.shopMoney?.currencyCode || 'INR',
                          },
                        }
                      : null,
                  })),
                },
              })),
            },
          };
        } else {
          console.warn(`⚠️ [Shopify Customer Profile] No customer record found in Shopify DB for: ${email}`);
        }
      } catch (err: any) {
        console.error('❌ [Shopify Customer Profile Error]:', err?.message || err);
      }
    }

    return null;
  }

  /**
   * Clears the Storefront access token on logout (if one exists).
   */
  async deleteCustomerAccessToken(storefront: any, customerAccessToken?: string) {
    if (!customerAccessToken) return;
    try {
      await storefront.mutate(CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION, {
        variables: { customerAccessToken },
      });
    } catch (err: any) {
      console.warn('[Shopify Customer Service] Token revocation notice:', err?.message);
    }
  }
}

export const shopifyCustomerService = new ShopifyCustomerService();
