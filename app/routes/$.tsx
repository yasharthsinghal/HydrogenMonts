import React from 'react';
import { type MetaFunction } from '@remix-run/react';
import { EmptyState } from '~/components/ui/EmptyState';
import { HelpCircle } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: '404 - Page Not Found | MONTS' },
    { name: 'description', content: 'The requested page could not be found.' },
  ];
};

export default function NotFoundRoute() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20">
      <EmptyState
        icon={<HelpCircle className="w-8 h-8" />}
        title="Page Not Found"
        description="The page you are looking for may have been moved, renamed, or is temporarily unavailable."
        actionText="Return to Homepage"
        actionHref="/"
      />
    </div>
  );
}
