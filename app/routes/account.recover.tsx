import { redirect, type LoaderFunctionArgs } from '@shopify/remix-oxygen';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to');
  const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : '';
  return redirect(`/account/login${query}`);
}
