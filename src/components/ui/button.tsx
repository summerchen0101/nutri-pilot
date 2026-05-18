'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import {
  buttonVisualClassName,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui/button-visual';

export type { ButtonSize, ButtonVariant } from '@/components/ui/button-visual';

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
        className={buttonVisualClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);
