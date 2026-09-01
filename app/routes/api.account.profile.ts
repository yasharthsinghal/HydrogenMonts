import { data, type ActionFunctionArgs } from 'react-router';
import { getHydrogenContext } from '~/lib/context.server';
import { shopifyCustomerService } from '~/services/shopify/customer.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== 'POST') {
    return data({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const { session, env } = await getHydrogenContext(context, request);
  const customerEmail = session.get('customerEmail') as string | undefined;

  if (!customerEmail) {
    return data({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const formData = await request.formData();
  const firstName = (formData.get('firstName') as string)?.trim();
  const lastName = (formData.get('lastName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();

  const customerId = await shopifyCustomerService.getCustomerIdByEmail(customerEmail, env);
  if (!customerId) {
    return data({ error: 'Customer account not found in Shopify.' }, { status: 404 });
  }

  const result = await shopifyCustomerService.updateCustomerProfile(
    customerId,
    { firstName, lastName, phone },
    env,
  );

  if (!result.success) {
    return data({ error: result.error || 'Failed to update profile.' }, { status: 400 });
  }

  return data({
    success: true,
    message: 'Profile updated successfully.',
    customer: result.customer,
  });
}
