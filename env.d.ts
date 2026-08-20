/// <reference types="@remix-run/react" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {
  HydrogenCartCustom,
  HydrogenSessionData,
} from '@shopify/hydrogen';
import type {
  createStorefrontClient,
  createCustomerAccountClient,
} from '@shopify/hydrogen';

declare global {
  /**
   * Environment variables injected at runtime
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN?: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID?: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
  }

  /**
   * Application Execution Context
   */
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

declare module '@shopify/remix-oxygen' {
  interface AppLoadContext {
    env: Env;
    cart: HydrogenCartCustom;
    storefront: ReturnType<typeof createStorefrontClient>['storefront'];
    customerAccount: ReturnType<typeof createCustomerAccountClient>;
    session: HydrogenSession;
    waitUntil: ExecutionContext['waitUntil'];
  }
}

declare module 'virtual:remix/server-build' {
  import type { ServerBuild } from '@shopify/remix-oxygen';
  export const routes: ServerBuild['routes'];
  export const assets: ServerBuild['assets'];
  export const entry: ServerBuild['entry'];
  export const future: ServerBuild['future'];
  export const isSpaMode: ServerBuild['isSpaMode'];
  export const publicPath: ServerBuild['publicPath'];
}
