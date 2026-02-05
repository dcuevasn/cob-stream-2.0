import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        active: 'border-transparent bg-[hsl(var(--status-active))] text-white',
        staging: 'border-transparent bg-[hsl(var(--status-staging))] text-white',
        halted: 'border-transparent bg-[hsl(var(--status-halted))] text-black',
        unconfigured: 'border-transparent bg-[hsl(var(--status-unconfigured))] text-white',
        cancelled: 'border-transparent bg-[hsl(var(--status-cancelled))] text-white line-through',
        /** Ultra-compact staging indicator: "S" badge, informational blue, dark/light theme support */
        'staging-indicator':
          'shrink-0 inline-flex items-center justify-center w-5 h-[14px] min-w-5 px-0 py-0 rounded border text-[10px] font-semibold ' +
          'bg-blue-50 border-blue-400 text-blue-700 dark:bg-zinc-900 dark:border-blue-500 dark:text-blue-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
