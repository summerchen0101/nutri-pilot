'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';

const variantClass: Record<ButtonVariant, string> = {
  default:
    'bg-[#1B7A5A] text-white hover:bg-[#0F6E56] focus-visible:ring-[#1B7A5A]/25',
  outline:
    'border-[1.5px] border-[#1B7A5A] bg-transparent text-[#1B7A5A] hover:bg-[#E0F5EE] focus-visible:ring-[#1B7A5A]/20',
  ghost:
    'border-[0.5px] border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[#1B7A5A]/15',
  destructive:
    'bg-[#E55A3C] text-white hover:opacity-95 focus-visible:ring-[#E55A3C]/25',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = 'default', type = 'button', disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClass[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
