import { useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { HOMEPAGE_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem, CollectionCardItem } from '~/types/storefront.types';
import { ProductGrid } from '~/components/products/ProductGrid';
import { useScrollReveal } from '~/hooks/useScrollReveal';
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Globe,
  Headphones,
  Truck,
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'MONTS | Artisanal Handcrafted Ready-to-Wear & Bags' },
    {
      name: 'description',
      content:
        'Explore artisanal craftsmanship, handcrafted cotton totes, and minimalist silhouettes on MONTS.',
    },
    { property: 'og:title', content: 'MONTS | Artisanal Handcrafted Storefront' },
    { property: 'og:type', content: 'website' },
  ];
};

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = await getHydrogenContext(context, request);
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  let homepageData;
  try {
    const response = await storefront.query(HOMEPAGE_QUERY, {
      variables: {
        collectionsFirst: 3,
        productsFirst: 8,
      },
      cache: storefront.CacheNone(),
    });
    homepageData = response;
  } catch (error) {
    console.error('Homepage query error:', error);
    homepageData = {
      shop: { name: 'MONTS', description: 'Artisanal Handcrafted Storefront' },
      collections: { nodes: [] },
      featuredProducts: { nodes: [] },
      allProducts: { nodes: [] },
    };
  }

  return {
    baseUrl,
    shop: homepageData.shop,
    collections: (homepageData.collections?.nodes || []) as CollectionCardItem[],
    featuredProducts: (homepageData.featuredProducts?.nodes || []) as ProductCardItem[],
    allProducts: (homepageData.allProducts?.nodes || []) as ProductCardItem[],
  };
}

