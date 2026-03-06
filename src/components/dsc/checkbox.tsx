/**
 * DSC Checkbox — dark-mode hardcoded colors.
 *   unchecked: bg-[#262626] border rgba(255,255,255,0.1)
 *   checked:   bg-[#2b7fff] border transparent, white checkmark
 *   size: 14×14px, radius: 3px
 */
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
    className={cn(
      'peer shrink-0 rounded-[3px] border transition-colors',
      'h-[14px] w-[14px]',
      'bg-[#262626]',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[#2b7fff] data-[state=checked]:border-transparent',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="h-[9px] w-[9px] text-white" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'DSCCheckbox';

export { Checkbox };
