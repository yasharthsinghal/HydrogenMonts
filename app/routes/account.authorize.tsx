import { type LoaderFunctionArgs } from 'react-router';
import { sanitizeRedirect } from '~/lib/redirect';

export async function loader({ context }: LoaderFunctionArgs) {
  const { customerAccount, session } = context;

  // Complete OAuth exchange with Shopify Customer Account API
  const authorizeResponse = await customerAccount.authorize();

  // Retrieve sanitized return destination (e.g. /checkout or /account)
  const returnTo = session.get('return_to');
  const destination = sanitizeRedirect(returnTo, '/account');
  session.unset('return_to');

  // Preserve the authorization cookies and redirect to destination
  const headers = new Headers(authorizeResponse.headers);
  headers.append('Set-Cookie', await session.commit());

  return new Response(null, {
    status: 302,
    headers: {
      ...Object.fromEntries(headers.entries()),
      Location: destination,
    },
  });
}
