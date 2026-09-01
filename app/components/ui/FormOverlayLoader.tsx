import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface FormOverlayLoaderProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  isFixed?: boolean;
}

/**
 * Reusable frosted overlay loader for checkout, contact, auth, and mutations.
 * Prevents double submissions and provides immediate status feedback.
 */
export const FormOverlayLoader: React.FC<FormOverlayLoaderProps> = ({
  isLoading,
  message = 'Processing...',
  className,
  isFixed = false,
}) => {
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={clsx(
        isFixed ? 'fixed inset-0 z-50' : 'absolute inset-0 z-30',
        'flex flex-col items-center justify-center p-6 bg-[#faf8f5]/80 backdrop-blur-xs rounded-[inherit] transition-all duration-200 animate-in fade-in',
        className,
      )}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-3.5 bg-white/90 px-6 py-5 rounded-[8px] shadow-lg border border-[#e8e4df] max-w-sm text-center">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#c4622d] animate-spin" />
          <div className="w-2 h-2 rounded-full bg-[#8b7355] absolute" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8b7355]">
            MONTS
          </span>
          <p className="text-sm font-medium text-[#060505]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
