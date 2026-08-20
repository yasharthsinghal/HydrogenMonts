import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, useNavigate, useLocation, type MetaFunction } from '@remix-run/react';
import { COLLECTION_BY_HANDLE_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem } from '~/types/storefront.types';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { ProductGrid } from '~/components/products/ProductGrid';

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

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { handle } = params;
  const { storefront } = context;
  const url = new URL(request.url);
  const canonicalUrl = `${url.protocol}//${url.host}${url.pathname}`;

  if (!handle) {
    throw new Response('Collection handle is required', { status: 400 });
  }

  const sort = url.searchParams.get('sort') || 'best-selling';

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
      sortKey = 'CREATED';
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

  let collection;
  try {
    const data = await storefront.query(COLLECTION_BY_HANDLE_QUERY, {
      variables: {
        handle,
        first: 24,
        sortKey,
        reverse,
      },
      cache: storefront.CacheShort(),
    });
    collection = data.collection;
  } catch (error) {
    console.error('Collection query error:', error);
  }

  if (!collection) {
    throw new Response('Collection Not Found', { status: 404 });
  }

  return json({
    collection,
    products: (collection.products?.nodes || []) as ProductCardItem[],
    currentSort: sort,
    canonicalUrl,
  });
}

export default function CollectionDetailRoute() {
  const { collection, products, currentSort, canonicalUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('sort', e.target.value);
    navigate(`?${searchParams.toString()}`);
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: collection.title,
    description: collection.description,
    url: canonicalUrl,
    numberOfItems: products.length,
    itemListElement: products.map((prod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: prod.title,
      url: `/products/${prod.handle}`,
    })),
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      {/* Collection JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: 'Collections', href: '/collections' },
          { label: collection.title },
        ]}
        className="mb-8"
      />

      {/* Collection Header */}
      <div className="mb-12 pb-6 border-b border-[#e8e4df]">
        <span
          className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Curated Series
        </span>
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

          {/* Sort Selector */}
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

      {/* Product Grid */}
      <ProductGrid
        products={products}
        emptyTitle={`No products found in ${collection.title}`}
        emptyDescription="We are currently crafting new pieces for this series. Please check back soon."
      />
    </div>
  );
}
