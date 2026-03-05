/**
 * Input — Design System Companion (dark-mode).
 * Colors hardcoded to DSC's dark theme so the component renders correctly
 * in any host app, regardless of CSS custom properties.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  [
    'flex w-full rounded-[0.25rem]',
    'border border-white/20 bg-[#262626] text-[#f2f2f2]',
    'transition-colors',
    'placeholder:text-[#6b6b6b]',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        xs:      'h-5 px-1.5 py-0 text-[10px] leading-none',
        default: 'h-9 px-3 py-1 text-sm',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ size }), className)}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'DSCInput';

export { Input, inputVariants };
