import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION } from '~/graphql/StorefrontQueries';

async function doLogout(context: any) {
  const { session, storefront } = context;

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

export async function action({ context }: ActionFunctionArgs) {
  return doLogout(context);
}

export async function loader({ context }: LoaderFunctionArgs) {
  return doLogout(context);
}
