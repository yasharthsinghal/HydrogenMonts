import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
  type AppLoadContext,
} from 'react-router';
import {
  createStorefrontClient,
  createCustomerAccountClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
  InMemoryCache,
} from '@shopify/hydrogen';

// Shared in-memory cache instance for Storefront API sub-requests (Node.js & Vercel)
const defaultInMemoryCache = new InMemoryCache();

/**
 * Standard Hydrogen cookie session wrapper implementing HydrogenSession interface.
 */
export class AppSession {
  public session: Session;
  private sessionStorage: SessionStorage;

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.sessionStorage = sessionStorage;
    this.session = session;
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: '__session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
        secure: process.env.NODE_ENV === 'production',
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));
    return new this(storage, session);
  }

  has(key: string) {
    return this.session.has(key);
  }

  get(key: string) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  unset(key: string) {
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}

/**
 * Creates the Hydrogen load context for a given request.
 */
export async function createHydrogenContext(
  request: Request,
  rawEnv?: Env,
  rawExecutionContext?: ExecutionContext,
): Promise<AppLoadContext> {
  const env: Env = (
    rawEnv && Object.keys(rawEnv).length > 0
      ? rawEnv
      : (process.env as unknown as Env)
  ) || (process.env as unknown as Env);

  const executionContext = rawExecutionContext || {
    waitUntil: (p: Promise<unknown>) => {
      p.catch((err) => console.error('[Background Task Error]', err));
    },
    passThroughOnException: () => {},
  };

  const sessionSecret =
    env.SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    'monts-fallback-session-secret-key-32-chars-min';

  const session = await AppSession.init(request, [sessionSecret]);

  const { storefront } = createStorefrontClient({
    cache: defaultInMemoryCache,
    i18n: { language: 'EN', country: 'IN' },
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN || process.env.PUBLIC_STOREFRONT_API_TOKEN || '',
    privateStorefrontToken:
      (env.PRIVATE_STOREFRONT_API_TOKEN || process.env.PRIVATE_STOREFRONT_API_TOKEN) &&
      (env.PRIVATE_STOREFRONT_API_TOKEN || process.env.PRIVATE_STOREFRONT_API_TOKEN)!.length > 20 &&
      !(env.PRIVATE_STOREFRONT_API_TOKEN || process.env.PRIVATE_STOREFRONT_API_TOKEN)!.includes('your_')
        ? (env.PRIVATE_STOREFRONT_API_TOKEN || process.env.PRIVATE_STOREFRONT_API_TOKEN)
        : undefined,
    storeDomain: env.PUBLIC_STORE_DOMAIN || process.env.PUBLIC_STORE_DOMAIN || 'monts-art.myshopify.com',
    storefrontId: env.PUBLIC_STOREFRONT_ID || process.env.PUBLIC_STOREFRONT_ID,
  });

  const customerAccountId =
    (env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID) &&
    !(env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID)!.includes('your_')
      ? (env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || process.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID)!
      : 'shp_c8a77f98-9d41-4770-9be0-128a8d167ef0';

  const shopId = env.SHOP_ID || process.env.SHOP_ID || env.PUBLIC_STOREFRONT_ID || process.env.PUBLIC_STOREFRONT_ID || '';

  const customerAccount = createCustomerAccountClient({
    session: session as any,
    customerAccountId,
    shopId,
    request,
    waitUntil: (p: Promise<unknown>) => executionContext.waitUntil(p),
  });

  const cart = createCartHandler({
    storefront,
    customerAccount,
    getCartId: cartGetIdDefault(request.headers),
    setCartId: cartSetIdDefault(),
  });

  return {
    session,
    storefront,
    customerAccount,
    cart,
    env: {
      ...process.env,
      ...env,
    },
    waitUntil: (p: Promise<unknown>) => executionContext.waitUntil(p),
  };
}

/**
 * Ensures that the loader/action context contains all required Hydrogen clients.
 * If running on Vercel without custom server middleware, this initializes the context on-demand.
 */
export async function getHydrogenContext(
  context: any,
  request: Request,
): Promise<AppLoadContext> {
  if (context?.storefront && context?.cart && context?.session && context?.env) {
    return context as AppLoadContext;
  }
  return createHydrogenContext(request, context?.env);
}
