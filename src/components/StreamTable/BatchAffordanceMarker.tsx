import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Small chevron for batch-enabled column headers. Matches parent text color. */
export function BatchAffordanceMarker({ className }: { className?: string }) {
  return (
    <ChevronDown
      role="presentation"
      aria-hidden
      className={cn(
        'h-3.5 w-3.5 shrink-0 text-current',
        className
      )}
    />
  );
}
