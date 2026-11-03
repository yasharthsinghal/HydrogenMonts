import React from 'react';
import { useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { COLLECTIONS_QUERY } from '~/graphql/StorefrontQueries';
import type { CollectionCardItem } from '~/types/storefront.types';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { ArrowRight } from 'lucide-react';
import collectionsConfig from '~/data/collections.json';
import type { CollectionConfigItem } from '~/types/collection.types';

export const meta: MetaFunction = () => {
  return [
    { title: 'Shop All Categories & Collections | MONTS Artisanal Luxury' },
    {
      name: 'description',
      content:
        'Explore all handcrafted artisanal categories and curated collections, block-printed series, and ready-to-wear silhouettes by MONTS.',
    },
  ];
};

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { storefront } = await getHydrogenContext(context, request);

  // Active collections from collections.json (excluding 'all' which is the products catalog)
  const activeJsonCollections = (collectionsConfig as CollectionConfigItem[]).filter(
    (c) => c.isActive !== false && c.handle !== 'all'
  );

  let shopifyCollections: CollectionCardItem[] = [];
  try {
    const data = await storefront.query(COLLECTIONS_QUERY, {
      variables: { first: 30 },
      cache: storefront.CacheShort(),
    });
    shopifyCollections = ((data.collections?.nodes || []) as CollectionCardItem[]).filter(
      (col) => col.handle !== 'all' && col.handle !== 'frontpage'
    );
  } catch (error) {
    console.error('Collections query error:', error);
  }

  // Combine and enrich collections based on collections.json
  const collections: CollectionCardItem[] = activeJsonCollections.map((jsonCol) => {
    const matchedShopify = shopifyCollections.find((sc) => sc.handle === jsonCol.handle);
    return {
      id: matchedShopify?.id || `col-${jsonCol.handle}`,
      handle: jsonCol.handle,
      title: jsonCol.title,
      description: jsonCol.description || matchedShopify?.description || '',
      image: {
        url: jsonCol.image || matchedShopify?.image?.url || '',
        altText: jsonCol.title,
      },
      products: { totalCount: matchedShopify?.products?.totalCount },
    } as unknown as CollectionCardItem;
  });

  return { collections };
}

export default function CollectionsIndexRoute() {
  const { collections } = useLoaderData<typeof loader>();

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5 py-8 md:py-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Categories' }]} className="mb-8" />

      <div className="text-center max-w-2xl mx-auto mb-14">
        <span
          className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Vastra by Monty Catalog
        </span>
        <h1
          className="text-4xl md:text-5xl font-bold text-[#060505] mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Shop By Category
        </h1>
        <p
          className="text-base text-[#686764]"
          style={{ fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}
        >
          Explore handcrafted Rajasthan block prints, pure cotton shirts, quilted bags, and artisanal series.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {collections.map((col) => {
          const colImage =
            col.image?.url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80';

          return (
            <Link
              key={col.id}
              to={`/collections/${col.handle}`}
              className="group relative overflow-hidden flex items-end p-8 rounded-[8px] border border-[#e8e4df] shadow-xs hover:shadow-xl transition-all duration-300"
              style={{ aspectRatio: '4/3' }}
            >
              <img
                src={colImage}
                alt={col.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(6,5,5,0.85) 0%, rgba(6,5,5,0.3) 55%, transparent 100%)',
                }}
              />
              <div className="relative z-10 text-white flex flex-col gap-1 w-full">
                {col.products?.totalCount !== undefined && (
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest text-[#e8dfd5]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {col.products.totalCount} Products
                  </span>
                )}
                <h2
                  className="text-2xl font-bold text-white group-hover:text-[#f5f0e8] transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {col.title}
                </h2>
                {col.description && (
                  <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                    {col.description.replace(/<[^>]*>?/gm, '').trim()}
                  </p>
                )}
                <span
                  className="text-xs font-semibold flex items-center gap-1.5 mt-2 text-[#e8dfd5] group-hover:text-white transition-colors"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Explore category <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
