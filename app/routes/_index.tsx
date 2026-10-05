import { useState, useEffect } from 'react';
import { useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { HOMEPAGE_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem, CollectionCardItem } from '~/types/storefront.types';
import { ProductGrid } from '~/components/products/ProductGrid';
import { useScrollReveal } from '~/hooks/useScrollReveal';
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

  // Hero Slider Banners definition for Vastra by Monty / MONTS
  const heroBanners = [
    {
      badge: 'Vastra by Monty is now MONTS',
      title: 'Timeless Luxury, Handcrafted Silhouettes',
      subtitle: 'Artisanal Rajasthan block prints & premium long-staple cotton apparel crafted for contemporary luxury.',
      ctaText: 'Shop All Products',
      ctaLink: '/collections/all',
      secondaryText: 'Explore Categories',
      secondaryLink: '#categories',
      image: heroImage1,
    },
    {
      badge: 'Signature Handcrafted Bags',
      title: 'Quilted Cotton Totes & Pouch Sets',
      subtitle: 'Block-printed canvas totes, multi-utility pouch sets, and everyday travel essentials made with care.',
      ctaText: 'Shop Bags & Totes',
      ctaLink: '/collections/monts-bags',
      secondaryText: 'View Collections',
      secondaryLink: '/collections',
      image: heroImage2,
    },
    {
      badge: 'Limited Artisanal Batches',
      title: 'Modern Minimalist Apparel & Accessories',
      subtitle: 'Discover handcrafted kurtas, casual shirts, heavyweight hoodies, and refined everyday essentials.',
      ctaText: 'Explore New Arrivals',
      ctaLink: '/collections/all',
      secondaryText: 'Wholesale Orders',
      secondaryLink: '/wholesale',
      image: heroImage3,
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero Carousel Autoplay
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
  };

  // Main Categories List for "Shop By Category" section
  const mainCategories = [
    {
      title: 'Tote Bags',
      handle: 'tote-bags',
      href: '/collections/tote-bags',
      subtitle: 'Quilted & handblocked cotton canvas totes',
      badge: 'Bags & Totes',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('tote'))?.featuredImage) || catalogImages[0],
    },
    {
      title: 'Pouch Bags (Toiletry Sets)',
      handle: 'pouch-bags-toiletry-sets',
      href: '/collections/pouch-bags-toiletry-sets',
      subtitle: 'Multi-utility organized pouch sets',
      badge: 'Pouches',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('pouch') || p.title.toLowerCase().includes('set'))?.featuredImage) || catalogImages[1],
    },
    {
      title: 'Mobile Sling Bags',
      handle: 'mobile-sling-bags',
      href: '/collections/mobile-sling-bags',
      subtitle: 'Cross-shoulder quilted cotton slings',
      badge: 'Slings',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('sling'))?.featuredImage) || catalogImages[2],
    },
    {
      title: 'Duffle Bags',
      handle: 'duffle-bags',
      href: '/collections/duffle-bags',
      subtitle: 'Artisanal weekenders & travel duffle bags',
      badge: 'Travel',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('duffle'))?.featuredImage) || catalogImages[3],
    },
    {
      title: 'Laptop Bags & Office',
      handle: 'laptop-bags-office-essentials',
      href: '/collections/laptop-bags-office-essentials',
      subtitle: 'Quilted laptop sleeves & office totes',
      badge: 'Work & Office',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('laptop'))?.featuredImage) || catalogImages[4],
    },
    {
      title: 'Multi-Utility Organizers',
      handle: 'multi-utility-organizers',
      href: '/collections/multi-utility-organizers',
      subtitle: 'Signature vanity & tool organizers',
      badge: 'Organizers',
      image: getImageUrl(allProducts.find((p) => p.title.toLowerCase().includes('organizer') || p.title.toLowerCase().includes('vanity'))?.featuredImage) || catalogImages[5],
    },
  ];

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

      {/* ─── 1. HERO BANNERS CAROUSEL ─── */}
      <section className="relative w-full overflow-hidden bg-[#060505]" style={{ minHeight: '82vh' }}>
        {heroBanners.map((banner, index) => (
          <div
            key={banner.title + index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out flex items-center justify-center ${
              index === currentSlide ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {/* Slide Background Image */}
            <div className="absolute inset-0">
              {banner.image && (
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover transform scale-105 transition-transform duration-10000"
                  style={{ objectPosition: 'center 30%' }}
                  onError={hideBrokenImage}
                />
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(6,5,5,0.2) 0%, rgba(6,5,5,0.65) 60%, rgba(6,5,5,0.9) 100%)',
                }}
              />
            </div>

            {/* Slide Banner Content */}
            <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center gap-6">
              <span
                className="text-xs uppercase tracking-[0.35em] font-semibold flex items-center gap-2 text-[#e8dfd5] bg-[#060505]/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c4622d]" />
                {banner.badge}
              </span>
              <h1
                className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-tight text-white drop-shadow-sm"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {banner.title}
              </h1>
              <p
                className="text-base sm:text-xl font-light max-w-xl text-white/90 leading-relaxed"
                style={{ fontFamily: "'Cormorant', serif" }}
              >
                {banner.subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to={banner.ctaLink}
                  className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all bg-[#c4622d] text-white hover:bg-[#923f12] active:scale-95 cursor-pointer shadow-lg"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {banner.ctaText}
                </Link>
                <a
                  href={banner.secondaryLink}
                  className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-[6px] transition-all text-white border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-xs active:scale-95 cursor-pointer"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {banner.secondaryText}
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Prev/Next Navigation Controls */}
        <button
          type="button"
          onClick={handlePrevSlide}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060505]/40 hover:bg-[#c4622d] text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
          aria-label="Previous banner slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={handleNextSlide}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#060505]/40 hover:bg-[#c4622d] text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
          aria-label="Next banner slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Carousel Indicator Dots */}
        <div className="absolute bottom-6 inset-x-0 z-20 flex items-center justify-center gap-2.5">
          {heroBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === currentSlide
                  ? 'w-8 h-2 bg-[#c4622d]'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ─── 2. SHOP BY CATEGORY SECTION ("later categories") ─── */}
      <section id="categories" className="py-16 md:py-24 bg-[#faf8f5] scroll-mt-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-4 border-b border-[#e8e4df] gap-4">
            <div>
              <span
                className="text-xs uppercase tracking-[0.25em] font-semibold block mb-1 text-[#8b7355]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Vastra by Monty Catalog
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#060505]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Shop By Category
              </h2>
              <p
                className="text-sm mt-1 text-[#686764]"
                style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem' }}
              >
                Explore handcrafted Rajasthan block prints, pure cotton shirts, tees, hoodies, and signature canvas totes.
              </p>
            </div>
            <Link
              to="/collections/all"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c4622d] hover:text-[#923f12] transition-colors shrink-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainCategories.map((category) => (
              <Link
                key={category.title}
                to={category.href}
                className="group relative overflow-hidden rounded-[8px] bg-white border border-[#e8e4df] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#f0edea]">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#e8dfd5] flex items-center justify-center text-[#8b7355]">
                      <ShoppingBag className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060505]/75 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/90 text-[#060505] shadow-xs">
                    {category.badge}
                  </span>
                </div>

                <div className="p-5 flex flex-col justify-between flex-1 bg-white">
                  <div>
                    <h3
                      className="text-lg font-bold text-[#060505] group-hover:text-[#c4622d] transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {category.title}
                    </h3>
                    <p
                      className="text-xs text-[#686764] mt-1 font-normal"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f0edea] flex items-center justify-between text-xs font-semibold text-[#c4622d]">
                    <span>Explore Products</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
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
