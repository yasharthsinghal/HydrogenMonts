import { redirect, useLoaderData, Link, type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { STOREFRONT_CUSTOMER_QUERY } from '~/graphql/StorefrontQueries';

export const meta: MetaFunction = () => [
  { title: 'Order Details | MONTS' },
];

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { id } = params;
  const { session, storefront } = await getHydrogenContext(context, request);
  const token = session.get('customerAccessToken');

  if (!token) {
    return redirect(`/account/login?return_to=/account/orders/${id}`);
  }

  const data: any = await storefront.query(STOREFRONT_CUSTOMER_QUERY, {
    variables: { customerAccessToken: token },
    cache: storefront.CacheNone(),
  });

  const customer = data?.customer;
  const orders = customer?.orders?.nodes || [];
  const order = orders.find((o: any) => {
    const rawId = o.id || '';
    return rawId === id || rawId.endsWith(`/${id}`) || o.name === id || o.name === `#${id}`;
  });

  if (!order) {
    throw new Response('Order Not Found', { status: 404 });
  }

  return { order, customer };
}

export default function OrderDetailRoute() {
  const { order } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb
        items={[
          { label: 'My Account', href: '/account' },
          { label: `Order ${order.name || order.id}` },
        ]}
        className="mb-8"
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#060505] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          Order {order.name || order.id}
        </h1>
        <p className="text-sm text-[#686764] mb-4">
          Status: {order.financialStatus} • {order.fulfillmentStatus}
        </p>
      </div>
    </div>
  );
}