export default function IndexRoute() {
  useScrollReveal();
  const { baseUrl, collections, featuredProducts, allProducts } = useLoaderData<typeof loader>();

  const heroImage =
    featuredProducts[0]?.featuredImage?.url ||
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1600&q=85';

  const schemaJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'MONTS',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        sameAs: [
          'https://instagram.com',
          'https://facebook.com',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'MONTS',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <div className="flex flex-col gap-0 bg-[#f5f0e8]">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />

      {/* ─── 1. HERO BANNER ─── */}
      <section
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ minHeight: '85vh' }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="MONTS Luxury Collection"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(6,5,5,0.15) 0%, rgba(6,5,5,0.55) 60%, rgba(6,5,5,0.85) 100%)',
            }}
          />
        </div>

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center gap-6">
          <span
            className="text-xs uppercase tracking-[0.35em] font-medium flex items-center gap-2 text-[#e8dfd5]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ready-to-Wear Collection
          </span>
          <h1
            className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Timeless Luxury,<br />Handcrafted Silhouettes
          </h1>
          <p
            className="text-base sm:text-lg font-light max-w-xl text-white/80"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}
          >
            Explore artisanal craftsmanship and minimalist designs built with premium long-staple fabrics.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/collections/all"
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all bg-[#c4622d] text-white hover:bg-[#923f12] cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Shop The Collection
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all text-white border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-xs cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. CURATED SERIES / FEATURED COLLECTIONS ─── */}
      {collections.length > 0 && (
        <section className="py-20 bg-[#f5f0e8] reveal">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <div className="flex justify-between items-end mb-10 pb-4 border-b border-[#e8e4df]">
              <div>
                <span
                  className="text-xs uppercase tracking-[0.2em] font-medium block mb-1 text-[#8b7355]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Artisanal Heritage
                </span>
                <h2
                  className="text-2xl md:text-3xl font-bold text-[#060505]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Curated Series
                </h2>
                <p
                  className="text-sm mt-1 text-[#686764]"
                  style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
                >
                  Hand-block prints, quilted cotton textures, and limited luxury batch pieces.
                </p>
              </div>
              <Link
                to="/collections"
                className="flex items-center gap-1 text-xs font-semibold text-[#c4622d] hover:text-[#923f12] transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                View all collections <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {collections.slice(0, 3).map((col, idx) => {
                const fallbackImages = [
                  'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&q=80',
                  'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80',
                  'https://images.unsplash.com/photo-1602810316693-3667c854239a?w=800&q=80',
                ];
                const colImage = col.image?.url || fallbackImages[idx % 3];

                return (
                  <Link
                    key={col.id}
                    to={`/collections/${col.handle}`}
                    className="group relative overflow-hidden flex items-end p-6 rounded-[2px] border border-[#e8e4df]/60"
                    style={{ aspectRatio: '4/5' }}
                  >
                    <img
                      src={colImage}
                      alt={col.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(6,5,5,0.85) 0%, rgba(6,5,5,0.2) 60%, transparent 100%)',
                      }}
                    />
                    <div className="relative z-10 text-white flex flex-col gap-1">
                      {col.products?.totalCount !== undefined && (
                        <span
                          className="text-[10px] font-medium uppercase tracking-widest text-[#e8dfd5]"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {col.products.totalCount} Products
                        </span>
                      )}
                      <h3
                        className="text-xl font-bold"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {col.title}
                      </h3>
                      <span
                        className="text-xs flex items-center gap-1 mt-1 text-white/70 group-hover:underline"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Explore series <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 3. DOUBLE EDITORIAL BANNER ─── */}
      <section className="w-full reveal">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div
            className="relative overflow-hidden flex items-end p-10 md:p-14"
            style={{ minHeight: '480px' }}
          >
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"
              alt="New Arrivals"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(6,5,5,0.75) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10 flex flex-col gap-3">
              <span
                className="text-xs uppercase tracking-[0.2em] font-medium text-[#e8dfd5]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                New Arrivals
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Latest Collection
              </h2>
              <Link
                to="/collections/all"
                className="inline-flex items-center gap-2 text-sm font-semibold mt-2 text-white underline underline-offset-4"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div
            className="relative overflow-hidden flex items-end p-10 md:p-14 bg-[#e8dfd5]"
            style={{ minHeight: '480px' }}
          >
            <img
              src="https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80"
              alt="Artisan Craft"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(6,5,5,0.65) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10 flex flex-col gap-3">
              <span
                className="text-xs uppercase tracking-[0.2em] font-medium text-[#e8dfd5]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Artisan Craft
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Handcrafted Heritage
              </h2>
              <Link
                to="/collections"
                className="inline-flex items-center gap-2 text-sm font-semibold mt-2 text-white underline underline-offset-4"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Explore <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. FEATURED PRODUCTS ─── */}
      <section className="py-20 bg-[#f5f0e8] reveal">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span
              className="text-xs uppercase tracking-[0.25em] font-medium block mb-2 text-[#8b7355]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Signature Collection
            </span>
            <h2
              className="text-3xl font-bold mb-3 text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Handcrafted Artisanal Essentials
            </h2>
            <p
              className="text-sm text-[#686764]"
              style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
            >
              Meticulously handcrafted block-printed cotton totes, quilted travel pouches, and minimalist accessories.
            </p>
          </div>
          <ProductGrid products={featuredProducts} />
        </div>
      </section>

      {/* ─── 5. FULL CATALOG GRID ─── */}
      <section className="py-20 bg-[#f8f8f8] reveal">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex justify-between items-center mb-10 pb-4 border-b border-[#e8e4df]">
            <div>
              <span
                className="text-xs uppercase tracking-[0.2em] font-medium block mb-1 text-[#8b7355]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Full Catalog
              </span>
              <h2
                className="text-2xl md:text-3xl font-bold text-[#060505]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                All Handcrafted Pieces
              </h2>
            </div>
            <Link
              to="/collections/all"
              className="flex items-center gap-1 text-xs font-semibold text-[#c4622d] hover:text-[#923f12] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Browse full catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ProductGrid products={allProducts} />
        </div>
      </section>

      {/* ─── 6. VALUE PROPOSITION BAR ─── */}
      <section
        className="py-14 bg-[#e8dfd5]"
        style={{
          borderTop: '1px solid #dac7b4',
          borderBottom: '1px solid #dac7b4',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#c4622d]/10 text-[#c4622d]">
              <Truck className="w-6 h-6" />
            </div>
            <h4
              className="text-base font-bold text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Free Domestic Shipping
            </h4>
            <p
              className="text-sm text-[#686764]"
              style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
            >
              Complimentary insured shipping on all orders across India (Prepaid & COD).
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#c4622d]/10 text-[#c4622d]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4
              className="text-base font-bold text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Extra 15% Prepaid Discount
            </h4>
            <p
              className="text-sm text-[#686764]"
              style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
            >
              Automatic 15% discount applied at checkout on all online prepaid payments.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#c4622d]/10 text-[#c4622d]">
              <Globe className="w-6 h-6" />
            </div>
            <h4
              className="text-base font-bold text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Global Express Delivery
            </h4>
            <p
              className="text-sm text-[#686764]"
              style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
            >
              Express transit to USA, UK, Singapore, Japan & Dubai calculated strictly at actuals.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
