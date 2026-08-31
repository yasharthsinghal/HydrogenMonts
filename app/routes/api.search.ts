import { type LoaderFunctionArgs } from 'react-router';
import { SEARCH_QUERY } from '~/graphql/StorefrontQueries';
import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = await getHydrogenContext(context, request);
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return Response.json({ products: [], totalCount: 0 });
  }

  try {
    const data = await storefront.query(SEARCH_QUERY, {
      variables: { query: q.trim(), first: 5 },
    });
    const products = data.search?.nodes || [];
    const totalCount = data.search?.totalCount || products.length;
    return Response.json({ products, totalCount });
  } catch (error) {
    console.error('API search loader error:', error);
    return Response.json({ products: [], totalCount: 0 });
  }
}
