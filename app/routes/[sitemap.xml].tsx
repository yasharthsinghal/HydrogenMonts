import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';

const SITEMAP_QUERY = `#graphql
  query Sitemap($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 250, query: "published_status:online_store:visible") {
      nodes {
        handle
        updatedAt
      }
    }
    collections(first: 100) {
      nodes {
        handle
        updatedAt
      }
    }
  }
` as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { storefront } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  let products: any[] = [];
  let collections: any[] = [];

  try {
    const data = await storefront.query(SITEMAP_QUERY, {
      cache: storefront.CacheLong(),
    });
    products = data.products?.nodes || [];
    collections = data.collections?.nodes || [];
  } catch (error) {
    console.error('Sitemap query error:', error);
  }

  const staticPages = [
    { url: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { url: `${baseUrl}/collections`, changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/about`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/wholesale`, changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/faq`, changefreq: 'monthly', priority: '0.5' },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join('')}
  ${collections
    .map(
      (col) => `
  <url>
    <loc>${baseUrl}/collections/${col.handle}</loc>
    <lastmod>${col.updatedAt || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join('')}
  ${products
    .map(
      (prod) => `
  <url>
    <loc>${baseUrl}/products/${prod.handle}</loc>
    <lastmod>${prod.updatedAt || new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
    )
    .join('')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
