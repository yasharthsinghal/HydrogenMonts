// Virtual entry point for the app
// @ts-ignore
import * as remixBuild from 'virtual:remix/server-build';
import {
  createRequestHandler,
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from '@shopify/remix-oxygen';
import {
  createStorefrontClient,
  createCustomerAccountClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';

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

import { logger } from '~/utils/logger.server';

/**
 * Export a fetch handler in format required by OpenWorker / Oxygen.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    try {
      /**
       * Open an isolated cookie-based session for the visitor.
       */
      const session = await AppSession.init(request, [
        env.SESSION_SECRET || 'monts-default-session-secret',
      ]);

      /**
       * Create Storefront Client.
       */
      const { storefront } = createStorefrontClient({
        i18n: { language: 'EN', country: 'IN' },
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken:
          env.PRIVATE_STOREFRONT_API_TOKEN &&
          env.PRIVATE_STOREFRONT_API_TOKEN.length > 20 &&
          !env.PRIVATE_STOREFRONT_API_TOKEN.includes('your_')
            ? env.PRIVATE_STOREFRONT_API_TOKEN
            : undefined,
        storeDomain: env.PUBLIC_STORE_DOMAIN,
        storefrontId: env.PUBLIC_STOREFRONT_ID,
        storefrontApiVersion: '2024-10',
      });

      /**
       * Create Customer Account API Client.
       */
      const customerAccount = createCustomerAccountClient({
        session: session as any,
        customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
        customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
        request,
      });

      /**
       * Create Hydrogen Cart Handler.
       */
      const cart = createCartHandler({
        storefront,
        customerAccount,
        getCartId: cartGetIdDefault(request.headers),
        setCartId: cartSetIdDefault(),
      });

      /**
       * Create Remix Request Handler.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => ({
          session: session.session,
          storefront,
          customerAccount,
          cart,
          env,
          waitUntil: (p: Promise<unknown>) => executionContext.waitUntil(p),
        }),
      });

      const response = await handleRequest(request);

      if (session.has('cartId') || session.has('customerAccessToken')) {
        response.headers.append('Set-Cookie', await session.commit());
      }

      const durationMs = Math.round(performance.now() - startTime);
      logger.info(`${request.method} ${url.pathname} -> ${response.status}`, {
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs,
      });

      return response;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      logger.error(`Oxygen Worker Error on ${request.method} ${url.pathname}`, error, {
        method: request.method,
        path: url.pathname,
        durationMs,
      });
      return new Response('An unexpected server error occurred', { status: 500 });
    }
  },
};
