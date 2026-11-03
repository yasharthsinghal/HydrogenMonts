import React from 'react';
import { useLoaderData, useNavigate, useLocation, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { COLLECTION_BY_HANDLE_QUERY, ALL_PRODUCTS_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem } from '~/types/storefront.types';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { ProductGrid } from '~/components/products/ProductGrid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import collectionsConfig from '~/data/collections.json';
import type { CollectionConfigItem } from '~/types/collection.types';

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startItem: number;
  endItem: number;
}

const PAGE_SIZE = 25;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.collection) {
    return [{ title: 'Collection Not Found | MONTS' }];
  }
  return [
    { title: `${data.collection.title} | MONTS Collection` },
    {
      name: 'description',
      content:
        data.collection.description ||
        `Explore handcrafted ${data.collection.title} by MONTS.`,
    },
  ];
};

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { handle } = params;
  const { storefront } = await getHydrogenContext(context, request);
  const url = new URL(request.url);
  const canonicalUrl = `${url.protocol}//${url.host}${url.pathname}`;

  if (!handle) {
    throw new Response('Collection handle is required', { status: 400 });
  }

  const sort = url.searchParams.get('sort') || 'best-selling';
  const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
  const requestedPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  // Sanitize handle
  const sanitizedHandle = decodeURIComponent(handle)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  // Look up JSON collection configuration
  const jsonCollection = (collectionsConfig as CollectionConfigItem[]).find(
    (c) => c.handle === sanitizedHandle
  );

  let sortKey: any = 'BEST_SELLING';
  let reverse = false;

  switch (sort) {
    case 'price-asc':
      sortKey = 'PRICE';
      reverse = false;
      break;
    case 'price-desc':
      sortKey = 'PRICE';
      reverse = true;
      break;
    case 'created-desc':
      sortKey = 'CREATED_AT';
      reverse = true;
      break;
    case 'title-asc':
      sortKey = 'TITLE';
      reverse = false;
      break;
    default:
      sortKey = 'BEST_SELLING';
      reverse = false;
  }

  let allProducts: ProductCardItem[] = [];
  let collectionTitle = jsonCollection?.title || 'Collection';
  let collectionDescription = jsonCollection?.description || '';
  let collectionBadge = jsonCollection?.badge || (sanitizedHandle === 'all' ? 'Complete Catalog' : 'Curated Series');
  let collectionSubtitle = jsonCollection?.subtitle || '';
  let collectionImage = jsonCollection?.image ? { url: jsonCollection.image, altText: jsonCollection.title } : null;
  let collectionBannerImage = jsonCollection?.bannerImage || jsonCollection?.image || null;

  // 1. Handle "all" products catalog
  if (sanitizedHandle === 'all') {
    try {
      const data = await storefront.query(ALL_PRODUCTS_QUERY, {
        variables: {
          first: 250,
          sortKey: sortKey === 'CREATED' ? 'CREATED_AT' : sortKey,
          reverse,
        },
        cache: storefront.CacheNone(),
      });
      allProducts = (data?.products?.nodes || []) as ProductCardItem[];
    } catch (error) {
      console.error('All products query error:', error);
      throw new Response('Error loading products', { status: 500 });
    }
  } else {
    // 2. Query specific collection from Storefront API
    let rawCollection;
    try {
      const data = await storefront.query(COLLECTION_BY_HANDLE_QUERY, {
        variables: {
          handle: sanitizedHandle,
          first: 250,
          sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey,
          reverse,
        },
        cache: storefront.CacheNone(),
      });
      rawCollection = data?.collection;
    } catch (error) {
      console.error('Collection query error:', error);
    }

    if (rawCollection && rawCollection.products?.nodes?.length > 0) {
      allProducts = rawCollection.products.nodes as ProductCardItem[];
      collectionTitle = jsonCollection?.title || rawCollection.title;
      collectionDescription = jsonCollection?.description || rawCollection.description || '';
      collectionImage = rawCollection.image || collectionImage;
    } else {
      // 3. Fallback: filter store products by JSON keywords or handle tokens
      try {
        const fallbackData = await storefront.query(ALL_PRODUCTS_QUERY, {
          variables: {
            first: 250,
            sortKey: sortKey === 'CREATED' ? 'CREATED_AT' : sortKey,
            reverse,
          },
          cache: storefront.CacheNone(),
        });

        const storeProducts = (fallbackData?.products?.nodes || []) as ProductCardItem[];
        const keywords = (jsonCollection?.keywords && jsonCollection.keywords.length > 0)
          ? jsonCollection.keywords.map((k) => k.toLowerCase())
          : sanitizedHandle.split('-').filter((k) => k.length > 2);

        allProducts = storeProducts.filter((product) => {
          const title = product.title.toLowerCase();
          const handleStr = product.handle.toLowerCase();
          return keywords.some((k) => title.includes(k) || handleStr.includes(k));
        });

        // If no keyword match, show all products so page is never barren
        if (allProducts.length === 0) {
          allProducts = storeProducts;
        }

        const prettyTitle = sanitizedHandle
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        collectionTitle = jsonCollection?.title || prettyTitle;
      } catch (fallbackErr) {
        console.error('Fallback products query error:', fallbackErr);
        throw new Response('Collection Not Found', { status: 404 });
      }
    }
  }

  // 4. Calculate 25-products-per-page Pagination
  const totalCount = allProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const validPage = Math.min(requestedPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedProducts = allProducts.slice(startIndex, startIndex + PAGE_SIZE);

  const pagination: PaginationData = {
    currentPage: validPage,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
    startItem: totalCount === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + PAGE_SIZE, totalCount),
  };

  const collection = {
    id: `col-${sanitizedHandle}`,
    title: collectionTitle,
    handle: sanitizedHandle,
    badge: collectionBadge,
    subtitle: collectionSubtitle,
    description: collectionDescription,
    image: collectionImage,
    bannerImage: collectionBannerImage,
  };

  return {
    collection,
    products: paginatedProducts,
    pagination,
    currentSort: sort,
    canonicalUrl,
  };
}

