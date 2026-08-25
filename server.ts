// Virtual entry point for the app
// @ts-ignore
import * as reactRouterBuild from 'virtual:react-router/server-build';
import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from 'react-router';
import {
  createRequestHandler,
  createStorefrontClient,
  createCustomerAccountClient,
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';
import { logger } from '~/utils/logger.server';

export { AppSession } from '~/lib/context.server';
import { createHydrogenContext } from '~/lib/context.server';

/**
 * Universal fetch handler for Node 22, Vercel, and Cloudflare environments.
 */
export async function fetchHandler(
  request: Request,
  rawEnv?: Env,
  rawExecutionContext?: ExecutionContext,
): Promise<Response> {
  const startTime = performance.now();
  const url = new URL(request.url);

  try {
    const context = await createHydrogenContext(request, rawEnv, rawExecutionContext);
    const { session } = context;

    /**
     * Create React Router / Hydrogen Request Handler.
     */
    const handleRequest = createRequestHandler({
      build: reactRouterBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => context,
    });

    // Normalize host / x-forwarded-host headers for local loopback (localhost vs 127.0.0.1)
    let req = request;
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const forwardedHost = request.headers.get('x-forwarded-host');

    if (origin && (host || forwardedHost)) {
      try {
        const originHost = new URL(origin).host;
        const currentHost = forwardedHost || host;
        if (
          originHost !== currentHost &&
          (originHost.includes('localhost') || originHost.includes('127.0.0.1')) &&
          (currentHost?.includes('localhost') || currentHost?.includes('127.0.0.1'))
        ) {
          const headers = new Headers(request.headers);
          headers.set('host', originHost);
          headers.set('x-forwarded-host', originHost);
          req = new Request(request.url, {
            method: request.method,
            headers,
            body: request.body,
            // @ts-ignore
            duplex: 'half',
          });
        }
      } catch {
        // ignore invalid URLs
      }
    }

    const response = await handleRequest(req);

    if (
      session.has('cartId') ||
      session.has('customerAccessToken') ||
      session.has('customerEmail') ||
      session.has('otpData')
    ) {
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
    logger.error(`Server Error on ${request.method} ${url.pathname}`, error, {
      method: request.method,
      path: url.pathname,
      durationMs,
    });
    return new Response('An unexpected server error occurred', { status: 500 });
  }
}

export default {
  fetch: fetchHandler,
};
