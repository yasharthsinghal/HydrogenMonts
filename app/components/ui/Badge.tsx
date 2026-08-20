import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'sale' | 'new' | 'outline' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-semibold uppercase tracking-wider rounded-[2px]';

  const variants = {
    default: 'bg-[#f5f5f5] text-[#060505]',
    sale: 'bg-[#f5f5f5] text-[#000000] border border-[#e8e4df]',
    new: 'bg-[#c4622d] text-white',
    outline: 'border border-[#e8e4df] text-[#686764] bg-white',
    accent: 'bg-[#8b7355] text-white',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      {...props}
    >
      {children}
    </span>
  );
};
