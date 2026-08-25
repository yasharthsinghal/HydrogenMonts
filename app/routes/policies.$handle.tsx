import { useLoaderData, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';

const POLICY_QUERY = `#graphql
  query Policy(
    $language: LanguageCode,
    $country: CountryCode,
    $privacyPolicy: Boolean = false,
    $shippingPolicy: Boolean = false,
    $termsOfService: Boolean = false,
    $refundPolicy: Boolean = false
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        id
        title
        body
      }
      shippingPolicy @include(if: $shippingPolicy) {
        id
        title
        body
      }
      termsOfService @include(if: $termsOfService) {
        id
        title
        body
      }
      refundPolicy @include(if: $refundPolicy) {
        id
        title
        body
      }
    }
  }
` as const;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.policy) {
    return [{ title: 'Policy Not Found | MONTS' }];
  }
  return [
    { title: `${data.policy.title} | MONTS` },
  ];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { handle } = params;
  if (!handle) {
    throw new Response('Policy handle is required', { status: 400 });
  }

  const { storefront } = context;
  const policyFlags = {
    privacyPolicy: handle === 'privacy-policy',
    shippingPolicy: handle === 'shipping-policy',
    termsOfService: handle === 'terms-of-service',
    refundPolicy: handle === 'refund-policy',
  };

  const data: any = await storefront.query(POLICY_QUERY, {
    variables: policyFlags,
  });

  const policy =
    data?.shop?.privacyPolicy ||
    data?.shop?.shippingPolicy ||
    data?.shop?.termsOfService ||
    data?.shop?.refundPolicy;

  if (!policy) {
    throw new Response('Policy Not Found', { status: 404 });
  }

  return { policy };
}

export default function PolicyRoute() {
  const { policy } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: policy.title }]} className="mb-8" />
      <article className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-[#060505] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          {policy.title}
        </h1>
        <div
          dangerouslySetInnerHTML={{ __html: policy.body }}
          className="text-[#2c2c2c] leading-relaxed"
        />
      </article>
    </div>
  );
}
