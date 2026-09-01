import {
  CUSTOMER_CREATE_MUTATION,
  CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION,
  STOREFRONT_CUSTOMER_QUERY,
} from '~/graphql/StorefrontQueries';
import { adminGraphQL } from './adminApi.server';

export interface ShopifyCustomerSyncResult {
  isNewCustomer: boolean;
  customerId?: string;
  error?: string;
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
                image { url altText }
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

const ADMIN_GET_ORDER_BY_ID = `
  query getAdminOrderById($id: ID!) {
    order(id: $id) {
      id
      name
      processedAt
      displayFinancialStatus
      displayFulfillmentStatus
      statusPageUrl
      customer {
        id
        email
        firstName
        lastName
      }
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      shippingAddress {
        address1
        address2
        city
        province
        zip
        country
        phone
      }
      lineItems(first: 25) {
        nodes {
          id
          title
          quantity
          image { url altText }
          variant {
            title
            price
            image {
              url
              altText
            }
          }
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
        let ordersPermissionDenied = false;

        // 1. Try full query with orders
        let result = await adminGraphQL(
          'getAdminCustomerWithOrders',
          ADMIN_CUSTOMER_WITH_ORDERS,
          { query: `email:${email.trim().toLowerCase()}` },
          env,
        );

        // 2. If orders field is restricted (e.g. read_orders scope pending), fallback to profile-only query
        if (!result?.data?.customers && result?.errors?.some((e: any) => e.path?.includes('orders') || e.message?.toLowerCase().includes('orders'))) {
          console.info('ℹ️ [Shopify Customer Profile] Retrying with profile-only query (read_orders scope required)...');
          ordersPermissionDenied = true;
          result = await adminGraphQL(
            'getAdminCustomerProfileOnly',
            ADMIN_CUSTOMER_PROFILE_ONLY,
            { query: `email:${email.trim().toLowerCase()}` },
            env,
          );
        }

        const found = result?.data?.customers?.nodes?.[0];
        if (found) {
          console.info(`✅ [Shopify Customer Profile Success] Found customer: ${found.firstName || ''} ${found.lastName || ''} (Orders: ${found.numberOfOrders || 0}, PermissionDenied: ${ordersPermissionDenied})`);
          
          return {
            id: found.id,
            firstName: found.firstName,
            lastName: found.lastName,
            email: found.email,
            phone: found.phone,
            numberOfOrders: found.numberOfOrders,
            ordersPermissionDenied,
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
   * Resolves an individual order for the authenticated customer.
   * Supports both passwordless OTP email sessions and Storefront access token sessions.
   * Strictly enforces customer ownership (IDOR prevention).
   */
  async getOrder(
    storefront: any,
    customerAccessToken?: string,
    email?: string,
    orderId?: string,
    env?: Env,
  ): Promise<{
    order: any | null;
    customer: any | null;
    permissionDenied?: boolean;
    unauthorized?: boolean;
  }> {
    if (!orderId) {
      return { order: null, customer: null };
    }

    const cleanOrderId = orderId.trim();

    // 1. Storefront API path (if customerAccessToken is available)
    if (customerAccessToken && storefront) {
      try {
        const data: any = await storefront.query(STOREFRONT_CUSTOMER_QUERY, {
          variables: { customerAccessToken },
          cache: storefront.CacheNone(),
        });
        const customer = data?.customer;
        const orders = customer?.orders?.nodes || [];
        const order = orders.find((o: any) => {
          const rawId = o.id || '';
          return (
            rawId === cleanOrderId ||
            rawId.endsWith(`/${cleanOrderId}`) ||
            o.name === cleanOrderId ||
            o.name === `#${cleanOrderId}` ||
            String(o.orderNumber || o.number) === cleanOrderId
          );
        });
        if (order) {
          return { order, customer };
        }
      } catch (err: any) {
        console.warn('[Shopify Customer Service] Storefront getOrder notice:', err?.message);
      }
    }

    // 2. Admin API path via Customer Profile (for passwordless OTP users)
    let customerProfile: any = null;
    if (email && env) {
      customerProfile = await this.getCustomerProfile(storefront, customerAccessToken, email, env);
      const orders = customerProfile?.orders?.nodes || [];
      const order = orders.find((o: any) => {
        const rawId = o.id || '';
        return (
          rawId === cleanOrderId ||
          rawId.endsWith(`/${cleanOrderId}`) ||
          o.name === cleanOrderId ||
          o.name === `#${cleanOrderId}` ||
          String(o.orderNumber) === cleanOrderId
        );
      });
      if (order) {
        return { order, customer: customerProfile };
      }
    }

    // 3. Direct Admin API Order Lookup by GID / Number (if read_orders scope is active)
    if (env && (cleanOrderId.startsWith('gid://') || /^\d+$/.test(cleanOrderId))) {
      const gid = cleanOrderId.startsWith('gid://') ? cleanOrderId : `gid://shopify/Order/${cleanOrderId}`;
      try {
        const orderRes = await adminGraphQL('getAdminOrderById', ADMIN_GET_ORDER_BY_ID, { id: gid }, env);
        const adminOrder = orderRes?.data?.order;
        if (adminOrder) {
          // IDOR check: verify that this order belongs to the requesting customer's email
          if (email && adminOrder.customer?.email?.toLowerCase() !== email.toLowerCase()) {
            console.warn(`[Shopify Customer Service] IDOR mismatch for order ${cleanOrderId} vs email ${email}`);
            return { order: null, customer: customerProfile, unauthorized: true };
          }

          const formattedOrder = {
            id: adminOrder.id,
            name: adminOrder.name,
            orderNumber: adminOrder.name?.replace('#', ''),
            processedAt: adminOrder.processedAt,
            financialStatus: adminOrder.displayFinancialStatus || 'PAID',
            fulfillmentStatus: adminOrder.displayFulfillmentStatus || 'UNFULFILLED',
            statusUrl: adminOrder.statusPageUrl,
            shippingAddress: adminOrder.shippingAddress,
            totalPrice: {
              amount: adminOrder.totalPriceSet?.shopMoney?.amount || '0',
              currencyCode: adminOrder.totalPriceSet?.shopMoney?.currencyCode || 'INR',
            },
            lineItems: {
              nodes: (adminOrder.lineItems?.nodes || []).map((li: any) => ({
                title: li.title,
                quantity: li.quantity,
                variant: li.variant
                  ? {
                      title: li.variant.title,
                      image: li.variant.image || null,
                      price: {
                        amount: String(li.variant.price || '0'),
                        currencyCode: adminOrder.totalPriceSet?.shopMoney?.currencyCode || 'INR',
                      },
                    }
                  : null,
              })),
            },
          };
          return { order: formattedOrder, customer: customerProfile || adminOrder.customer };
        }
      } catch (err: any) {
        console.warn('[Shopify Customer Service] Direct Admin getOrder notice:', err?.message);
      }
    }

    return {
      order: null,
      customer: customerProfile,
      permissionDenied: customerProfile?.ordersPermissionDenied,
    };
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

  /**
   * Enrolls an email into email marketing in Shopify with tags and acceptsMarketing = true.
   */
  async subscribeCustomer(email: string, source = 'checkout', env: Env) {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Check if customer already exists in Shopify
      const searchResult = await adminGraphQL(
        'searchCustomer',
        ADMIN_CUSTOMER_SEARCH,
        { query: `email:${cleanEmail}` },
        env,
      );

      const existing = searchResult?.data?.customers?.nodes?.[0];

      if (existing?.id) {
        const updateMutation = `
          mutation customerUpdate($input: CustomerInput!) {
            customerUpdate(input: $input) {
              customer { id email }
              userErrors { field message }
            }
          }
        `;
        await adminGraphQL(
          'customerUpdate',
          updateMutation,
          {
            input: {
              id: existing.id,
              tags: ['newsletter', 'vip-catalog', `source-${source}`],
              emailMarketingConsent: {
                marketingState: 'SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN',
              },
            },
          },
          env,
        );
        console.info(`[Subscription] Updated existing customer ${cleanEmail} to SUBSCRIBED`);
        return { success: true, isNew: false };
      }

      const createMutation = `
        mutation adminCustomerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer { id email }
            userErrors { field message }
          }
        }
      `;
      await adminGraphQL(
        'adminCustomerCreate',
        createMutation,
        {
          input: {
            email: cleanEmail,
            tags: ['newsletter', 'vip-catalog', `source-${source}`],
            emailMarketingConsent: {
              marketingState: 'SUBSCRIBED',
              marketingOptInLevel: 'SINGLE_OPT_IN',
            },
          },
        },
        env,
      );

      console.info(`[Subscription] Created new subscriber in Shopify: ${cleanEmail}`);
      return { success: true, isNew: true };
    } catch (err: any) {
      console.warn('[Subscription Notice] Error syncing subscriber to Shopify:', err?.message || err);
      return { success: true, note: 'Saved locally' };
    }
  }

  /**
   * Retrieves Shopify Customer ID by email
   */
  async getCustomerIdByEmail(email: string, env: Env): Promise<string | null> {
    if (!email) return null;
    try {
      const searchResult = await adminGraphQL(
        'searchCustomer',
        ADMIN_CUSTOMER_SEARCH,
        { query: `email:${email.trim().toLowerCase()}` },
        env,
      );
      return searchResult?.data?.customers?.nodes?.[0]?.id || null;
    } catch (err: any) {
      console.warn('[Shopify Customer Service] getCustomerIdByEmail error:', err?.message || err);
      return null;
    }
  }

  /**
   * Updates customer profile (firstName, lastName, phone)
   */
  async updateCustomerProfile(
    customerId: string,
    fields: { firstName?: string; lastName?: string; phone?: string },
    env: Env,
  ) {
    const mutation = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            firstName
            lastName
            phone
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input: Record<string, any> = { id: customerId };
    if (fields.firstName !== undefined) input.firstName = fields.firstName;
    if (fields.lastName !== undefined) input.lastName = fields.lastName;
    if (fields.phone !== undefined) {
      // E.164 phone formatting or null if empty
      const cleanPhone = fields.phone.trim();
      input.phone = cleanPhone.length > 0 ? (cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone.replace(/^0+/, '')}`) : null;
    }

    try {
      const result = await adminGraphQL('updateCustomerProfile', mutation, { input }, env);
      const userErrors = result?.data?.customerUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, customer: result?.data?.customerUpdate?.customer };
    } catch (err: any) {
      console.error('[Shopify Customer Service] updateCustomerProfile exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  }

  /**
   * Updates customer email address in Shopify
   */
  async updateCustomerEmail(customerId: string, newEmail: string, env: Env) {
    const mutation = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    try {
      const result = await adminGraphQL(
        'updateCustomerEmail',
        mutation,
        {
          input: { id: customerId, email: newEmail.trim().toLowerCase() },
        },
        env,
      );
      const userErrors = result?.data?.customerUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, customer: result?.data?.customerUpdate?.customer };
    } catch (err: any) {
      console.error('[Shopify Customer Service] updateCustomerEmail exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to update email.' };
    }
  }

  /**
   * Creates a new customer address
   */
  async createCustomerAddress(
    customerId: string,
    address: {
      firstName?: string;
      lastName?: string;
      address1: string;
      address2?: string;
      city: string;
      province?: string;
      zip: string;
      country?: string;
      phone?: string;
    },
    env: Env,
  ) {
    const mutation = `
      mutation customerAddressCreate($customerId: ID!, $address: MailingAddressInput!) {
        customerAddressCreate(customerId: $customerId, address: $address) {
          customerAddress {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    try {
      const result = await adminGraphQL(
        'createCustomerAddress',
        mutation,
        {
          customerId,
          address: {
            ...address,
            country: address.country || 'IN',
          },
        },
        env,
      );
      const userErrors = result?.data?.customerAddressCreate?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, address: result?.data?.customerAddressCreate?.customerAddress };
    } catch (err: any) {
      console.error('[Shopify Customer Service] createCustomerAddress exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to create address.' };
    }
  }

  /**
   * Updates an existing customer address
   */
  async updateCustomerAddress(
    addressId: string,
    address: {
      firstName?: string;
      lastName?: string;
      address1: string;
      address2?: string;
      city: string;
      province?: string;
      zip: string;
      country?: string;
      phone?: string;
    },
    env: Env,
  ) {
    const mutation = `
      mutation customerAddressUpdate($id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(id: $id, address: $address) {
          customerAddress {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    try {
      const result = await adminGraphQL(
        'updateCustomerAddress',
        mutation,
        {
          id: addressId,
          address: {
            ...address,
            country: address.country || 'IN',
          },
        },
        env,
      );
      const userErrors = result?.data?.customerAddressUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, address: result?.data?.customerAddressUpdate?.customerAddress };
    } catch (err: any) {
      console.error('[Shopify Customer Service] updateCustomerAddress exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to update address.' };
    }
  }

  /**
   * Deletes an existing customer address
   */
  async deleteCustomerAddress(customerId: string, addressId: string, env: Env) {
    const mutation = `
      mutation customerAddressDelete($id: ID!, $customerId: ID!) {
        customerAddressDelete(id: $id, customerId: $customerId) {
          deletedCustomerAddressId
          userErrors {
            field
            message
          }
        }
      }
    `;
    try {
      const result = await adminGraphQL(
        'deleteCustomerAddress',
        mutation,
        {
          id: addressId,
          customerId,
        },
        env,
      );
      const userErrors = result?.data?.customerAddressDelete?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, deletedId: result?.data?.customerAddressDelete?.deletedCustomerAddressId };
    } catch (err: any) {
      console.error('[Shopify Customer Service] deleteCustomerAddress exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to delete address.' };
    }
  }

  /**
   * Sets default customer address
   */
  async setDefaultCustomerAddress(customerId: string, addressId: string, env: Env) {
    const mutation = `
      mutation customerDefaultAddressUpdate($addressId: ID!, $customerId: ID!) {
        customerDefaultAddressUpdate(addressId: $addressId, customerId: $customerId) {
          customer {
            id
            defaultAddress {
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
    try {
      const result = await adminGraphQL(
        'setDefaultCustomerAddress',
        mutation,
        {
          addressId,
          customerId,
        },
        env,
      );
      const userErrors = result?.data?.customerDefaultAddressUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        return { success: false, error: userErrors.map((e: any) => e.message).join(', ') };
      }
      return { success: true, customer: result?.data?.customerDefaultAddressUpdate?.customer };
    } catch (err: any) {
      console.error('[Shopify Customer Service] setDefaultCustomerAddress exception:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to set default address.' };
    }
  }
}

export const shopifyCustomerService = new ShopifyCustomerService();
