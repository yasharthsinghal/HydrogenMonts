/// <reference types="vite/client" />
/// <reference types="react-router" />

import type {
  HydrogenCartCustom,
  HydrogenSessionData,
} from '@shopify/hydrogen';
import type {
  createStorefrontClient,
  createCustomerAccountClient,
} from '@shopify/hydrogen';
import type { AppSession } from './app/lib/context.server';

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
    SHOP_ID?: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
    PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;

    // Shopify Admin API (Dynamic Client Credentials or Static Token)
    SHOPIFY_ADMIN_API_VERSION?: string;
    SHOPIFY_ADMIN_API_TOKEN?: string;
    SHOPIFY_ADMIN_CLIENT_ID?: string;
    SHOPIFY_ADMIN_CLIENT_SECRET?: string;

    // OTP & Email Provider (Google Gmail SMTP)
    OTP_EMAIL_PROVIDER?: 'smtp' | 'google_smtp';
    ENABLE_GOOGLE_SMTP?: string; // "true" | "false"

    // Google / Gmail SMTP Credentials
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_FROM?: string;

    // Contact Form Inquiries Recipient
    CONTACT_EMAIL_RECIPIENT?: string;

    // Discounts
    PREPAID_DISCOUNT_CODE?: string;

    // Location Service
    LOCATION_PROVIDER?: string;
    LOCATION_API_BASE_URL?: string;
    LOCATION_API_TIMEOUT_MS?: string;
  }

  /**
   * Application Execution Context
   */
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

declare module 'react-router' {
  interface AppLoadContext {
    env: Env;
    cart: HydrogenCartCustom;
    storefront: ReturnType<typeof createStorefrontClient>['storefront'];
    customerAccount: ReturnType<typeof createCustomerAccountClient>;
    session: AppSession;
    waitUntil: ExecutionContext['waitUntil'];
  }
}

declare module 'virtual:react-router/server-build' {
  import type { ServerBuild } from 'react-router';
  export const routes: ServerBuild['routes'];
  export const assets: ServerBuild['assets'];
  export const entry: ServerBuild['entry'];
  export const future: ServerBuild['future'];
  export const isSpaMode: ServerBuild['isSpaMode'];
  export const publicPath: ServerBuild['publicPath'];
}

