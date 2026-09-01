import React, { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, startIcon, endIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#060505] tracking-wide flex items-center gap-1 transition-colors">
            <span>{label}</span>
            {props.required && <span className="text-[#dc2626] font-semibold" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 text-[#686764] pointer-events-none flex items-center">
              {startIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            data-error={Boolean(error)}
            className={clsx(
              'w-full text-sm rounded-[6px] transition-all duration-200 ease-in-out border outline-none bg-[#faf8f5] text-[#2c2c2c] placeholder:text-[#afaba6]',
              startIcon ? 'pl-9' : 'pl-3.5',
              endIcon ? 'pr-9' : 'pr-3.5',
              'py-2.5',
              error
                ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-2 focus:ring-[#dc2626]/20 focus:bg-white'
                : 'border-[#e8e4df] focus:border-[#c4622d] focus:ring-2 focus:ring-[#c4622d]/20 focus:bg-white',
              className,
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 text-[#686764] flex items-center">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-[#dc2626] animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
        {helperText && !error && <p className="text-xs text-[#686764]">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
