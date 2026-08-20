import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, Form, type MetaFunction } from '@remix-run/react';
import { SEARCH_QUERY } from '~/graphql/StorefrontQueries';
import type { ProductCardItem } from '~/types/storefront.types';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { ProductGrid } from '~/components/products/ProductGrid';
import { Search } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Search Storefront | MONTS' },
    { name: 'description', content: 'Search handcrafted artisanal collections and products by MONTS.' },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  let products: ProductCardItem[] = [];
  let totalCount = 0;

  if (query.trim()) {
    try {
      const data = await storefront.query(SEARCH_QUERY, {
        variables: { query: query.trim(), first: 24 },
      });
      products = (data.search?.nodes || []) as ProductCardItem[];
      totalCount = data.search?.totalCount || products.length;
    } catch (error) {
      console.error('Search query error:', error);
    }
  }

  return json({
    query,
    products,
    totalCount,
  });
}

export default function SearchRoute() {
  const { query, products, totalCount } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Search' }]} className="mb-8" />

      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#060505] mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Search the Catalog
        </h1>

        {/* Search Bar */}
        <Form method="get" className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-[#686764] pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search block-printed totes, pouches, garments..."
            className="w-full pl-12 pr-28 py-3.5 text-sm rounded-[6px] border border-[#e8e4df] bg-white text-[#2c2c2c] focus:outline-none focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2 text-xs font-semibold rounded-[4px] bg-[#c4622d] text-white hover:bg-[#923f12] transition-colors cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Search
          </button>
        </Form>
      </div>

      {/* Results Header */}
      {query && (
        <div className="mb-8 pb-4 border-b border-[#e8e4df] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#060505]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {totalCount} {totalCount === 1 ? 'Result' : 'Results'} for "{query}"
          </span>
        </div>
      )}

      {/* Product Grid */}
      <ProductGrid
        products={products}
        emptyTitle={query ? `No results found for "${query}"` : 'Start typing to search'}
        emptyDescription={
          query
            ? 'Try checking for spelling errors or searching for broader terms like "tote", "cotton", or "bag".'
            : 'Explore our handcrafted artisanal garments, bags, and luxury accessories.'
        }
      />
    </div>
  );
}
