import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION } from '~/graphql/StorefrontQueries';
import { getHydrogenContext } from '~/lib/context.server';

async function doLogout(context: any, request: Request) {
  const { session, storefront } = await getHydrogenContext(context, request);

  // Best-effort: delete token on Shopify side
  const token = session.get('customerAccessToken');
  if (token) {
    try {
      await storefront.mutate(CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION, {
        variables: { customerAccessToken: token },
      });
    } catch {
      // Non-blocking — session will be cleared regardless
    }
  }

  // Clear all in-app session keys
  session.unset('customerEmail');
  session.unset('customerAccessToken');
  session.unset('customerAccessTokenExpiresAt');
  session.unset('otpData');

  return redirect('/account/login', {
    headers: { 'Set-Cookie': await session.commit() },
  });
}

export async function action({ context, request }: ActionFunctionArgs) {
  return doLogout(context, request);
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  return doLogout(context, request);
}
