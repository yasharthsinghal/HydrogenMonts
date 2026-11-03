import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.search;
  return redirect(`/collections${search}`);
}

export default function CategoriesRoute() {
  return null;
}

