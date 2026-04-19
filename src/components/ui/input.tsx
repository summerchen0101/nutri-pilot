'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[10px] border-[0.5px] border-border bg-card px-3 py-2 text-[13px] text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-[#1B7A5A] focus-visible:ring-2 focus-visible:ring-[#1B7A5A]/12',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
