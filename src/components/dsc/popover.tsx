/**
 * Popover from Design System Companion — DSC dark-mode surface.
 * All colors are hardcoded to match DSC's dark theme exactly,
 * independent of the host app's CSS variables.
 *
 *   bg:     #171717  (near-black, matches Figma)
 *   border: rgba(255,255,255,0.1)  — subtle white rim
 *   radius: 0.3rem (DSC default)
 */
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const popoverContentVariants = cva(
  [
    'z-[200] overflow-hidden outline-none',
    'bg-[#171717]',
    'border border-[rgba(255,255,255,0.1)]',
    '[border-radius:0.3rem]',
    'text-[#f2f2f2]',
    // Radix portal animations
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  ].join(' '),
  {
    variants: {
      size: {
        xxs:     'w-40 p-1.5 text-[10px] leading-tight shadow-sm',
        default: 'shadow-[0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)]',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> &
    VariantProps<typeof popoverContentVariants>
>(({ className, align = 'center', sideOffset = 4, size, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={size === 'xxs' ? 2 : sideOffset}
      className={cn(popoverContentVariants({ size }), className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'DSCPopoverContent';

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
