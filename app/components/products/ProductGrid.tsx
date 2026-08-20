import React from 'react';
import type { ProductCardItem } from '~/types/storefront.types';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from '~/components/ui/Skeleton';
import { EmptyState } from '~/components/ui/EmptyState';
import { ShoppingBag } from 'lucide-react';

export interface ProductGridProps {
  products?: ProductCardItem[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  columns?: 2 | 3 | 4;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  emptyTitle = 'No Products Found',
  emptyDescription = 'There are currently no products available in this view.',
  columns = 4,
}) => {
  if (isLoading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="w-6 h-6" />}
        title={emptyTitle}
        description={emptyDescription}
        actionText="Browse All Products"
        actionHref="/collections/all"
      />
    );
  }

  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-5 md:gap-6 ${columnClasses[columns]}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
