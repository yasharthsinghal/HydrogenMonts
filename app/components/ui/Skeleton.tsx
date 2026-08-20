import React from 'react';
import { clsx } from 'clsx';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={clsx('animate-pulse rounded bg-[#e8dfd5]/60', className)}
    aria-hidden="true"
  />
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 w-full bg-white p-3 rounded-[2px] border border-[#e8e4df]">
    <div className="aspect-square w-full rounded bg-[#e8dfd5]/60 animate-pulse" />
    <div className="flex flex-col gap-1.5 pt-1">
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);
