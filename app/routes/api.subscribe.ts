import { data, type ActionFunctionArgs } from 'react-router';
import { getHydrogenContext } from '~/lib/context.server';
import { shopifyCustomerService } from '~/services/shopify/customer.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== 'POST') {
    return data({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const { env } = await getHydrogenContext(context, request);
  const formData = await request.formData();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const source = (formData.get('source') as string)?.trim() || 'newsletter_footer';

  if (!email || !email.includes('@')) {
    return data({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  const result = await shopifyCustomerService.subscribeCustomer(email, source, env);

  if (!result.success && result.error) {
    return data({ error: result.error }, { status: 400 });
  }

  return data({
    success: true,
    message: "Welcome to the MONTS Collector's Circle! You will now receive private drop alerts, artisanal previews, and secret seasonal lookbooks.",
  });
}