export default function CollectionDetailRoute() {
  const { collection, products, pagination, currentSort, canonicalUrl } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('sort', e.target.value);
    searchParams.set('page', '1'); // Reset to page 1 on sort change
    navigate(`?${searchParams.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage) {
      return;
    }
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('page', newPage.toString());
    navigate(`?${searchParams.toString()}`);
    // Smooth scroll to top of collection
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: collection.title,
    description: collection.description,
    url: canonicalUrl,
    numberOfItems: pagination.totalCount,
    itemListElement: products.map((prod: any, idx: number) => ({
      '@type': 'ListItem',
      position: (pagination.currentPage - 1) * pagination.pageSize + idx + 1,
      name: prod.title,
      url: `/products/${prod.handle}`,
    })),
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5 py-8 md:py-10">
      <Breadcrumb
        items={[
          { label: 'Collections', href: '/collections' },
          { label: collection.title },
        ]}
        className="mb-8"
      />

      {/* Collection Header */}
      <div className="mb-10 pb-6 border-b border-[#e8e4df]">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {collection.badge}
          </span>
          {pagination.totalCount > 0 && (
            <span className="text-[11px] font-medium text-[#686764] bg-[#f0edea] px-2 py-0.5 rounded-full">
              {pagination.totalCount} items
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1
              className="text-3xl md:text-4xl font-bold text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {collection.title}
            </h1>
            {collection.description && (
              <p
                className="text-base text-[#686764] mt-2 max-w-2xl"
                style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem' }}
              >
                {collection.description}
              </p>
            )}
          </div>

          {/* Sort Selector & Count */}
          <div className="flex items-center gap-3 shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="text-xs font-semibold text-[#686764]">Sort By:</span>
            <select
              value={currentSort}
              onChange={handleSortChange}
              className="text-xs font-medium py-2 px-3 bg-[#faf8f5] text-[#1a1a1a] border border-[#e8e4df] rounded-[4px] focus:outline-none focus:border-[#c4622d] cursor-pointer"
            >
              <option value="best-selling">Featured / Best Selling</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="created-desc">Newest Arrivals</option>
              <option value="title-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid (25 items max) */}
      <ProductGrid
        products={products}
        emptyTitle={`No products found in ${collection.title}`}
        emptyDescription="We are currently crafting new pieces for this series. Please check back soon."
      />

      {/* 25-Product Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div
          className="mt-12 pt-8 border-t border-[#e8e4df] flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <p className="text-xs text-[#686764]">
            Showing <span className="font-semibold text-[#060505]">{pagination.startItem}</span>–
            <span className="font-semibold text-[#060505]">{pagination.endItem}</span> of{' '}
            <span className="font-semibold text-[#060505]">{pagination.totalCount}</span> products (25 per page)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[#e8e4df] text-[#1a1a1a] bg-[#faf8f5] hover:bg-[#f0edea] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Previous page"
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
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[4px] border border-[#e8e4df] text-[#1a1a1a] bg-[#faf8f5] hover:bg-[#f0edea] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
