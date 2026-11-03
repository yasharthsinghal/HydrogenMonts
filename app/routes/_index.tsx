import { useState, useEffect } from 'react';
import { useLoaderData, Link, useNavigate, useLocation, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { HOMEPAGE_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem, CollectionCardItem } from '~/types/storefront.types';
import { ProductGrid } from '~/components/products/ProductGrid';
import { useScrollReveal } from '~/hooks/useScrollReveal';
import { HeroBannerSlider } from '~/components/home/HeroBannerSlider';
import heroBannersConfig from '~/data/hero-banners.json';
import type { HeroBannerItem } from '~/types/banner.types';
import collectionsConfig from '~/data/collections.json';
import type { CollectionConfigItem } from '~/types/collection.types';
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Globe,
  Headphones,
  Truck,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'MONTS | Artisanal Handcrafted Ready-to-Wear & Bags (Vastra by Monty)' },
    {
      name: 'description',
      content:
        'Explore artisanal block prints, handcrafted cotton apparel, quilted totes, and minimalist silhouettes on MONTS (formerly Vastra by Monty).',
    },
    { property: 'og:title', content: 'MONTS | Artisanal Handcrafted Storefront' },
    { property: 'og:type', content: 'website' },
  ];
};

import { getHydrogenContext } from '~/lib/context.server';

const getImageUrl = (image?: { url?: string | null } | null) =>
  typeof image?.url === 'string' && image.url.trim().length > 0 ? image.url : null;

const hideBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = 'none';
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = await getHydrogenContext(context, request);
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  let homepageData;
  try {
    const response = await storefront.query(HOMEPAGE_QUERY, {
      variables: {
        collectionsFirst: 6,
        featuredProductsFirst: 8,
        allProductsFirst: 250,
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

  const PAGE_SIZE = 25;
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const requestedPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const totalCatalogCount = (homepageData.allProducts?.nodes || []).length;
  const totalPages = Math.max(1, Math.ceil(totalCatalogCount / PAGE_SIZE));
  const validPage = Math.min(requestedPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedCatalog = (homepageData.allProducts?.nodes || []).slice(
    startIndex,
    startIndex + PAGE_SIZE
  ) as ProductCardItem[];

  const pagination = {
    currentPage: validPage,
    totalPages,
    totalCount: totalCatalogCount,
    pageSize: PAGE_SIZE,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
    startItem: totalCatalogCount === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + PAGE_SIZE, totalCatalogCount),
  };

  return {
    baseUrl,
    shop: homepageData.shop,
    collections: (homepageData.collections?.nodes || []) as CollectionCardItem[],
    featuredProducts: (homepageData.featuredProducts?.nodes || []) as ProductCardItem[],
    allProducts: (homepageData.allProducts?.nodes || []) as ProductCardItem[],
    paginatedCatalog,
    pagination,
  };
}

export default function IndexRoute() {
  useScrollReveal();
  const { baseUrl, collections, featuredProducts, allProducts, paginatedCatalog, pagination } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('page', newPage.toString());
    navigate(`?${searchParams.toString()}#all-products`, { preventScrollReset: true });
    const el = document.getElementById('all-products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const catalogImages = [
    ...featuredProducts.map((product) => getImageUrl(product.featuredImage)),
    ...allProducts.map((product) => getImageUrl(product.featuredImage)),
    ...collections.map((collection) => getImageUrl(collection.image)),
  ].filter(Boolean) as string[];

  const heroImage1 = catalogImages[0] || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-lifestyle-1.jpg';
  const heroImage2 = catalogImages[1] || heroImage1;
  const heroImage3 = catalogImages[2] || heroImage1;
  const newArrivalsImage = getImageUrl(allProducts[0]?.featuredImage) || catalogImages[1] || heroImage1;
  const craftImage = getImageUrl(collections[0]?.image) || catalogImages[2] || heroImage1;

  // JSON-driven hero banners mapping with catalog fallback resilience
  const heroBanners: HeroBannerItem[] = (heroBannersConfig as HeroBannerItem[]).map((banner, idx) => ({
    ...banner,
    imageDesktop: banner.imageDesktop || catalogImages[idx % (catalogImages.length || 1)] || heroImage1,
    imageMobile: banner.imageMobile || banner.imageDesktop || catalogImages[idx % (catalogImages.length || 1)] || heroImage1,
  }));

  // Main 12 Categories List for "Shop By Category" derived from collections.json
  const activeJsonCollections = (collectionsConfig as CollectionConfigItem[]).filter(
    (c) => c.isActive !== false && c.handle !== 'all'
  );

  const mainCategories = activeJsonCollections.map((col, idx) => {
    const matchedProduct = allProducts.find((p) => {
      const title = p.title.toLowerCase();
      const keywords = col.keywords || [col.handle];
      return keywords.some((k) => title.includes(k.toLowerCase()));
    });

    return {
      title: col.title,
      handle: col.handle,
      href: `/collections/${col.handle}`,
      subtitle: col.subtitle || col.description || '',
      badge: col.badge || 'Artisanal',
      image:
        getImageUrl(matchedProduct?.featuredImage) ||
        col.image ||
        catalogImages[idx % Math.max(catalogImages.length, 1)],
    };
  });

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

      {/* ─── 1. HERO BANNERS CAROUSEL (JSON-Driven) ─── */}
      <HeroBannerSlider banners={heroBanners} fallbackImage={heroImage1} />

      {/* ─── 2. SHOP BY CATEGORY SECTION ("later categories") ─── */}
      <section id="categories" className="py-12 md:py-16 bg-[#faf8f5] scroll-mt-20">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b border-[#e8e4df] gap-3">
            <div>
              <span
                className="text-xs uppercase tracking-[0.25em] font-semibold block mb-1 text-[#8b7355]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Vastra by Monty Catalog
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#060505]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Shop By Category
              </h2>
              <p
                className="text-xs sm:text-sm mt-0.5 text-[#686764]"
                style={{ fontFamily: "'Cormorant', serif", fontSize: '1.05rem' }}
              >
                Explore handcrafted Rajasthan block prints, pure cotton shirts, quilted bags, and signature canvas totes.
              </p>
            </div>
            <Link
              to="/collections"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c4622d] hover:text-[#923f12] transition-colors shrink-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span>View All Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-4">
            {mainCategories.map((category) => (
              <Link
                key={category.title}
                to={category.href}
                className="group relative overflow-hidden rounded-[8px] bg-white border border-[#e8e4df] shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col hover:-translate-y-0.5"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#f0edea]">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                      <ShoppingBag className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060505]/65 via-transparent to-transparent opacity-70 group-hover:opacity-80 transition-opacity" />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-bold uppercase tracking-wider bg-white/95 text-[#060505] shadow-2xs backdrop-blur-xs">
                    {category.badge}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-white">
                  <div>
                    <h3
                      className="text-xs sm:text-sm font-bold text-[#060505] group-hover:text-[#c4622d] transition-colors leading-tight line-clamp-1"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {category.title}
                    </h3>
                    <p
                      className="text-[10px] sm:text-[11px] text-[#686764] mt-0.5 font-normal line-clamp-1"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#f0edea] flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-[#c4622d]">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. CURATED SERIES / FEATURED COLLECTIONS ─── */}
      {collections.length > 0 && (
        <section className="py-20 bg-[#f5f0e8] reveal">
          <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5">
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
                const colImage = getImageUrl(col.image) || catalogImages[idx % catalogImages.length];

                return (
                  <Link
                    key={col.id}
                    to={`/collections/${col.handle}`}
                    className="group relative overflow-hidden flex items-end p-6 rounded-[2px] border border-[#e8e4df]/60"
                    style={{ aspectRatio: '4/5' }}
                  >
                    {colImage && (
                      <img
                        src={colImage}
                        alt={col.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={hideBrokenImage}
                      />
                    )}
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
            {newArrivalsImage && (
              <img
                src={newArrivalsImage}
                alt="New Arrivals"
                className="absolute inset-0 w-full h-full object-cover"
                onError={hideBrokenImage}
              />
            )}
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
            {craftImage && (
              <img
                src={craftImage}
                alt="Artisan Craft"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                onError={hideBrokenImage}
              />
            )}
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
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5">
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

      {/* ─── 5. FULL CATALOG GRID (25 Products Per Page with Pagination) ─── */}
      <section id="all-products" className="py-20 bg-[#f8f8f8] reveal scroll-mt-20">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-4 border-b border-[#e8e4df] gap-4">
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
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#c4622d] hover:text-[#923f12] transition-colors shrink-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Browse complete collection <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ProductGrid products={paginatedCatalog} />

          {/* 25-Product Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div
              className="mt-12 pt-6 border-t border-[#e8e4df] flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <p className="text-xs text-[#686764]">
                Showing <span className="font-semibold text-[#060505]">{pagination.startItem}</span>–
                <span className="font-semibold text-[#060505]">{pagination.endItem}</span> of{' '}
                <span className="font-semibold text-[#060505]">{pagination.totalCount}</span> products (25 per page)
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[#e8e4df] text-[#1a1a1a] bg-[#faf8f5] hover:bg-[#f0edea] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Previous catalog page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      pagination.totalPages > 7 &&
                      pageNum !== 1 &&
                      pageNum !== pagination.totalPages &&
                      Math.abs(pageNum - pagination.currentPage) > 1
                    ) {
                      if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                        return (
                          <span key={pageNum} className="px-1 text-xs text-[#8b7355]">
                            …
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-[4px] transition-all cursor-pointer ${
                          pageNum === pagination.currentPage
                            ? 'bg-[#c4622d] text-white shadow-xs'
                            : 'border border-[#e8e4df] text-[#1a1a1a] bg-[#faf8f5] hover:bg-[#f0edea]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[#e8e4df] text-[#1a1a1a] bg-[#faf8f5] hover:bg-[#f0edea] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Next catalog page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
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
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
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
