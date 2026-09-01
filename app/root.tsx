import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useRouteError,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from 'react-router';
import { useState, useEffect } from 'react';
import appStyles from '~/styles/app.css?url';
import { Header } from '~/components/common/Header';
import { Footer } from '~/components/common/Footer';
import { MobileNav } from '~/components/common/MobileNav';
import { CartDrawer } from '~/components/cart/CartDrawer';

import { getHydrogenContext } from '~/lib/context.server';

export const links = () => [
  { rel: 'stylesheet', href: appStyles },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'preconnect', href: 'https://cdn.shopify.com' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
];

import { COLLECTIONS_QUERY } from '~/graphql/StorefrontQueries';
import type { CollectionCardItem } from '~/types/storefront.types';

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { cart, session, env, storefront } = await getHydrogenContext(context, request);
  let cartData = null;
  try {
    cartData = await cart.get();
  } catch (error) {
    // Session cart fallback
  }

  const customerAccessToken = session.get('customerAccessToken');

  let collections: CollectionCardItem[] = [];
  try {
    const collectionsData = await storefront.query(COLLECTIONS_QUERY, {
      variables: { first: 30 },
      cache: storefront.CacheShort(),
    });
    collections = (collectionsData.collections?.nodes || []) as CollectionCardItem[];
  } catch (error) {
    console.error('Root loader collections query notice:', error);
  }

  return {
    cart: cartData,
    isLoggedIn: Boolean(customerAccessToken),
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN || '',
    collections,
  };
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root');
  const cart = data?.cart;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body
        className="min-h-screen flex flex-col antialiased bg-[#f5f0e8] text-[#2c2c2c]"
        suppressHydrationWarning
      >
        <Header
          cartCount={cart?.totalQuantity ?? 0}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1">
          {children}
        </main>

        <Footer />

        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'An unexpected error occurred';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-20 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 className="text-5xl font-bold mb-4 text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
        {errorStatus}
      </h1>
      <p className="text-base text-[#686764] mb-8 max-w-md mx-auto">
        {errorMessage}
      </p>
      <a
        href="/"
        className="inline-block px-6 py-3 bg-[#c4622d] text-white rounded-[6px] text-sm font-semibold hover:bg-[#923f12] transition-colors"
      >
        Return to Storefront
      </a>
    </div>
  );
}
