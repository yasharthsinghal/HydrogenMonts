import { useLoaderData, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  ) @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.page) {
    return [{ title: 'Page Not Found | MONTS' }];
  }
  return [
    { title: `${data.page.seo?.title || data.page.title} | MONTS` },
    { name: 'description', content: data.page.seo?.description || '' },
  ];
};

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) {
    throw new Response('Page handle is required', { status: 400 });
  }

  const { storefront } = await getHydrogenContext(context, request);
  const data: any = await storefront.query(PAGE_QUERY, {
    variables: { handle },
  });

  if (!data?.page) {
    throw new Response('Page Not Found', { status: 404 });
  }

  return { page: data.page };
}

export default function PageRoute() {
  const { page } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: page.title }]} className="mb-8" />
      <article className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-[#060505] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          {page.title}
        </h1>
        <div
          dangerouslySetInnerHTML={{ __html: page.body }}
          className="text-[#2c2c2c] leading-relaxed"
        />
      </article>
    </div>
  );
}
