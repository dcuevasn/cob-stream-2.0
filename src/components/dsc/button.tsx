/**
 * Button — Design System Companion (dark-mode).
 * All variant colours are hardcoded to DSC's dark theme so the component
 * renders correctly in any host app, regardless of CSS custom properties.
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // base
  [
    'inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium',
    'rounded-[0.25rem]',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        // Blue primary
        default:
          'bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-600',
        // DSC dark secondary: oklch(0.269 0 0) ≈ #404040 — clearly visible on #171717 popover
        secondary:
          'bg-[#404040] text-[#fafafa] hover:bg-[#4a4a4a] active:bg-[#333] shadow-sm',
        // DSC dark border: oklch(1 0 0 / 10%) — white/10 outline button
        outline:
          'border border-white/10 bg-transparent text-[#d4d4d4] hover:bg-white/[0.07] hover:text-[#fafafa] active:bg-white/[0.1]',
        // DSC muted-foreground: oklch(0.708 0 0) ≈ #b5b5b5
        ghost:
          'bg-transparent text-[#b5b5b5] hover:bg-white/[0.07] hover:text-[#fafafa] active:bg-white/[0.1]',
        destructive:
          'bg-red-600/90 text-white hover:bg-red-500 active:bg-red-700',
        link:
          'bg-transparent text-blue-400 underline-offset-4 hover:underline',
      },
      size: {
        xs:        'h-5 px-2 text-[10px] leading-none [&_svg]:size-3',
        sm:        'h-7 px-2.5 text-xs [&_svg]:size-3',
        default:   'h-9 px-4 text-sm [&_svg]:size-4',
        lg:        'h-11 px-8 text-base [&_svg]:size-5',
        icon:      'h-9 w-9 p-0 [&_svg]:size-4',
        'icon-xs': 'h-5 w-5 p-0 [&_svg]:size-3',
        'icon-sm': 'h-7 w-7 p-0 [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'DSCButton';

export { Button, buttonVariants };
