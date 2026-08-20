import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, Link, type MetaFunction } from '@remix-run/react';
import { COLLECTIONS_QUERY } from '~/graphql/StorefrontQueries';
import type { CollectionCardItem } from '~/types/storefront.types';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { ArrowRight } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'All Collections | MONTS Artisanal Luxury' },
    {
      name: 'description',
      content:
        'Explore curated handcrafted collections, block-printed series, and ready-to-wear silhouettes by MONTS.',
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;

  let collections: CollectionCardItem[] = [];
  try {
    const data = await storefront.query(COLLECTIONS_QUERY, {
      variables: { first: 20 },
      cache: storefront.CacheLong(),
    });
    collections = (data.collections?.nodes || []) as CollectionCardItem[];
  } catch (error) {
    console.error('Collections query error:', error);
  }

  return json({ collections });
}

export default function CollectionsIndexRoute() {
  const { collections } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Collections' }]} className="mb-8" />

      <div className="text-center max-w-2xl mx-auto mb-14">
        <span
          className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Artisanal Series
        </span>
        <h1
          className="text-4xl md:text-5xl font-bold text-[#060505] mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Curated Collections
        </h1>
        <p
          className="text-base text-[#686764]"
          style={{ fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}
        >
          Hand-block printed textiles, quilted cotton accessories, and timeless luxury batch pieces.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {collections.map((col, idx) => {
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
              className="group relative overflow-hidden flex items-end p-8 rounded-[2px] border border-[#e8e4df]/60 shadow-xs hover:shadow-md transition-all"
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
              <div className="relative z-10 text-white flex flex-col gap-1.5 w-full">
                {col.products?.totalCount !== undefined && (
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest text-[#e8dfd5]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {col.products.totalCount} Products
                  </span>
                )}
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {col.title}
                </h2>
                <span
                  className="text-xs flex items-center gap-1 mt-1 text-white/80 group-hover:underline"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Explore collection <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
