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

  const customerId = await shopifyCustomerService.getCustomerIdByEmail(customerEmail, env);
  if (!customerId) {
    return data({ error: 'Customer account not found in Shopify.' }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string)?.trim();

  // 1. DELETE ADDRESS
  if (intent === 'delete') {
    const addressId = (formData.get('addressId') as string)?.trim();
    if (!addressId) {
      return data({ error: 'Missing address ID to delete.' }, { status: 400 });
    }

    const result = await shopifyCustomerService.deleteCustomerAddress(customerId, addressId, env);
    if (!result.success) {
      return data({ error: result.error || 'Failed to delete address.' }, { status: 400 });
    }

    return data({ success: true, message: 'Address removed successfully.' });
  }

  // 2. SET DEFAULT ADDRESS
  if (intent === 'set-default') {
    const addressId = (formData.get('addressId') as string)?.trim();
    if (!addressId) {
      return data({ error: 'Missing address ID.' }, { status: 400 });
    }

    const result = await shopifyCustomerService.setDefaultCustomerAddress(customerId, addressId, env);
    if (!result.success) {
      return data({ error: result.error || 'Failed to set default address.' }, { status: 400 });
    }

    return data({ success: true, message: 'Default address updated.' });
  }

  // Common address fields for ADD and EDIT
  const firstName = (formData.get('firstName') as string)?.trim() || '';
  const lastName = (formData.get('lastName') as string)?.trim() || '';
  const address1 = (formData.get('address1') as string)?.trim() || '';
  const address2 = (formData.get('address2') as string)?.trim() || '';
  const city = (formData.get('city') as string)?.trim() || '';
  const province = (formData.get('province') as string)?.trim() || '';
  const zip = (formData.get('zip') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const isDefault = formData.get('isDefault') === 'true';

  if (!address1 || !city || !zip) {
    return data({ error: 'Please provide Address line 1, City, and PIN code.' }, { status: 400 });
  }

  // 3. EDIT ADDRESS
  if (intent === 'edit') {
    const addressId = (formData.get('addressId') as string)?.trim();
    if (!addressId) {
      return data({ error: 'Missing address ID to edit.' }, { status: 400 });
    }

    const result = await shopifyCustomerService.updateCustomerAddress(
      addressId,
      { firstName, lastName, address1, address2, city, province, zip, phone },
      env,
    );

    if (!result.success) {
      return data({ error: result.error || 'Failed to update address.' }, { status: 400 });
    }

    if (isDefault) {
      await shopifyCustomerService.setDefaultCustomerAddress(customerId, addressId, env);
    }

    return data({ success: true, message: 'Address updated successfully.' });
  }

  // 4. ADD ADDRESS
  if (intent === 'add') {
    const result = await shopifyCustomerService.createCustomerAddress(
      customerId,
      { firstName, lastName, address1, address2, city, province, zip, phone },
      env,
    );

    if (!result.success) {
      return data({ error: result.error || 'Failed to add address.' }, { status: 400 });
    }

    if (isDefault && result.address?.id) {
      await shopifyCustomerService.setDefaultCustomerAddress(customerId, result.address.id, env);
    }

    return data({ success: true, message: 'New address added successfully.' });
  }

  return data({ error: 'Invalid address action intent.' }, { status: 400 });
}
