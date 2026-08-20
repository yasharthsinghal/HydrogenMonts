import React, { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:pointer-events-none rounded-[6px] cursor-pointer';

  const variants: Record<string, string> = {
    primary:
      'bg-[#c4622d] text-white hover:bg-[#923f12] disabled:bg-[#e1dcd5] disabled:text-[#afaba6] focus:ring-[#c4622d]',
    secondary:
      'bg-[#f0edea] text-[#1a1a1a] hover:bg-[#dac7b4] disabled:bg-[#e1dcd5] disabled:text-[#afaba6] focus:ring-[#dac7b4]',
    outline:
      'border border-[#c4622d] text-[#c4622d] hover:bg-[rgba(196,98,45,0.08)] disabled:bg-[#e1dcd5] disabled:text-[#afaba6] disabled:border-transparent focus:ring-[#c4622d]',
    ghost:
      'text-[#2c2c2c] hover:bg-[#f0edea] disabled:text-[#afaba6] disabled:bg-transparent focus:ring-[#e8e4df]',
    accent:
      'bg-[#8b7355] text-white hover:bg-[#5c4b35] disabled:bg-[#e1dcd5] disabled:text-[#afaba6] focus:ring-[#8b7355]',
    danger:
      'bg-[#dc2626] text-white hover:bg-[#b91c1c] disabled:bg-[#e1dcd5] disabled:text-[#afaba6] focus:ring-[#dc2626]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[32px]',
    md: 'text-sm px-5 py-2.5 min-h-[42px]',
    lg: 'text-base px-7 py-3.5 min-h-[50px]',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant] || variants.primary,
        sizes[size],
        className,
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
