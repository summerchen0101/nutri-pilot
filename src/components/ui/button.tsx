'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm';

const variantClass: Record<ButtonVariant, string> = {
  default:
    'bg-[#1E212B] text-white hover:bg-[#2A2F3D] focus-visible:ring-[#1E212B]/25',
  outline:
    'border-[1.5px] border-[#4C956C] bg-transparent text-[#4C956C] hover:bg-[#E8F5EE] focus-visible:ring-[#4C956C]/20',
  ghost:
    'border-[0.5px] border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[#4C956C]/15',
  destructive:
    'bg-[#E55A3C] text-white hover:opacity-95 focus-visible:ring-[#E55A3C]/25',
};

const sizeClass: Record<ButtonSize, string> = {
  default: 'rounded-[10px] px-[18px] py-[9px] text-body font-medium',
  sm: 'rounded-lg px-3 py-[5px] text-caption font-medium',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'default',
      size = 'default',
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          sizeClass[size],
          variantClass[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
